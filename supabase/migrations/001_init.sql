-- Migration 001: initial schema for Fazoo
 -- Idempotent migration: safe to re-run. Creates core tables, indexes, pgvector setup, and RLS policies.

 -- Enable extensions
 CREATE EXTENSION IF NOT EXISTS pgcrypto;
 CREATE EXTENSION IF NOT EXISTS vector;

 -- profiles
 CREATE TABLE IF NOT EXISTS profiles (
	 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	 user_id uuid UNIQUE NOT NULL,
	 full_name text,
	 avatar_url text,
	 created_at timestamptz DEFAULT now()
 );

 -- organizations
 CREATE TABLE IF NOT EXISTS organizations (
	 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	 name text NOT NULL,
	 slug text UNIQUE NOT NULL,
	 logo_url text,
	 website text,
	 description text,
	 industry text,
	 created_at timestamptz DEFAULT now()
 );

 -- organization_members
 CREATE TABLE IF NOT EXISTS organization_members (
	 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	 user_id uuid NOT NULL,
	 role text NOT NULL DEFAULT 'member',
	 created_at timestamptz DEFAULT now(),
	 UNIQUE(organization_id, user_id)
 );

 CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

 -- assistants
 CREATE TABLE IF NOT EXISTS assistants (
	 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	 name text NOT NULL,
	 description text,
	 system_prompt text,
	 welcome_message text,
	 avatar_url text,
	 primary_color text,
	 enabled boolean DEFAULT true,
	 created_at timestamptz DEFAULT now(),
	 updated_at timestamptz DEFAULT now()
 );

 CREATE INDEX IF NOT EXISTS idx_assistants_org ON assistants(organization_id);

 -- knowledge_sources
 CREATE TABLE IF NOT EXISTS knowledge_sources (
	 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	 assistant_id uuid REFERENCES assistants(id) ON DELETE CASCADE,
	 title text,
	 source_type text,
	 content text,
	 status text DEFAULT 'pending',
	 created_at timestamptz DEFAULT now(),
	 updated_at timestamptz DEFAULT now()
 );

 CREATE INDEX IF NOT EXISTS idx_knowledge_sources_assistant ON knowledge_sources(assistant_id);

 -- knowledge_chunks (with pgvector embedding)
 CREATE TABLE IF NOT EXISTS knowledge_chunks (
	 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	 knowledge_source_id uuid REFERENCES knowledge_sources(id) ON DELETE CASCADE,
	 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	 content text NOT NULL,
	 embedding vector(1536),
	 metadata jsonb,
	 created_at timestamptz DEFAULT now()
 );

 -- ivfflat index for pgvector (choose lists tuned for your dataset)
 DO $$
 BEGIN
	 IF NOT EXISTS (
		 SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
		 WHERE c.relname = 'idx_knowledge_chunks_embedding'
	 ) THEN
		 EXECUTE 'CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)';
	 END IF;
 END$$;

 -- customers
 CREATE TABLE IF NOT EXISTS customers (
	 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	 name text,
	 email text,
	 phone text,
	 metadata jsonb,
	 created_at timestamptz DEFAULT now()
 );

 CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);

 -- conversations
 CREATE TABLE IF NOT EXISTS conversations (
	 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	 assistant_id uuid REFERENCES assistants(id) ON DELETE SET NULL,
	 customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
	 status text DEFAULT 'open',
	 channel text,
	 assigned_to uuid,
	 started_at timestamptz,
	 last_message_at timestamptz,
	 public_token uuid UNIQUE,
	 created_at timestamptz DEFAULT now()
 );

 CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(organization_id);
 CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at);

 -- messages
 CREATE TABLE IF NOT EXISTS messages (
	 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	 conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
	 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	 sender_type text NOT NULL,
	 content text,
	 metadata jsonb,
	 created_at timestamptz DEFAULT now()
 );

 CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);

 -- escalations
 CREATE TABLE IF NOT EXISTS escalations (
	 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	 conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
	 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	 reason text,
	 status text DEFAULT 'open',
	 assigned_to uuid,
	 created_at timestamptz DEFAULT now(),
	 resolved_at timestamptz
 );

 -- analytics_events
 CREATE TABLE IF NOT EXISTS analytics_events (
	 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	 assistant_id uuid REFERENCES assistants(id) ON DELETE SET NULL,
	 conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
	 event_type text NOT NULL,
	 metadata jsonb,
	 created_at timestamptz DEFAULT now()
 );

 -- Helper: check org membership for RLS (uses auth.uid())
 CREATE OR REPLACE FUNCTION is_org_member(org uuid) RETURNS boolean
 LANGUAGE sql STABLE AS $$
	 SELECT EXISTS (
		 SELECT 1 FROM organization_members om
		 WHERE om.organization_id = org AND om.user_id = auth.uid()
	 );
 $$;

 -- Enable RLS and policies
 -- organizations: restrict access to members
 ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
 DO $$ BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'organizations_member_access' AND tablename = 'organizations') THEN
     CREATE POLICY organizations_member_access ON organizations
       USING (is_org_member(id))
       WITH CHECK (is_org_member(id));
   END IF;
 END $$;

 -- Generic pattern for organization-owned tables
 -- Assistants
 ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;
 DO $$ BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'assistants_org_access' AND tablename = 'assistants') THEN
     CREATE POLICY assistants_org_access ON assistants
       USING (is_org_member(organization_id))
       WITH CHECK (is_org_member(organization_id));
   END IF;
 END $$;

 -- Knowledge sources
 ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
 DO $$ BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ks_org_access' AND tablename = 'knowledge_sources') THEN
     CREATE POLICY ks_org_access ON knowledge_sources
       USING (is_org_member(organization_id))
       WITH CHECK (is_org_member(organization_id));
   END IF;
 END $$;

 -- Knowledge chunks
 ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
 DO $$ BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'kc_org_access' AND tablename = 'knowledge_chunks') THEN
     CREATE POLICY kc_org_access ON knowledge_chunks
       USING (is_org_member(organization_id))
       WITH CHECK (is_org_member(organization_id));
   END IF;
 END $$;

 -- Customers
 ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
 DO $$ BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'customers_org_access' AND tablename = 'customers') THEN
     CREATE POLICY customers_org_access ON customers
       USING (is_org_member(organization_id))
       WITH CHECK (is_org_member(organization_id));
   END IF;
 END $$;

 -- Conversations
 ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
 DO $$ BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conv_org_access' AND tablename = 'conversations') THEN
     CREATE POLICY conv_org_access ON conversations
       USING (is_org_member(organization_id))
       WITH CHECK (is_org_member(organization_id));
   END IF;
 END $$;

 -- Messages
 ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
 DO $$ BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'msg_org_access' AND tablename = 'messages') THEN
     CREATE POLICY msg_org_access ON messages
       USING (is_org_member(organization_id))
       WITH CHECK (is_org_member(organization_id));
   END IF;
 END $$;

 -- Escalations
 ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
 DO $$ BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'escalations_org_access' AND tablename = 'escalations') THEN
     CREATE POLICY escalations_org_access ON escalations
       USING (is_org_member(organization_id))
       WITH CHECK (is_org_member(organization_id));
   END IF;
 END $$;

 -- Analytics events
 ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
 DO $$ BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'analytics_org_access' AND tablename = 'analytics_events') THEN
     CREATE POLICY analytics_org_access ON analytics_events
       USING (is_org_member(organization_id))
       WITH CHECK (is_org_member(organization_id));
   END IF;
 END $$;

 -- Organization members: allow users to insert themselves only via server-side migrations or invite flows
 ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
 DO $$ BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_members_self' AND tablename = 'organization_members') THEN
     CREATE POLICY org_members_self ON organization_members
       USING (true)
       WITH CHECK (is_org_member(organization_id) OR auth.role() = 'service_role');
   END IF;
 END $$;

 -- Notes & admin policy
 -- For administrative operations (e.g., deleting an organization), create additional policies
 -- that check role = 'owner' in `organization_members`. Example (do NOT enable unless intended):
 -- CREATE POLICY org_owner_only ON organizations USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = id AND om.user_id = auth.uid() AND om.role = 'owner'));

 -- Auto-create profile on user signup
 CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER AS $$
 BEGIN
   INSERT INTO public.profiles (user_id, full_name, avatar_url)
   VALUES (
     NEW.id,
     COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
     COALESCE(NEW.raw_user_meta_data ->> 'avatar_url')
   );
   RETURN NEW;
 END;
 $$;

 DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
 CREATE TRIGGER on_auth_user_created
   AFTER INSERT ON auth.users
   FOR EACH ROW EXECUTE FUNCTION handle_new_user();

 -- End of migration

 -- Required environment variables to run migrations:
 -- DATABASE_URL
 -- SUPABASE_URL
 -- SUPABASE_KEY
