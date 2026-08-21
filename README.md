# Fazoo Chat - Monorepo

This workspace contains the Fazoo MVP scaffolding.

Packages:
- `admin-ui` — Next.js TypeScript admin dashboard (packages/admin-ui)
- `api` — Node.js Express REST API server (packages/api)
- `widget` — Embeddable vanilla JS widget script (packages/widget)

Workspace commands (root):

```bash
pnpm install
pnpm --filter admin-ui dev
pnpm --filter api dev
```
