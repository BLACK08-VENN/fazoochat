ALTER TABLE conversations ADD COLUMN IF NOT EXISTS public_token uuid UNIQUE;
