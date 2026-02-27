## Prompt Start

I need you to build the complete AI-assisted development infrastructure for my project. This means creating all the files that tell GitHub Copilot **how to work on this project** — agent roles, hard rules, workflow templates, CI/CD pipelines, and code patterns — so that every session (1st or 100th) produces consistent, high-quality code without me re-explaining conventions.

**You are NOT writing application code.** You are writing the orchestration layer: Copilot instruction files, rules, workflow templates, settings, and CI/CD configs.

---

### 1. Project Brief

```
Project Name:        OSM — Operational Score Manager
One-line description: Back-office web app for managing credit scoring model lifecycle at Serasa Experian (internal codename: experian-score-web-front)
Domain/Industry:     FinTech / Credit bureau — internal tooling for Serasa Experian (Brazilian credit market)
Primary Language:    Portuguese (PT-BR) — all UI labels, comments, and domain terms use Portuguese
```

### 2. Architecture

```
Monorepo or Polyrepo: monorepo
Package Manager:      pnpm (workspaces)
Build Tool:           none (pnpm workspaces only — no Turborepo/Nx)

Apps (list each app):
- frontend  → Vue 3 + Vite (React 18 + Vite is the alternate option) — Main back-office SPA — SPA — http://localhost:5173
- backend   → Hono + tRPC — API server — N/A (JSON API) — http://localhost:3000

Shared Packages (list each):
- @osm/api  → Shared tRPC AppRouter type + all Zod schemas (imported by both frontend and backend)

Backend Modules (list planned modules):
- auth          — JWT verification (Okta IAM), token renewal, user info proxy — auth.me, auth.renewToken
- lista         — Reference lookup data (all 20 entity types in one call) — lista.all
- security      — User resource/permission fetch — security.myResources
- modelos       — Scoring model CRUD, sync, history, billing — modelos.list/create/update/sync/getHistory/getFaturamento/dashboard
- perfis        — RBAC role management — perfis.list/create/update/delete
- recursos      — Permission management — recursos.list/listAll/create/update/delete
- clientes      — Client company lookup — clientes.list/getByCnpj
- faturamentos  — Billing type management — faturamentos.list/listAll/create/update
- transacoes    — Transaction management — transacoes.list/create/update
- processamento — Apache Airflow DAG execution log — processamento.list
- historico     — Query history log + chart data — historico.list/grafico
- showroom      — Showroom query portal (read) — showroom.list/top5/relatorios
- categorias    — Quota category management — categorias.list/listAll/create/update
- baldes        — Quota bucket management — baldes.list/listAll/getEditInfo/create/update
- dashboard     — Aggregated KPI and macro analytics — dashboard.consolidado/macro/msu/smm/scoreBatch/maisConsultas/custoAws
- admin         — Full admin control plane: users, invitations, roles, permissions, support entities, showroom management, analytics, audit log — see ADMIN_MODULE.md
- upload (REST) — File upload endpoints (multipart/form-data, not tRPC): POST /upload/template, POST /upload/validate-variables
```

### 3. Tech Stack

```
| Technology              | Version | Purpose                                             |
|-------------------------|---------|-----------------------------------------------------|
| TypeScript              | 5.x     | Language for both frontend and backend              |
| Node.js                 | 20 LTS  | Backend runtime                                     |
| Hono                    | 4.x     | Lightweight HTTP server framework                   |
| tRPC                    | 11.x    | End-to-end type-safe API layer (no REST/GraphQL)    |
| @trpc/server            | 11.x    | Backend tRPC server adapter                         |
| @trpc/client            | 11.x    | Frontend tRPC client                                |
| Zod                     | 3.x     | Schema validation (shared via @osm/api package)     |
| Prisma                  | 5.x     | ORM for PostgreSQL                                  |
| PostgreSQL               | 16      | Primary relational database                         |
| jose                    | 5.x     | JWT verification against Okta JWKS endpoint         |
| Vue 3 (or React 18)     | 3.x/18  | Frontend framework                                  |
| Vite                    | 5.x     | Frontend build tool                                 |
| Pinia (or Zustand)      | 2.x     | Client state management                             |
| TanStack Query          | 5.x     | Server state / data fetching (vue-query or react-query) |
| vee-validate (or RHF)   | 4.x     | Form validation (paired with Zod)                   |
| shadcn/vue or Vuetify 3 | latest  | UI component library                                |
| date-fns                | 3.x     | Date utilities                                      |
| Vitest                  | 1.x     | Testing framework (backend + frontend)              |
| Vue Testing Library (or RTL) | latest | Component tests                                |
| Nodemailer or Resend    | latest  | Email delivery for user invitations                 |
| pnpm workspaces         | 9.x     | Monorepo management                                 |
| Docker + Docker Compose | latest  | Containerisation                                    |
| Nginx                   | 1.29    | Frontend static file serving in production          |
```

