# Supabase setup and migration

This project uses Supabase (Postgres) with pgvector for embeddings.

Required environment variables (server-side only):

- `DATABASE_URL` — Postgres connection string for migrations (use service role where required)
- `SUPABASE_URL` — Supabase project URL (for API server)
- `SUPABASE_KEY` — Supabase service-role key (never expose to browser)

Client-side (publishable) key
- `NEXT_PUBLIC_SUPABASE_URL` — e.g. https://your-project.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — publishable key for browser clients (safe to use on frontend)

Example project
- Project URL: https://your-project.supabase.co
- Publishable key (client): your-anon-key

Important: the publishable key may be used client-side (e.g., in `admin-ui`), but the service role key must never be exposed.

Applying the initial schema

1. Ensure `DATABASE_URL` is set to your Supabase Postgres connection. For local development you can run `supabase start` or use a Supabase project.
2. Run the SQL schema:

```bash
psql "$DATABASE_URL" -f supabase/schema.sql
```

Notes
- The schema enables RLS and defines `is_org_member()` helper function. After applying the schema, set up Supabase Auth and invite users.
- Do NOT commit your service role key. Use environment variables or a secrets manager.
- For CI, use a migration tool or Supabase CLI to apply migrations in a controlled way.

Client usage
- Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to your frontend environment (see `packages/admin-ui/.env.example`).

