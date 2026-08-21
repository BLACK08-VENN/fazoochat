-- Migration 003: WhatsApp (Twilio) channel support

CREATE TABLE IF NOT EXISTS whatsapp_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  twilio_account_sid text NOT NULL,
  twilio_auth_token text NOT NULL,
  twilio_whatsapp_number text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

ALTER TABLE whatsapp_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'wa_config_org_access' AND tablename = 'whatsapp_configs') THEN
    CREATE POLICY wa_config_org_access ON whatsapp_configs
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wa_config_org ON whatsapp_configs(organization_id);
