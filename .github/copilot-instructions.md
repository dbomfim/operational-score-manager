# OSM — Operational Score Manager: Master Copilot Orchestrator

> **Always read this file first.** It defines project identity, architecture, conventions, and agent roles.
> For deeper specs, follow the Spec File Router in Section 7.

---

## 1. Project Identity

OSM (Operational Score Manager) is an internal back-office web application for **Serasa Experian** — the Brazilian credit bureau. Internal teams use it to manage the full lifecycle of **credit scoring models**: creating, editing, activating, deactivating, synchronising, and auditing models. It also covers query history, billing analytics, showroom analytics, quota management (categorias + baldes), and a full admin control plane (users, invitations, RBAC, reference data, analytics reports, audit log).

All UI labels and domain terms are in **Portuguese (PT-BR)**. The system is **single-tenant** (one organisation: Serasa Experian) — no multi-tenancy scoping required.

---

## 2. Architecture Map

```
osm/                                    ← pnpm monorepo root (pnpm workspaces)
├── apps/
│   ├── frontend/                       ← Vue 3 + Vite SPA (React 18 is the alternate)
│   │   └── src/
│   │       ├── pages/                  ← one folder per route
│   │       ├── components/             ← shared UI components
│   │       ├── composables/            ← useAuth, usePagination, usePermission, useToast
│   │       ├── store/                  ← Pinia stores (auth, config, ui)
│   │       ├── router/                 ← route definitions + guards
│   │       └── lib/trpc.ts             ← tRPC client (createTRPCProxyClient)
│   └── backend/                        ← Hono + tRPC server (Node.js 20 LTS)
│       ├── src/
│       │   ├── index.ts                ← Hono entry point (CORS, tRPC mount, file upload REST)
│       │   ├── trpc.ts                 ← initTRPC, router, protectedProcedure, withPermission
│       │   ├── context.ts              ← JWT → Context via jose + Okta JWKS
│       │   ├── routers/
│       │   │   ├── index.ts            ← root AppRouter (merges all sub-routers)
│       │   │   ├── modelo.ts           ← scoring model CRUD, sync, history
│       │   │   ├── perfil.ts           ← RBAC roles
│       │   │   ├── recurso.ts          ← permissions
│       │   │   ├── categoria.ts        ← quota categories
│       │   │   ├── balde.ts            ← quota buckets
│       │   │   ├── showroom.ts         ← showroom read (query history)
│       │   │   ├── historico.ts        ← query history log
│       │   │   ├── dashboard.ts        ← KPI aggregations
│       │   │   └── admin/              ← admin control plane sub-routers
│       │   │       ├── index.ts
│       │   │       ├── users.ts
│       │   │       ├── invitations.ts
│       │   │       ├── perfis.ts
│       │   │       ├── recursos.ts
│       │   │       ├── entities.ts     ← generic CRUD for all 20 reference types
│       │   │       ├── showroom.ts     ← pool + featured list management
│       │   │       ├── analytics.ts    ← event ingestion + 6 report types
│       │   │       └── auditLog.ts
│       │   └── lib/
│       │       ├── prisma.ts           ← Prisma client singleton
│       │       ├── email.ts            ← Nodemailer/Resend sender
│       │       └── audit.ts            ← AuditLog writer (used after every admin mutation)
│       └── prisma/schema.prisma        ← PostgreSQL 16 schema (source of truth for DB)
└── packages/
    └── api/                            ← @osm/api — SINGLE SOURCE OF TRUTH
        └── src/
            ├── index.ts                ← re-exports AppRouter type + all Zod schemas
            └── schemas/                ← one file per domain (modelo.schema.ts, etc.)
```

---

## 3. Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| TypeScript | 5.x | Language — frontend + backend |
| Node.js | 20 LTS | Backend runtime |
| Hono | 4.x | Lightweight HTTP server framework |
| tRPC | 11.x | End-to-end type-safe API (replaces REST for all domain data) |
| Zod | 3.x | Schema validation — shared via `@osm/api` |
| Prisma | 5.x | ORM |
| PostgreSQL | 16 | Primary database |
| jose | 5.x | JWT verification against Okta JWKS endpoint |
| Vue 3 / React 18 | 3.x / 18 | Frontend framework (Vue 3 preferred) |
| Vite | 5.x | Frontend build tool |
| Pinia / Zustand | 2.x | Client state management |
| TanStack Query | 5.x | Server state / async data fetching |
| vee-validate / RHF | 4.x | Form validation (paired with Zod) |
| shadcn/vue or Vuetify 3 | latest | UI component library |
| date-fns | 3.x | Date utilities |
| Vitest | 1.x | Testing (backend + frontend) |
| pnpm workspaces | 9.x | Monorepo management |
| Docker + Nginx | latest / 1.29 | Containerisation + static serving |

