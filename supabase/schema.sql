-- Fazoo Supabase schema (initial)
-- Run with service role when migrating. Do NOT expose service key client-side.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- helper: users are managed by Supabase Auth; user id is uuid (auth.uid())

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
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- assistants
CREATE TABLE IF NOT EXISTS assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
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

-- knowledge_sources
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  assistant_id uuid REFERENCES assistants(id) ON DELETE CASCADE,
  title text,
  source_type text,
  content text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- knowledge_chunks (with vector embedding)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_source_id uuid REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_vector ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- customers
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text,
  email text,
  phone text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- conversations
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  assistant_id uuid REFERENCES assistants(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  status text DEFAULT 'open',
  channel text,
  assigned_to uuid,
  started_at timestamptz,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  sender_type text NOT NULL,
  content text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- escalations
CREATE TABLE IF NOT EXISTS escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  reason text,
  status text DEFAULT 'open',
  assigned_to uuid,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- analytics_events
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  assistant_id uuid REFERENCES assistants(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Helper: check org membership
CREATE OR REPLACE FUNCTION is_org_member(org uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = org AND om.user_id = auth.uid()
  );
$$;

-- Enable RLS and create example policies
-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY organizations_member_access ON organizations
  USING (is_org_member(id));

-- Organization-owned tables: allow access when organization_id is one the user is a member of
-- Generic pattern for other tables (messages, conversations, assistants, etc.)
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;
CREATE POLICY assistants_org_access ON assistants
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY ks_org_access ON knowledge_sources
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY kc_org_access ON knowledge_chunks
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY conv_org_access ON conversations
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY msg_org_access ON messages
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

-- Note: For administrative operations, allow policies to check for a specific role (e.g., 'admin') in organization_members.

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
