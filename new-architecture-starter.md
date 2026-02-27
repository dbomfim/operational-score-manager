## Prompt Start

I need you to build the complete AI-assisted development infrastructure for my project. This means creating all the files that tell GitHub Copilot **how to work on this project** — agent roles, hard rules, workflow templates, CI/CD pipelines, and code patterns — so that every session (1st or 100th) produces consistent, high-quality code without me re-explaining conventions.

**You are NOT writing application code.** You are writing the orchestration layer: Copilot instruction files, rules, workflow templates, settings, and CI/CD configs.

---

### 1. Project Brief

```
Project Name:        OSM — Operational Score Manager
One-line description: Back-office web app for managing credit scoring model lifecycle at Serasa Experian (internal codename: experian-score-web-front)
Domain/Industry:     FinTech / Credit bureau — internal tooling for Serasa Experian (Brazilian credit market)
Primary Language:    English — all code identifiers, routes, API paths, entity names, permission codes use English.
                     User-facing text via i18n (vue-i18n frontend, nestjs-i18n backend).
```

### 2. Architecture

```
Monorepo or Polyrepo: monorepo
Package Manager:      pnpm (workspaces)
Build Tool:           none (pnpm workspaces only — no Turborepo/Nx)

Apps (list each app):
- api   → NestJS 10+ — API server — N/A (tRPC + REST) — http://localhost:3000
- web   → Vue 3 + Vite — Main back-office SPA — SPA — http://localhost:5173

Shared Packages (list each):
- @osm/shared → AppRouter type export, DTOs, enums, constants, Zod schemas (imported by both api and web)

Backend Modules (list planned modules):
- auth          — JWT verification (Okta IAM), token renewal, user info — auth.me, auth.renewToken
- security      — User resource/permission fetch — security.me
- models        — Scoring model CRUD, sync — models.list/create/update/sync/syncOne/getById/getAudit
- clients       — Client company lookup — clients.list/getById
- categories    — Quota category management — categories.list/listAll/create/update
- buckets       — Quota bucket management — buckets.list/listAll/getEditInfo/create/update
- showroom      — Showroom query portal (read) — showroom.list/featured/reports
- lookup        — Reference lookup data (all entity types) — lookup.all/byEntity
- admin         — Full admin control plane: users, invitations, roles, permissions, support entities,
                  showroom management, analytics, audit log — see NEW_ARCHITECTURE_PLAN.md Section 6
- upload (REST) — File upload endpoints (multipart/form-data, not tRPC): POST /upload/template, POST /upload/validate-variables
```

### 3. Tech Stack

```
| Technology              | Version | Purpose                                             |
|-------------------------|---------|-----------------------------------------------------|
| TypeScript              | 5.x     | Language for both frontend and backend              |
| Node.js                 | 22 LTS  | Backend runtime                                     |
| NestJS                  | 10+     | Backend framework                                   |
| tRPC                    | v11     | End-to-end type-safe API layer (@trpc/server + NestJS adapter) |
| @trpc/server            | 11.x    | Backend tRPC server adapter                         |
| @trpc/client            | 11.x    | Frontend tRPC client                               |
| Zod                     | 3.x     | Schema validation (shared via @osm/shared package) |
| Prisma                  | 7.x     | ORM for MongoDB                                     |
| MongoDB                 | —       | Primary database (use prisma db push, no migrations)|
| jose                    | 5.x     | JWT verification against Okta JWKS endpoint         |
| Vue 3                   | 3.x     | Frontend framework                                  |
| Vite                    | 5.x     | Frontend build tool                                 |
| shadcn/vue              | latest  | UI component library                                |
| Pinia                   | 2.x     | Client state management                             |
| TanStack Query          | 5.x     | Server state / data fetching (@trpc/vue-query)     |
| vue-i18n                | v9      | Frontend i18n                                       |
| nestjs-i18n             | latest  | Backend i18n                                        |
| date-fns                | 3.x     | Date utilities                                      |
| Vitest                  | 1.x     | Testing framework (backend + frontend)            |
| pnpm workspaces         | 9.x     | Monorepo management                                 |
| Docker + Docker Compose | latest  | Containerisation                                    |
| Nginx                   | 1.29    | Frontend static file serving in production         |
```

