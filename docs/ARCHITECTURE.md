# Fazoo - Architecture Overview

## What is Fazoo

Multi-tenant SaaS AI chatbot platform. Businesses create AI assistants backed by their own knowledge bases (RAG). Customer-facing chat widgets can be embedded on external websites.

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces |
| Frontend | Next.js 14, React 18, TypeScript 5, Tailwind CSS 3 |
| Backend API | Node.js, Express 4, TypeScript |
| Database | Supabase (PostgreSQL) with pgvector extension |
| Auth | Supabase Auth (JWT bearer tokens) |
| AI / Embeddings | Google Gemini API |
| Vector Search | pgvector (ivfflat index, cosine distance) |
| Validation | Zod |
| Rate Limiting | express-rate-limit |
| Embeddable Widget | Vanilla JavaScript (self-contained IIFE) |
| Testing | Vitest (API), Playwright (E2E) |

## Architecture Principles

- **Multi-tenant SaaS**: Strong tenant isolation via Supabase Row-Level Security (RLS) and server-side membership checks.
- **Service-role keys server-side only**: Never exposed to the browser.
- **RAG pipeline**: pgvector stores embeddings, similarity search retrieves relevant chunks, Gemini generates responses.
- **Public + authenticated paths**: Widget uses unauthenticated `/chat/public` endpoints; admin UI uses JWT-authenticated endpoints.

## Packages

```
packages/
  api/              Express REST API server
  admin-ui/         Next.js admin dashboard + hosted widget UI
  chatbot-engine/   Reusable RAG pipeline class library
  widget/           Embeddable vanilla JS widget script
```

## API Endpoints

### Public (no auth, rate-limited)
- `POST /chat/public` — Send a message to an assistant
- `GET /chat/public/assistants/:id` — Get assistant config (welcome message, branding)
- `GET /chat/public/conversations/:id/messages` — Message history

### Authenticated
- `POST /auth/verify` — Verify token, return user + profile + orgs
- `GET/POST /orgs` — Organization CRUD (admin-key protected)
- `GET/POST/PUT/DELETE /assistants` — Assistant CRUD
- `GET/POST/PUT/DELETE /knowledge/sources` — Knowledge source CRUD + chunking
- `GET /knowledge/sources/:id/chunks` — View processed chunks
- `GET /chat/conversations` — List conversations (filterable by status)
- `PUT /chat/conversations/:id` — Update status / assign agent
- `POST /chat/conversations/:id/escalate` — Create escalation
- `GET /chat/conversations/:id/escalations` — List escalations
- `PUT /chat/escalations/:id` — Resolve escalation
- `POST /chat/assistants/:id/message` — Authenticated chat (admin testing)

## Database Schema

11 tables with full RLS: `profiles`, `organizations`, `organization_members`, `assistants`, `knowledge_sources`, `knowledge_chunks`, `customers`, `conversations`, `messages`, `escalations`, `analytics_events`.

- `is_org_member()` helper function for RLS policies
- `handle_new_user()` trigger auto-creates profiles on signup
- pgvector `ivfflat` index on knowledge_chunks for similarity search

## Knowledge Pipeline

1. User creates a knowledge source (text content) via admin UI
2. API stores source with status `pending`, triggers async processing
3. Processor chunks text (800 chars, 100 overlap), generates embeddings via Gemini
4. Chunks + embeddings inserted into `knowledge_chunks`
5. Source status updated to `ready`
6. On chat: user message is embedded, pgvector finds top-5 similar chunks, context sent to Gemini

## Widget Flow

1. Host page includes `widget.js` with `data-assistant-id`
2. Script creates floating button + iframe pointing to `/widget?assistantId=...`
3. Widget UI loads assistant config, shows welcome message
4. User sends message → `POST /chat/public` → RAG pipeline → Gemini response
5. Conversation and messages persisted in database
6. Admin sees conversation in real-time via conversations page

## Deployment

See `docs/DEPLOY.md` for full deployment instructions.

## Security

- RLS policies on every table using `is_org_member()` helper
- Rate limiting: 20 req/min on public chat, 30 req/15min on auth
- Zod validation on all API inputs
- Service-role keys never exposed to browser
- Widget uses only public (anonymous) endpoints
