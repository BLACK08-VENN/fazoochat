# Deployment Guide

## Prerequisites

- Node.js 18+
- pnpm 8+
- A Supabase project (or self-hosted Supabase)
- Google Gemini API key

## 1. Supabase Setup

1. Create a new Supabase project
2. Enable the `vector` extension (for pgvector)
3. Run the migration:

```bash
# Set DATABASE_URL to your Supabase connection string (use transaction mode for migrations)
export DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

# Apply schema
psql "$DATABASE_URL" -f supabase/migrations/001_init.sql
```

4. Note your project URL and keys from the Supabase dashboard:
   - Project URL: `https://[PROJECT_REF].supabase.co`
   - Anon key (client-side safe)
   - Service role key (server-side only)

## 2. Environment Variables

### API (`packages/api/.env`)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-key
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
GEMINI_EMBEDDING_URL=https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent
ADMIN_API_KEY=your-admin-api-key
DATABASE_URL=postgresql://...
PORT=4000
```

### Admin UI (`packages/admin-ui/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 3. Local Development

```bash
pnpm install

# Start API
pnpm dev:api

# Start Admin UI (separate terminal)
pnpm dev:admin
```

Visit `http://localhost:3000` for the admin UI.

## 4. Production Deployment

### API (Docker)

```bash
docker build -t fazoo-api .
docker run -p 4000:4000 --env-file packages/api/.env fazoo-api
```

### API (Railway / Render / Fly.io)

- Build command: `cd packages/api && pnpm install && pnpm build`
- Start command: `cd packages/api && pnpm start`
- Set all environment variables in the platform dashboard

### Admin UI (Vercel)

1. Connect your Git repo to Vercel
2. Set the root directory to `packages/admin-ui`
3. Framework: Next.js
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` (your production API URL)

### Widget Hosting

After deploying, update the widget script on customer sites:

```html
<script
  src="https://fazoo.yourdomain.com/widget.js"
  data-assistant-id="ASSISTANT_ID"
  data-widget-url="https://admin.yourdomain.com/widget"
  data-primary-color="#f97316"
></script>
```

## 5. First Admin User

After deploying, create your first admin user:

1. Go to the Supabase dashboard → Authentication → Users
2. Create a new user with email/password
3. Use the Admin API key to create an organization:

```bash
curl -X POST http://localhost:4000/orgs \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-api-key" \
  -d '{"name": "My Org", "slug": "my-org", "owner_user_id": "USER_UUID"}'
```

4. Sign in at `http://localhost:3000/login` with the user credentials