### 4. Authentication & Authorization

```
Auth Strategy:     Okta SAML SSO (entry point) + custom Experian IAM JWT token (runtime)
Token Details:     IAM JWT stored in localStorage (access_token key); sent as Authorization: Bearer <token> on every request.
                   Token renewal via POST {IAM_ROOT}/security/iam/v1/user-identities/renew-app-token when exp is near.
Token Payload:     { app_id, business_id, client_id, client_id_default, customer_id, exp, iat, jti,
                     scope: string[], service_id, user_id, authorities: string[] }
Password Hashing:  N/A — Okta manages all identity, MFA, and password lifecycle. Backend never handles passwords.
Roles:             Custom RBAC via Perfis (roles) + Recursos (permission codes). Hierarchy:
                   SUPER_ADMIN > (ADMIN_READONLY | USER_MANAGER | CONTENT_MANAGER | ANALYST) > app users
Guard Pattern:     protectedProcedure (requires JWT) + withPermission(code) factory (requires specific recurso code).
                   Frontend route guards decode JWT; fetch Recurso[] from security.myResources; cache in sessionStorage (4h TTL).
                   Menu items are hidden (not just disabled) when permission is absent.
```

### 5. Multi-Tenancy (if applicable)

```
Tenant Isolation:   N/A — Single tenant. OSM is an internal tool for one organisation (Serasa Experian).
Scoping Field:      N/A
Scoping Source:     N/A
Exceptions:         N/A
```

### 6. Naming & Code Conventions

```
Files:              kebab-case (e.g., modelo.router.ts, user-detail.page.vue)
Variables:          camelCase
Functions:          camelCase
Types/Classes:      PascalCase
Constants:          SCREAMING_SNAKE_CASE
Components:         PascalCase (e.g., ModelInventoryPage.vue, DataTable.vue)
API Prefix:         /trpc (all tRPC procedures) | /upload (REST file upload only) | /health (health check)
Error Shape:        TRPCError with codes: UNAUTHORIZED | FORBIDDEN | NOT_FOUND | BAD_REQUEST | UNPROCESSABLE_CONTENT
Response Envelope:  { content, totalElements, totalPages, last, first, size, number, numberOfElements, empty, sort }
                    for paginated lists; direct typed object for single items.
Pagination:         offset-based — page (0-indexed), size (20 | 50 | 100), sort ("field,asc" or "field,desc")
Test Files:         colocated *.spec.ts files
Commits:            conventional commits — feat, fix, refactor, test, docs, chore
Domain language:    Use Portuguese terms for domain entities: Modelo, Perfil, Recurso, Faturamento, Transacao,
                    Categoria, Balde, Historico, Showroom, Bureau, Plataforma, Canal, etc.
```

### 7. Dependency Order

Build dependency graph (upstream → downstream):

```
@osm/api (packages/api) → apps/backend → apps/frontend
       1                       2               3
```

Rule: Never build or import downstream packages before upstream are built. The `@osm/api` package is the single source of truth for all shared Zod schemas and the AppRouter type.

### 8. Git & Branch Strategy

```
Production branch:    main
Integration branch:   develop
Feature branches:     feat/<scope>/<desc>   (e.g., feat/modelos/add-sync-endpoint)
Bugfix branches:      fix/<scope>/<desc>    (e.g., fix/auth/token-renewal-loop)
Hotfix branches:      hotfix/<desc>
Scopes:               frontend, backend, api, auth, modelos, admin, showroom,
                      categorias, perfis, recursos, historico, dashboard, analytics
PR target:            develop — never directly to main
Merge strategy:       squash
```

### 9. CI/CD

