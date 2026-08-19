FROM node:18-alpine AS base
RUN corepack enable && corepack prepare pnpm@8 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/

RUN pnpm install --frozen-lockfile

COPY packages/api/ ./packages/api/

WORKDIR /app/packages/api
RUN pnpm build

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "dist/index.js"]