### 4. Authentication & Authorization

```
Auth Strategy:     Okta SAML SSO (entry point) + JWT token (runtime)
Token Details:     JWT stored in localStorage; sent as Authorization: Bearer <token> on every request.
                   Token renewal via auth.renewToken when exp is near.
Token Payload:     Standard JWT claims; backend extracts userId, userEmail, userResources from context.
Password Hashing:  N/A — Okta manages all identity, MFA, and password lifecycle. Backend never handles passwords.
Roles:             Custom RBAC via Role + Permission. resource:action pattern (e.g. models:list, models:create).
                   Menu visibility derived from permissions (no explicit MENU_* codes).
Guard Pattern:     protectedProcedure (requires JWT) + withPermission(code) factory (requires specific permission).
                   Frontend route guards fetch permissions from security.me; cache in sessionStorage (TTL).
                   Menu items are hidden (not just disabled) when permission is absent.
```

### 5. Naming & Code Conventions

```
Files:              kebab-case (e.g., models.router.ts, user-detail.page.vue)
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
Domain language:    All code identifiers, routes, API paths, entity names, permission codes use English.
                    User-facing labels via i18n (en.json, pt-BR.json).
```

### 6. Dependency Order

Build dependency graph (upstream → downstream):

```
@osm/shared (packages/shared) → apps/api → apps/web
       1                              2           3
```

Rule: Never build or import downstream packages before upstream are built. The `@osm/shared` package is the single source of truth for all shared Zod schemas, DTOs, enums, constants, and the AppRouter type.

### 7. Git & Branch Strategy

```
Production branch:    main
Integration branch:   develop
Feature branches:     feat/<scope>/<desc>   (e.g., feat/models/add-sync-endpoint)
Bugfix branches:     fix/<scope>/<desc>    (e.g., fix/auth/token-renewal-loop)
Hotfix branches:      hotfix/<desc>
Scopes:               frontend, backend, api, auth, models, admin, showroom,
                      categories, buckets, lookup, analytics
PR target:            develop — never directly to main
Merge strategy:       squash
```

### 8. CI/CD

```
CI Platform(s):       GitHub Actions
CI Triggers:          PR to develop → type-check, lint, test (all packages), build
Staging Deploy:       push to develop → CI + deploy to staging (Docker)
Production Deploy:    push to main → CI + deploy to production (Docker + Kubernetes/Helm + Argo Rollouts)
Deployment Targets:
  - web:     Docker multi-stage build → Nginx 1.29-alpine → Kubernetes (Helm + Argo Rollouts canary)
  - api:     Docker (Node.js 22-alpine) → Kubernetes
  - database: MongoDB (managed) — schema sync via prisma db push (no migration files)
```

### 9. Development Phases