```
CI Platform(s):       GitHub Actions
CI Triggers:          PR to develop → type-check, lint, test (all packages), build
Staging Deploy:       push to develop → CI + deploy to staging (Docker)
Production Deploy:    push to main → CI + deploy to production (Docker + Kubernetes/Helm + Argo Rollouts)
Deployment Targets:
  - frontend:  Docker multi-stage build → Nginx 1.29-alpine → Kubernetes (Helm + Argo Rollouts canary)
  - backend:   Docker (Node.js 20-alpine) → Kubernetes
  - database:  PostgreSQL 16 (managed) — migrations run via Prisma as a pre-deploy job
```

### 10. Development Phases

```
Phase 1: Infrastructure & Auth     ← CURRENT
  - Monorepo scaffold (pnpm workspaces, tsconfig, packages/api)
  - Prisma schema (all models — see Section 13.6 of PROJECT_INSTRUCTIONS.md)
  - Backend entry point (Hono + tRPC adapter + CORS + file upload REST routes)
  - tRPC setup: router, protectedProcedure, withPermission factory, context builder (jose JWT verify)
  - Auth flows: lista.all, auth.me, auth.renewToken, security.myResources
  - Docker Compose for local development (postgres + backend + frontend)

Phase 2: Core Domain Modules
  - modelos router: list, getById, getHistory, getFaturamento, create, update, sync, syncOne, dashboard
  - perfis router: CRUD
  - recursos router: CRUD + listAll
  - clientes router: list, getByCnpj
  - faturamentos router: CRUD + listAll
  - transacoes router: CRUD
  - processamento router: list (DAG executions)
  - historico router: list, grafico
  - showroom router: list, top5, relatorios
  - categorias router: CRUD + listAll
  - baldes router: CRUD + listAll + getEditInfo
  - dashboard router: all KPI queries
  - File upload endpoints (REST): /upload/template, /upload/validate-variables

Phase 3: Admin Module
  - admin.stats, admin.users.*, admin.invitations.*
  - admin.perfis.* (extended: clone, getUsers, userCount)
  - admin.recursos.* (extended: module field, perfilCount)
  - admin.entities.* (generic CRUD for all 20 reference entity types)
  - admin.showroom.* (pool management, featured list, drag-and-drop reorder, config)
  - admin.analytics.* (event ingestion, 6 report types)
  - admin.auditLog.* (list, getById, export CSV)
  - User invitation email flow (Nodemailer/Resend)

Phase 4: Frontend
  - tRPC client setup (createTRPCProxyClient or TanStack Query integration)
  - Auth store (token storage, permission check, route guards)
  - All pages and components per Section 8 (routes) and Section 10 (frontend guide) of PROJECT_INSTRUCTIONS.md
  - Admin layout and all admin pages per Section 4 of ADMIN_MODULE.md
  - Analytics tracking service (client-side event queue, 5-second flush)

Phase 5: Deployment & Operations
  - CI/CD pipelines (GitHub Actions: ci.yml, staging.yml, production.yml, db-migrations.yml)
  - Multi-stage Docker builds (frontend Nginx, backend Node.js)
  - Kubernetes Helm values (autoscaling, resource limits, Argo Rollouts canary)
  - Nginx config (SPA fallback, static asset caching, security headers)
  - Runtime env var substitution script (run.sh / envsubst)
```

### 11. Spec Documents (if any)

```
List any existing specification documents in the repo:
- PROJECT_INSTRUCTIONS.md — Complete specification: all entities, types, tRPC procedure contracts,
                             routes, auth flows, business rules, storage strategy, deployment, Prisma schema.
                             Sections: Project Overview, Tech Stack, Auth, Env Vars, tRPC Router Tree,
                             TypeScript Types, Procedure Specs, Routes & Pages, RBAC, Frontend Guide,
                             State & Caching, Docker, Backend Architecture (13 sections total).
- ADMIN_MODULE.md         — Full Admin module specification (companion to PROJECT_INSTRUCTIONS.md):
                             TypeScript types for User/Invitation/AuditLog/Analytics/Showroom/SupportEntities,
                             all admin tRPC procedures (3.1–3.9), admin routes & pages (Section 4),
                             admin permission codes (Section 5), analytics tracking guide (Section 6),
                             user invitation flow (Section 7), showroom pool vs featured detail (Section 8),
                             implementation notes (Section 9: generic entity page pattern, audit middleware).
- ARCHITECTURE_DECISIONS.md — Rationale for choosing tRPC over REST and GraphQL.
```

---

## What to Build

Create the following infrastructure files. Every file must contain **concrete code patterns with examples** — not just descriptions. The patterns should be copy-paste-ready blueprints that ensure consistency.

