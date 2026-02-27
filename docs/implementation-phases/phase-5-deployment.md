# Phase 5: Deployment & Operations

> **Branch:** `feat/phase-5/deployment`
> **Status:** Done
> **Depends on:** Phase 1–4
> **Reference:** `new-architecture-starter.md`, `NEW_ARCHITECTURE_PLAN.md`

---

## Overview

Phase 5 adds CI/CD pipelines, Docker builds for API and frontend, and deployment workflows. The project uses MongoDB (no SQL migrations); schema changes use `prisma db push`.

---

## Deliverables

| # | Deliverable | Description | Status |
|---|-------------|-------------|--------|
| 1 | CI workflow | Build, lint, type-check, test for api + frontend | Done |
| 2 | API Dockerfile | Multi-stage Node.js build | Done |
| 3 | Frontend Dockerfile | Build args for VITE_TRPC_URL, VITE_APP_URL | Done |
| 4 | Staging deploy | Push to develop → db push, build images, deploy | Done |
| 5 | Production deploy | Push to main → db push, build images, deploy | Done |
| 6 | db-sync workflow | Optional: prisma db push on schema changes | Done |
| 7 | Env substitution | run.sh with envsubst for runtime config | Done |

---

## Monorepo Structure (Current)

```
apps/
  api/     → NestJS + tRPC, Prisma (MongoDB)
  frontend → Vue 3 + Vite, Nginx serve
packages/
  shared/  → Zod schemas, types
```

- **Package filters:** `api`, `frontend`, `@osm/shared`
- **Node:** 22 LTS
- **Database:** MongoDB (no migrations; use `db push`)

---

## CI Jobs

1. **install** — pnpm install --frozen-lockfile
2. **build shared** — pnpm --filter @osm/shared build
3. **prisma generate** — pnpm --filter api exec prisma generate
4. **build api** — pnpm --filter api build
5. **build frontend** — pnpm --filter frontend build (needs VITE_* placeholders)
6. **test frontend** — pnpm --filter frontend test

---

## Docker

### API (`apps/api/Dockerfile`)

- Stage 1: node:22-alpine, pnpm install, nest build
- Stage 2: node:22-alpine, copy dist, CMD node main.js

### Frontend

- Already defined in Phase 4.

---

## Completion Criteria

- [x] `pnpm install && pnpm build` succeeds in CI
- [x] `pnpm --filter frontend test` passes in CI
- [x] `docker build -f apps/api/Dockerfile .` succeeds (run locally with Docker)
- [x] `docker build -f apps/frontend/Dockerfile .` succeeds (run locally with Docker)

## GitHub Variables (per environment)

Configure in Settings → Environments → staging / production:

- **STAGING_TRPC_URL** – tRPC API base URL (e.g. `https://api-staging.example.com`)
- **STAGING_APP_URL** – Frontend app URL (e.g. `https://app-staging.example.com`)
- **STAGING_BACKEND_URL** – Health check URL (e.g. `https://api-staging.example.com`)
- **PRODUCTION_TRPC_URL**, **PRODUCTION_APP_URL**, **PRODUCTION_BACKEND_URL** – same for production

Secrets: `STAGING_DATABASE_URL`, `PRODUCTION_DATABASE_URL` (MongoDB connection strings)

---

## Runtime config (frontend)

The frontend image supports **runtime** env injection via `run.sh` + envsubst. You can deploy the same image to multiple environments by passing env vars at container start:

```bash
docker run -e VITE_TRPC_URL=https://api.example.com/trpc -e VITE_APP_URL=https://app.example.com -p 80:80 osm-frontend
```

- **env-config.template.js** – Template with `$VITE_TRPC_URL`, `$VITE_APP_URL` placeholders
- **run.sh** – Entrypoint that runs envsubst before nginx
- **public/env-config.js** – Dev fallback; overwritten at runtime in production

---

## DB schema sync (optional workflow)

`.github/workflows/db-sync.yml` – Runs `prisma db push` when:

- **Manual:** Actions → DB schema sync → choose staging/production
- **Auto:** Push to `develop` when `apps/api/prisma/schema.prisma` changes → staging