```
Phase 1: Infrastructure & Auth     ← CURRENT
  - Monorepo scaffold (pnpm workspaces, tsconfig, packages/shared)
  - Prisma schema (MongoDB — see NEW_ARCHITECTURE_PLAN.md Section 4)
  - NestJS entry point + tRPC adapter (nestjs-trpc or trpc-nest) + CORS + file upload REST routes
  - tRPC setup: router, protectedProcedure, withPermission factory, context builder (jose JWT verify)
  - Auth flows: auth.me, auth.renewToken, security.me
  - Docker Compose for local development (mongodb + api)

Phase 2: Core Domain Modules
  - models router: list, getById, getAudit, create, update, sync, syncOne
  - clients router: list, getById
  - categories router: list, listAll, create, update
  - buckets router: list, listAll, getEditInfo, create, update
  - showroom router: list, featured, reports
  - lookup router: all, byEntity
  - File upload endpoints (REST): /upload/template, /upload/validate-variables

Phase 3: Admin Module
  - admin.stats, admin.users.*, admin.invitations.*
  - admin.roles.* (extended: clone, getUsers, userCount)
  - admin.permissions.* (extended: module field, roleCount)
  - admin.entities.* (generic CRUD for all reference entity types)
  - admin.showroom.* (pool management, featured list, drag-and-drop reorder, config)
  - admin.analytics.* (event ingestion, report types)
  - admin.auditLog.* (list, getById, export CSV)
  - User invitation email flow (Nodemailer/Resend)

Phase 4: Frontend
  TODO — To be defined. See NEW_ARCHITECTURE_PLAN.md Section 7 for routes, tech stack, layouts,
  permission composables, route guards, and field-level visibility patterns.

Phase 5: Deployment & Operations
  - CI/CD pipelines (GitHub Actions: ci.yml, staging.yml, production.yml, db-sync.yml)
  - Multi-stage Docker builds (web Nginx, api Node.js)
  - Kubernetes Helm values (autoscaling, resource limits, Argo Rollouts canary)
  - Nginx config (SPA fallback, static asset caching, security headers)
  - Runtime env var substitution script (run.sh / envsubst)
```

### 10. Spec Documents (if any)

```
List any existing specification documents in the repo:
- NEW_ARCHITECTURE_PLAN.md — Complete redesign blueprint: technology stack, domain model, Prisma schema (MongoDB),
                              NestJS module architecture, tRPC router tree, permission system, i18n strategy,
                              monorepo structure. Sections: Tech Stack, Domain Model, Prisma Schema,
                              NestJS Modules, API Spec (tRPC + REST), Frontend Architecture, Permission System,
                              i18n Strategy, Monorepo Structure.
- ARCHITECTURE_DECISIONS.md — Rationale for key architectural choices.
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
│   │       ├── trpc-type-safety.md        ← No REST drift; all procedures typed via @osm/shared
│   │       ├── auth-guard.md              ← Every protected procedure uses withPermission(code)
│   │       ├── permission-codes.md        ← RBAC resource:action codes; hide not disable for missing perms
│   │       └── dependency-order.md       ← @osm/shared → api → web; no circular imports
│   └── workflows/                         ← GitHub Actions CI/CD
│
├── .vscode/
│   └── settings.json                      ← VS Code workspace settings
│
├── apps/
│   ├── api/.copilot-instructions.md       ← Backend agent context + tRPC patterns
│   └── web/.copilot-instructions.md       ← Frontend agent context (TODO — see Phase 4)
│
└── packages/
    └── shared/.copilot-instructions.md     ← Shared package agent — Zod schemas, AppRouter type
```

---

## Content Requirements for Each File

### .github/copilot-instructions.md (Master Orchestrator) — ~200 lines
Must include ALL of these sections:
1. **Project Identity** — OSM, Serasa Experian, internal back-office, credit scoring model lifecycle
2. **Architecture Map** — ASCII tree: apps/web, apps/api, packages/shared and their purposes
3. **Tech Stack Table** — as defined in Section 3 above
4. **Agent Roles Table** — Agent name, trigger directory, responsibility
5. **Dependency Order** — @osm/shared → api → web; rule: never import downstream before upstream
6. **Task Decomposition Protocol** — 6 steps: Analyze → Decompose → Track → Execute → Verify → Report
7. **Spec File Router** — Table mapping domains to spec docs (NEW_ARCHITECTURE_PLAN.md sections)
8. **Global Conventions** — Naming, English identifiers, i18n for labels, tRPC-first (no REST except file uploads), auth pattern
9. **Git/Branch/PR Conventions** — Branch naming, conventional commits, PR template with checklist
10. **CI/CD Pipeline Summary** — Table of triggers and what runs
11. **Deployment Targets** — Table of apps → Docker → Kubernetes/Nginx
12. **Development Phase Tracker** — All 5 phases with deliverables, Phase 1 marked as current
13. **Hard Rules Summary** — 4 rules with links to .github/copilot/rules/
14. **Workflow Templates Table** — All 10 templates with purpose and invocation syntax