### File Structure to Create

```
[PROJECT_ROOT]/
├── .github/
│   ├── copilot-instructions.md            ← Master Orchestrator (always in context)
│   ├── copilot/
│   │   ├── workflows/                     ← Developer workflow templates
│   │   │   ├── implement-feature.md       ← Full-stack feature orchestrator
│   │   │   ├── new-module.md              ← Backend tRPC module scaffold
│   │   │   ├── new-page.md                ← Frontend page + tRPC data layer
│   │   │   ├── new-component.md           ← UI component
│   │   │   ├── scaffold-phase.md          ← Phase boilerplate generator
│   │   │   ├── review.md                  ← Code review checklist
│   │   │   ├── debug.md                   ← Structured debugging protocol
│   │   │   ├── bugfix.md                  ← Bug fix workflow (branch + test-first)
│   │   │   ├── deploy.md                  ← Deploy to environment
│   │   │   └── status.md                  ← Project progress report
│   │   └── rules/                         ← Hard rules (always enforced)
│   │       ├── trpc-type-safety.md        ← No REST drift; all procedures typed via @osm/api
│   │       ├── auth-guard.md              ← Every protected procedure uses withPermission(code)
│   │       ├── permission-codes.md        ← RBAC resource codes; hide not disable for missing perms
│   │       └── dependency-order.md        ← @osm/api → backend → frontend; no circular imports
│   └── workflows/                         ← GitHub Actions CI/CD
│
├── .vscode/
│   └── settings.json                      ← VS Code workspace settings
│
├── apps/
│   ├── backend/.copilot-instructions.md   ← Backend agent context + tRPC patterns
│   └── frontend/.copilot-instructions.md  ← Frontend agent context + Vue/React patterns
│
└── packages/
    └── api/.copilot-instructions.md       ← Shared package agent — Zod schemas, AppRouter type
```

---

## Content Requirements for Each File

### .github/copilot-instructions.md (Master Orchestrator) — ~200 lines
Must include ALL of these sections:
1. **Project Identity** — OSM, Serasa Experian, internal back-office, credit scoring model lifecycle
2. **Architecture Map** — ASCII tree: apps/frontend, apps/backend, packages/api and their purposes
3. **Tech Stack Table** — as defined in Section 3 above
4. **Agent Roles Table** — Agent name, trigger directory, responsibility
5. **Dependency Order** — @osm/api → backend → frontend; rule: never import downstream before upstream
6. **Task Decomposition Protocol** — 6 steps: Analyze → Decompose → Track → Execute → Verify → Report
7. **Spec File Router** — Table mapping domains to spec docs (PROJECT_INSTRUCTIONS.md sections, ADMIN_MODULE.md sections)
8. **Global Conventions** — Naming, Portuguese domain terms, tRPC-first (no REST except file uploads), auth pattern
9. **Git/Branch/PR Conventions** — Branch naming, conventional commits, PR template with checklist
10. **CI/CD Pipeline Summary** — Table of triggers and what runs
11. **Deployment Targets** — Table of apps → Docker → Kubernetes/Nginx
12. **Development Phase Tracker** — All 5 phases with deliverables, Phase 1 marked as current
13. **Hard Rules Summary** — 4 rules with links to .github/copilot/rules/
14. **Workflow Templates Table** — All 10 templates with purpose and invocation syntax

### .github/copilot/rules/*.md (Hard Rules) — ~40-110 lines each