---

## 4. Agent Roles

| Agent | Trigger Directory | Responsibility |
|---|---|---|
| **Master Orchestrator** | `.github/` | Routes tasks, enforces rules, decomposes features across all layers |
| **API Package Agent** | `packages/api/` | Zod schemas, AppRouter type — upstream of everything else |
| **Backend Agent** | `apps/backend/` | Hono server, tRPC routers, Prisma queries, JWT context, audit log |
| **Frontend Agent** | `apps/frontend/` | Vue/React pages, composables, tRPC client, auth store, route guards |

---

## 5. Dependency Order

```
packages/api  →  apps/backend  →  apps/frontend
     1                2                 3
```

**Rule:** Never import from a downstream package.
- `apps/frontend` imports `@osm/api` (type-only) — **never** from `apps/backend`
- `apps/backend` imports `@osm/api` — **never** from `apps/frontend`
- `packages/api` has no dependencies on either app

---

## 6. Task Decomposition Protocol

When given a feature or task, always follow these 6 steps:

1. **Analyze** — Read the relevant section of `PROJECT_INSTRUCTIONS.md` or `ADMIN_MODULE.md`
2. **Decompose** — Break into layers: Zod schema → backend router → frontend page/component → tests
3. **Track** — List all subtasks before starting any code
4. **Execute** — Work in dependency order: `@osm/api` first, backend second, frontend last
5. **Verify** — Check against all 4 rules in `.github/copilot/rules/`
6. **Report** — Summarise what was built, what was skipped, what remains

---

## 7. Spec File Router

| Domain | Primary Spec | Section |
|---|---|---|
| Project overview, tech stack, auth flow | `PROJECT_INSTRUCTIONS.md` | §1–§4 |
| All TypeScript types + Zod schemas | `PROJECT_INSTRUCTIONS.md` | §6 |
| Full tRPC router tree | `PROJECT_INSTRUCTIONS.md` | §5, §7 |
| Application routes & pages | `PROJECT_INSTRUCTIONS.md` | §8 |
| RBAC permission codes | `PROJECT_INSTRUCTIONS.md` | §9 |
| Frontend structure + code patterns | `PROJECT_INSTRUCTIONS.md` | §10 |
| State & caching strategy | `PROJECT_INSTRUCTIONS.md` | §11 |
| Docker & deployment | `PROJECT_INSTRUCTIONS.md` | §12 |
| Backend architecture + Prisma schema | `PROJECT_INSTRUCTIONS.md` | §13 |
| Admin module types + tRPC procedures | `ADMIN_MODULE.md` | §2–§3 |
| Admin routes & pages | `ADMIN_MODULE.md` | §4 |
| Admin permission codes | `ADMIN_MODULE.md` | §5 |
| Analytics tracking (client-side) | `ADMIN_MODULE.md` | §6 |
| User invitation flow | `ADMIN_MODULE.md` | §7 |
| Showroom pool vs featured detail | `ADMIN_MODULE.md` | §8 |
| tRPC vs REST rationale | `ARCHITECTURE_DECISIONS.md` | full |

---

## 8. Global Conventions

### Naming
- **Files:** `kebab-case` — e.g., `modelo.router.ts`, `user-detail.page.vue`
- **Variables / Functions:** `camelCase`
- **Types / Classes:** `PascalCase`
- **Constants:** `SCREAMING_SNAKE_CASE`
- **Domain terms:** always Portuguese — `Modelo`, `Perfil`, `Recurso`, `Faturamento`, `Balde`, `Historico`, `Showroom`, `Bureau`, `Plataforma`, `Canal`

### tRPC-First Rule
All domain data flows through tRPC. **Never** use raw `fetch` or `axios` for domain endpoints from the frontend.

```typescript
// ✅ CORRECT — tRPC call
const { data } = trpc.modelos.list.useQuery({ page: 0, size: 20 })

// ❌ WRONG — raw REST call for domain data
const res = await fetch('/api/modelos')
```

**Only exceptions:** `POST /upload/template` and `POST /upload/validate-variables` (multipart/form-data, cannot go through tRPC).

### Auth Pattern

```typescript
// Backend: gate every procedure that touches data
export const withPermission = (code: string) =>
  protectedProcedure.use(({ ctx, next }) => {
    if (!ctx.userResources.includes(code))
      throw new TRPCError({ code: 'FORBIDDEN', message: `Missing permission: ${code}` })
    return next()
  })

// Usage
modelos.list = withPermission('TELA_CONSULTA_MODELO').query(async ({ ctx, input }) => { ... })
```