### .github/copilot/rules/*.md (Hard Rules) — ~40-110 lines each

**trpc-type-safety.md**
- Principle: The entire API surface lives in tRPC. No hand-written REST endpoints except /upload/*.
- Correct: procedure defined in api router, type exported from @osm/shared, imported type-only on frontend
- Incorrect: fetch('/api/models') or axios.get() or any REST call from frontend for domain data
- Exceptions: POST /upload/template and POST /upload/validate-variables (multipart/form-data REST)

**auth-guard.md**
- Principle: Every procedure that accesses data must be gated. No accidental public data exposure.
- Correct: withPermission('models:list').query() or protectedProcedure.query()
- Incorrect: publicProcedure.query() for any domain data
- Exceptions: auth.me, security.me, admin.invitations.validate, admin.invitations.accept (explicitly public or callback)

**permission-codes.md**
- Principle: Frontend hides (not disables) UI elements when user lacks the required permission code.
- Correct: v-if="hasPermission('models:list')" or {hasPermission('models:list') && <Button>}
- Incorrect: v-show, CSS visibility, or disabled attributes for permission-gated elements
- Lists all permission codes from NEW_ARCHITECTURE_PLAN.md Section 8

**dependency-order.md**
- Principle: @osm/shared is the single source of truth. Backend implements. Frontend consumes type-only.
- Correct build order: packages/shared → apps/api → apps/web
- Incorrect: web importing from apps/api directly; api importing from apps/web
- Zod schemas live in packages/shared/src/schemas/; AppRouter type is re-exported from packages/shared/src/index.ts

### .vscode/settings.json
Standard Copilot settings plus:
- `"editor.defaultFormatter": "esbenp.prettier-vscode"` for TypeScript/Vue files
- `"typescript.preferences.importModuleSpecifier": "shortest"`
- Exclude build artifacts and prisma generated client from search

### apps/api/.copilot-instructions.md (Backend Agent) — ~150-250 lines
Must include:
1. Role: "You are the Backend Agent — NestJS + tRPC server, Prisma ORM, MongoDB"
2. Directory structure matching NEW_ARCHITECTURE_PLAN.md Section 5
3. tRPC router pattern (router file, procedure pattern, withPermission usage)
4. Context builder pattern (jose JWT verification against Okta JWKS)
5. Prisma query patterns (MongoDB ObjectId, include relations, pagination, audit log write)
6. Admin audit middleware pattern (write AuditLog entry after every admin mutation)
7. File upload handler pattern (multipart/form-data in NestJS)
8. Test pattern (Vitest with Prisma mock or test database)
9. Domain-specific rules: English field names, explicit junction collections for M2M (ModelChannel, UserRole, etc.)

### apps/web/.copilot-instructions.md (Frontend Agent)
**TODO** — To be created in Phase 4. See NEW_ARCHITECTURE_PLAN.md Section 7 for:
- Vue 3 + Vite + shadcn/vue structure
- tRPC client setup (createTRPCProxyClient with Authorization header)
- Auth store, permission composable, route guards
- Layouts (PublicLayout, PrivateLayout, AdminLayout)
- Field-level visibility patterns

### packages/shared/.copilot-instructions.md (Shared Package Agent) — ~60-100 lines
Must include:
1. Role: "You are the Shared Package Agent — single source of truth for tRPC types and Zod schemas"
2. What lives here: AppRouter type re-export, all Zod schemas per domain, permissions.ts, field-groups.ts
3. Schema file organization: one file per domain (model.schema.ts, client.schema.ts, etc.)
4. How to add a new schema: create in packages/shared/src/schemas/, export from index.ts
5. Constraint: this package has NO runtime backend or frontend dependencies — only zod

### .github/copilot/workflows/*.md (Workflow Templates) — ~30-100 lines each

| Workflow | Purpose | How to Use |
|----------|---------|------------|
| `implement-feature` | Orchestrates full-stack implementation: reads spec → decomposes → builds @osm/shared schema → api router → frontend page/component → tests → review. Respects dependency order. | "Follow the implement-feature workflow for [feature-name]" |
| `new-module` | Scaffolds a backend tRPC module: schema in @osm/shared → router file → register in index.ts → Prisma model if needed → Vitest spec. | "Follow the new-module workflow to create [module-name]" |
| `new-page` | Creates a frontend page with tRPC data fetching: page component, composable, route registration, permission guard. | "Follow the new-page workflow for [page-path] in [app]" |
| `new-component` | Creates a shared UI component with typed props, emits, slots. Adds to barrel export. | "Follow the new-component workflow for [component-name]" |
| `scaffold-phase` | Generates all boilerplate for a development phase. Creates task list with dependencies. | "Follow the scaffold-phase workflow for phase [N]" |
| `review` | Runs code review against all project rules: tRPC type safety, auth guards, permission codes, dependency order, Prisma query safety, test coverage. Reports by severity. | "Follow the review workflow for [file/feature]" |
| `debug` | Structured debugging: reproduce → isolate layer (frontend/tRPC/backend/DB) → trace data flow → fix → verify → learn. | "Follow the debug workflow for [issue]" |
| `bugfix` | Full bug fix workflow: reproduce → isolate → branch → test first (failing) → fix → verify → commit → PR. | "Follow the bugfix workflow for [bug-description]" |
| `deploy` | Deploys to staging or production. Validates branch, runs quality gate, runs prisma db push (MongoDB), confirms for production. | "Follow the deploy workflow to [environment]" |
| `status` | Scans codebase and reports: which phases/modules are done vs planned, what to build next. References spec documents. | "Follow the status workflow" |

### CI/CD Files (GitHub Actions)
Create GitHub Actions workflow files in `.github/workflows/`:
- **ci.yml** — PR checks: type-check (@osm/shared → api → web in order), lint, test (all packages), build
- **staging.yml** — Push to develop → CI + docker build + deploy api + deploy web to staging
- **production.yml** — Push to main → CI + docker build + prisma db push + deploy api + deploy web + notify
- **db-sync.yml** — Manual trigger or on schema changes: runs `prisma db push` (MongoDB — no migrations)

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
| 5 | Package agent | `packages/shared/.copilot-instructions.md` |
| 6 | Backend agent | `apps/api/.copilot-instructions.md` |
| 7 | Frontend agent | `apps/web/.copilot-instructions.md` — **TODO (Phase 4)** |
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
3. **Consistency** — English identifiers, tRPC-first approach, and pnpm workspace conventions are uniform across all files
4. **Cross-referencing** — Rules files are referenced from copilot-instructions.md; agent files reference spec documents by section; workflows reference rules
5. **Actionability** — Workflow templates have clear step-by-step instructions with OSM-specific context
6. **Dependency awareness** — Every workflow and agent file respects @osm/shared → api → web order
7. **Self-sufficiency** — A new Copilot session with zero prior context should understand the full project from .github/copilot-instructions.md alone, and know to read NEW_ARCHITECTURE_PLAN.md for deeper specs

---

## What NOT to Do

- Do NOT write application source code (no `.ts`, `.vue`, `.tsx` implementation files)
- Do NOT create package.json, tsconfig, prisma schema, or other config files (that's for the scaffold-phase workflow)
- Do NOT hallucinate tech stack details — use exactly what's specified above (NestJS, tRPC v11, Prisma 7, MongoDB, pnpm)
- Do NOT use vague language like "follow best practices" — give concrete patterns using this project's actual types and procedures
- Do NOT create placeholder files with TODO comments — every file must have real content with OSM-specific examples
- Do NOT skip the code examples in agent files — they are the most important part
- Do NOT use REST patterns for domain data — all data flows through tRPC (exception: /upload/* endpoints)
- Do NOT refer to multi-tenancy patterns — OSM is a single-tenant internal tool
- Do NOT use Portuguese for code identifiers — all code uses English; user-facing text via i18n

## Prompt End