**trpc-type-safety.md**
- Principle: The entire API surface lives in tRPC. No hand-written REST endpoints except /upload/*.
- Correct: procedure defined in backend router, type exported from @osm/api, imported type-only on frontend
- Incorrect: fetch('/api/modelos') or axios.get() or any REST call from frontend for domain data
- Exceptions: POST /upload/template and POST /upload/validate-variables (multipart/form-data REST)

**auth-guard.md**
- Principle: Every procedure that accesses data must be gated. No accidental public data exposure.
- Correct: withPermission('TELA_CONSULTA_MODELO').query() or protectedProcedure.query()
- Incorrect: publicProcedure.query() for any domain data
- Exceptions: lista.all, auth.me, admin.invitations.validate, admin.invitations.accept (explicitly public or callback)

**permission-codes.md**
- Principle: Frontend hides (not disables) UI elements when user lacks the required recurso code.
- Correct: v-if="hasPermission('TELA_CONSULTA_MODELO')" or {hasPermission('TELA_CONSULTA_MODELO') && <Button>}
- Incorrect: v-show, CSS visibility, or disabled attributes for permission-gated elements
- Lists all permission codes from Section 9 of PROJECT_INSTRUCTIONS.md and Section 5 of ADMIN_MODULE.md

**dependency-order.md**
- Principle: @osm/api is the single source of truth. Backend implements. Frontend consumes type-only.
- Correct build order: packages/api → apps/backend → apps/frontend
- Incorrect: frontend importing from apps/backend directly; backend importing from apps/frontend
- Zod schemas live in packages/api/src/schemas/; AppRouter type is re-exported from packages/api/src/index.ts

### .vscode/settings.json
Standard Copilot settings plus:
- `"editor.defaultFormatter": "esbenp.prettier-vscode"` for TypeScript/Vue files
- `"typescript.preferences.importModuleSpecifier": "shortest"`
- Exclude build artifacts and prisma generated client from search

### apps/backend/.copilot-instructions.md (Backend Agent) — ~150-250 lines
Must include:
1. Role: "You are the Backend Agent — Hono + tRPC server, Prisma ORM, PostgreSQL"
2. Directory structure matching Section 13.2 of PROJECT_INSTRUCTIONS.md
3. tRPC router pattern (router file, procedure pattern, withPermission usage)
4. Context builder pattern (jose JWT verification against Okta JWKS)
5. Prisma query patterns (include relations, pagination, audit log write)
6. Admin audit middleware pattern (write AuditLog entry after every admin mutation)
7. File upload handler pattern (multipart/form-data in Hono)
8. Test pattern (Vitest with Prisma mock or test database)
9. Domain-specific rules: Portuguese field names, all 20 reference entity types use generic CRUD

### apps/frontend/.copilot-instructions.md (Frontend Agent) — ~150-250 lines
Must include:
1. Role: "You are the Frontend Agent — Vue 3 (or React 18) + Vite, tRPC client, TanStack Query"
2. Directory structure matching Section 10.1 of PROJECT_INSTRUCTIONS.md
3. tRPC client setup pattern (createTRPCProxyClient with Authorization header)
4. TanStack Query integration pattern (useQuery, useMutation with trpc)
5. Auth store pattern (AuthState interface, hasPermission, isLoggedIn, fetchUserResources)
6. Route guard pattern (JWT decode → expiry check → permission fetch → sessionStorage cache)
7. Pagination pattern (PaginationState, 0-indexed, reset on filter/sort change)
8. Form pattern (vee-validate + Zod schema from @osm/api)
9. Permission guard pattern (v-if / conditional render — NOT v-show or disabled)
10. Analytics service pattern (AnalyticsService class, queue, 5-second flush)
11. Composable pattern (useAuth, usePagination, usePermission, useToast)
12. Admin layout vs main layout distinction

### packages/api/.copilot-instructions.md (Shared Package Agent) — ~60-100 lines
Must include:
1. Role: "You are the API Package Agent — single source of truth for tRPC types and Zod schemas"
2. What lives here: AppRouter type re-export, all Zod schemas per domain
3. Schema file organization: one file per domain (modelo.schema.ts, perfil.schema.ts, etc.)
4. How to add a new schema: create in packages/api/src/schemas/, export from index.ts
5. Constraint: this package has NO runtime backend or frontend dependencies — only zod

### .github/copilot/workflows/*.md (Workflow Templates) — ~30-100 lines each

| Workflow | Purpose | How to Use |
|----------|---------|------------|
| `implement-feature` | Orchestrates full-stack implementation: reads spec → decomposes → builds @osm/api schema → backend router → frontend page/component → tests → review. Respects dependency order. | "Follow the implement-feature workflow for [feature-name]" |
| `new-module` | Scaffolds a backend tRPC module: schema in @osm/api → router file → register in index.ts → Prisma model if needed → Vitest spec. | "Follow the new-module workflow to create [module-name]" |
| `new-page` | Creates a frontend page with tRPC data fetching: page component, composable/hook, route registration, permission guard. | "Follow the new-page workflow for [page-path] in [app]" |
| `new-component` | Creates a shared UI component with typed props, emits, slots. Adds to barrel export. | "Follow the new-component workflow for [component-name]" |
| `scaffold-phase` | Generates all boilerplate for a development phase. Creates task list with dependencies. | "Follow the scaffold-phase workflow for phase [N]" |
| `review` | Runs code review against all project rules: tRPC type safety, auth guards, permission codes, dependency order, Prisma query safety, test coverage. Reports by severity. | "Follow the review workflow for [file/feature]" |
| `debug` | Structured debugging: reproduce → isolate layer (frontend/tRPC/backend/DB) → trace data flow → fix → verify → learn. | "Follow the debug workflow for [issue]" |
| `bugfix` | Full bug fix workflow: reproduce → isolate → branch → test first (failing) → fix → verify → commit → PR. | "Follow the bugfix workflow for [bug-description]" |
| `deploy` | Deploys to staging or production. Validates branch, runs quality gate, runs Prisma migrations, confirms for production. | "Follow the deploy workflow to [environment]" |
| `status` | Scans codebase and reports: which phases/modules are done vs planned, what to build next. References spec documents. | "Follow the status workflow" |

### CI/CD Files (GitHub Actions)
Create GitHub Actions workflow files in `.github/workflows/`:
- **ci.yml** — PR checks: type-check (@osm/api → backend → frontend in order), lint, test (Vitest for all packages), build
- **staging.yml** — Push to develop → CI + docker build + deploy backend + deploy frontend to staging
- **production.yml** — Push to main → CI + docker build + Prisma migrate deploy + deploy backend + deploy frontend + notify
- **db-migrations.yml** — Manual trigger or on schema changes: runs `prisma migrate deploy`

Use parallel jobs where possible. Cache pnpm store.

---

## Implementation Order

Execute in this exact order (each step depends on the previous):

| Step | What | Files |
|------|------|-------|
| 1 | Create all directories | `mkdir -p` for the full tree |
| 2 | Master Orchestrator | `.github/copilot-instructions.md` |
| 3 | Hard Rules | `.github/copilot/rules/*.md` (4 files) |
| 4 | Settings | `.vscode/settings.json` |
| 5 | Package agent | `packages/api/.copilot-instructions.md` |
| 6 | Backend agent | `apps/backend/.copilot-instructions.md` |
| 7 | Frontend agent | `apps/frontend/.copilot-instructions.md` |
| 8 | Core workflows | `implement-feature.md`, `new-module.md`, `new-page.md`, `new-component.md` |
| 9 | Support workflows | `scaffold-phase.md`, `review.md`, `debug.md`, `bugfix.md`, `deploy.md`, `status.md` |
| 10 | CI/CD pipelines | `.github/workflows/*.yml` (4 files) |
| 11 | Track progress | Use manage_todo_list tool to track implementation |

Use the `manage_todo_list` tool to track progress. Parallelize independent file operations within each step using batch tool calls.

---

## Quality Criteria

After creating all files, verify:

1. **Completeness** — Every file in the structure exists and has substantive content
2. **Concreteness** — Agent files contain actual code patterns from this project (tRPC procedures, Prisma queries, Vue composables), not generic descriptions
3. **Consistency** — Portuguese domain terms, tRPC-first approach, and pnpm workspace conventions are uniform across all files
4. **Cross-referencing** — Rules files are referenced from copilot-instructions.md; agent files reference spec documents by section; workflows reference rules
5. **Actionability** — Workflow templates have clear step-by-step instructions with OSM-specific context
6. **Dependency awareness** — Every workflow and agent file respects @osm/api → backend → frontend order
7. **Self-sufficiency** — A new Copilot session with zero prior context should understand the full project from .github/copilot-instructions.md alone, and know to read PROJECT_INSTRUCTIONS.md and ADMIN_MODULE.md for deeper specs

---

## What NOT to Do

- Do NOT write application source code (no `.ts`, `.vue`, `.tsx` implementation files)
- Do NOT create package.json, tsconfig, prisma schema, or other config files (that's for the scaffold-phase workflow)
- Do NOT hallucinate tech stack details — use exactly what's specified above (Hono, tRPC v11, Prisma 5, PostgreSQL 16, pnpm)
- Do NOT use vague language like "follow best practices" — give concrete patterns using this project's actual types and procedures
- Do NOT create placeholder files with TODO comments — every file must have real content with OSM-specific examples
- Do NOT skip the code examples in agent files — they are the most important part
- Do NOT use REST patterns for domain data — all data flows through tRPC (exception: /upload/* endpoints)
- Do NOT refer to multi-tenancy patterns — OSM is a single-tenant internal tool

## Prompt End