### Pagination
- Pages are **0-indexed**, default `size: 20`, options: `20 | 50 | 100`
- Response envelope: `{ content, totalElements, totalPages, last, first, size, number, numberOfElements, empty }`
- On filter/sort change: always reset to `page: 0`

### Testing
- Colocated `*.spec.ts` files (not a separate `__tests__/` directory)
- Vitest for both backend and frontend

---

## 9. Git / Branch / PR Conventions

```
Production:   main
Integration:  develop
Features:     feat/<scope>/<desc>     e.g. feat/modelos/add-sync-endpoint
Bugfixes:     fix/<scope>/<desc>      e.g. fix/auth/token-renewal-loop
Hotfixes:     hotfix/<desc>
Scopes:       frontend | backend | api | auth | modelos | admin | showroom |
              categorias | perfis | recursos | historico | dashboard | analytics
```

**Commits:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore` (conventional commits)
**PRs:** always target `develop` — never directly to `main`
**Merge:** squash

**PR Checklist:**
- [ ] Zod schema changes are in `packages/api` first
- [ ] Backend procedure input/output matches the Zod schema exactly
- [ ] Frontend uses `@osm/api` types — no local type duplication
- [ ] All protected procedures use `withPermission()` or `protectedProcedure`
- [ ] UI elements are **hidden** (`v-if` / conditional render) — not disabled — when permission absent
- [ ] Vitest tests added or updated
- [ ] No `any` types introduced
- [ ] Audit log written after every admin mutation

---

## 10. CI/CD Pipeline Summary

| Trigger | Pipeline | Steps |
|---|---|---|
| PR → develop | `ci.yml` | type-check (in dep order), lint, test, build |
| Push → develop | `staging.yml` | CI → docker build → deploy to staging |
| Push → main | `production.yml` | CI → prisma migrate deploy → docker build → deploy → notify |
| Manual | `db-migrations.yml` | `prisma migrate deploy` only |

---

## 11. Deployment Targets

| App | Container | Target |
|---|---|---|
| frontend | Docker → Nginx 1.29-alpine | Kubernetes (Helm + Argo Rollouts canary) |
| backend | Docker → Node.js 20-alpine | Kubernetes (Helm) |
| database | PostgreSQL 16 (managed) | Migrations via `prisma migrate deploy` as pre-deploy job |

---

## 12. Development Phase Tracker

| Phase | Name | Status |
|---|---|---|
| **1** | Infrastructure & Auth | ← **CURRENT** |
| 2 | Core Domain Modules | pending |
| 3 | Admin Module | pending |
| 4 | Frontend | pending |
| 5 | Deployment & Operations | pending |

**Phase 1 deliverables:** monorepo scaffold, Prisma schema (all models from PROJECT_INSTRUCTIONS.md §13.6), Hono entry point, tRPC setup (`router`, `protectedProcedure`, `withPermission`), context builder (jose + Okta JWKS), `auth.me` / `auth.renewToken` / `lista.all` / `security.myResources` routers, Docker Compose.

---

## 13. Hard Rules

All rules live in `.github/copilot/rules/`. Always enforced — no exceptions without explicit justification.

| Rule | File | One-line summary |
|---|---|---|
| tRPC Type Safety | `trpc-type-safety.md` | All domain data through tRPC; no REST drift |
| Auth Guard | `auth-guard.md` | Every data procedure uses `withPermission()` or `protectedProcedure` |
| Permission Codes | `permission-codes.md` | Hide (`v-if`) not disable for missing permissions |
| Dependency Order | `dependency-order.md` | `@osm/api → backend → frontend`; no circular imports |

---

## 14. Workflow Templates

Invoke by saying: **"Follow the [workflow-name] workflow for [subject]"**

| Workflow | Purpose |
|---|---|
| `implement-feature` | Full-stack: schema → backend → frontend → tests (respects dep order) |
| `new-module` | Scaffold a backend tRPC module with Zod schema, router, Prisma model, tests |
| `new-page` | Frontend page + tRPC data layer + route registration + permission guard |
| `new-component` | Shared UI component with typed props, emits, slots, barrel export |
| `scaffold-phase` | Generate all boilerplate for a development phase |
| `review` | Code review against all 4 rules + Prisma safety + test coverage |
| `debug` | Structured debugging: reproduce → isolate layer → trace → fix → verify |
| `bugfix` | Branch → failing test → fix → verify → commit → PR |
| `deploy` | Deploy to staging or production (validates branch, runs migrations) |
| `status` | Scan codebase, report progress vs spec, identify what to build next |
