# Phase 1: Infrastructure & Auth

> **Branch:** `feat/phase-1/infrastructure-auth`  
> **Status:** Complete  
> **Reference:** `new-architecture-starter.md` §9, `NEW_ARCHITECTURE_PLAN.md` §4–6

---

## Overview

Phase 1 establishes the foundational monorepo scaffold, database schema, NestJS API with tRPC, and authentication flows. No frontend yet — this phase is backend-focused.

---

## Deliverables

| # | Deliverable | Description | Status |
|---|-------------|-------------|--------|
| 1 | Monorepo scaffold | pnpm workspaces, root package.json, tsconfig, packages/shared | ✅ |
| 2 | Prisma schema | MongoDB schema (User, Role, Permission, UserRole, RolePermission) | ✅ |
| 3 | NestJS entry point | main.ts, app.module.ts, CORS, health check | ✅ |
| 4 | tRPC adapter | NestJS + tRPC integration (nestjs-trpc) | ✅ |
| 5 | tRPC setup | router, protectedProcedure (ProtectedMiddleware) | ✅ |
| 6 | Context builder | JWT verification via jose (JWT_SECRET) | ✅ |
| 7 | Auth flows | auth.me, auth.renewToken | ✅ |
| 8 | Security flow | security.me (user resources/permissions) | ✅ |
| 9 | File upload REST routes | Placeholder — Phase 2 | ⬜ |
| 10 | Docker Compose | mongodb for local development | ✅ |

---

## Tech Stack (Phase 1)

| Technology | Version |
|------------|---------|
| Node.js | 22 LTS |
| NestJS | 10+ |
| tRPC | v11 |
| Prisma | 7.x |
| MongoDB | — |
| jose | 5.x |
| Zod | 3.x |
| pnpm | 9.x |

---

## Dependency Order

```
packages/shared → apps/api
```

`@osm/shared` must be built first. It exports Zod schemas, DTOs, and the AppRouter type.

---

## File Structure (Target)

```
/
├── apps/
│   └── api/
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── trpc/
│       │   │   ├── trpc.module.ts
│       │   │   ├── context.ts
│       │   │   ├── router.ts
│       │   │   └── routers/
│       │   │       ├── index.ts
│       │   │       ├── auth.router.ts
│       │   │       └── security.router.ts
│       │   └── prisma/
│       │       └── prisma.module.ts
│       ├── prisma/
│       │   └── schema.prisma
│       └── package.json
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── index.ts
│       │   ├── schemas/
│       │   │   ├── auth.schema.ts
│       │   │   └── security.schema.ts
│       │   └── permissions.ts
│       └── package.json
├── prisma/
│   └── schema.prisma          # Or at apps/api/prisma — TBD
├── pnpm-workspace.yaml
├── package.json
├── docker-compose.yml
└── .env.example
```

---

## tRPC Procedures (Phase 1)

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| auth.me | query | protected | Returns current user info from JWT |
| auth.renewToken | mutation | protected | Renews JWT (proxy to Okta or returns same token for now) |
| security.me | query | protected | Returns user resources/permissions for RBAC |

---

## Notes

- **auth.renewToken:** May initially return the same token; full Okta integration can be added later.
- **security.me:** Fetches User + Roles + Permissions from DB; returns flattened permission codes.
- **Prisma schema:** Full schema from NEW_ARCHITECTURE_PLAN.md §4; Phase 1 only needs User, Role, Permission, UserRole, RolePermission for security.me.
- **JWT context:** Extract `userId`, `userEmail` from JWT; `userResources` (permissions) loaded from DB in security.me or on first request.

---

## Setup (before first run)

```bash
# Copy env template (Prisma loads from apps/api/)
cp apps/api/.env.example apps/api/.env

# Start MongoDB
docker compose up -d

# Sync schema
pnpm --filter api db:push
```

---

## Completion Criteria

- [x] `pnpm install` succeeds
- [x] `pnpm --filter @osm/shared build` succeeds
- [x] `pnpm --filter api build` succeeds
- [x] `pnpm --filter api start` starts API on port 3000
- [x] `docker compose up -d` starts MongoDB (requires Docker running)
- [x] `pnpm --filter api db:push` syncs schema to MongoDB
- [x] auth.me returns 401 without valid JWT
- [x] auth.me returns user info with valid JWT
- [x] security.me returns permissions for authenticated user (or [] if user not in DB)
