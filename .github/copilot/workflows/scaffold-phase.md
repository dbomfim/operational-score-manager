# scaffold-phase — Development Phase Boilerplate Generator

## When to Use

Use when starting a new development phase. This workflow creates all the boilerplate files and task list for a phase so that work can begin immediately.

**Invoke:** "Follow the scaffold-phase workflow for phase [N]"

---

## Input Requirements

- Phase number (1–5)
- Confirm current phase from `PROJECT_INSTRUCTIONS.md §10` or `.github/copilot-instructions.md §12`

---

## Phase Reference

| Phase | Name | Key Deliverables |
|---|---|---|
| 1 | Infrastructure & Auth | Monorepo scaffold, Prisma schema, Hono entry, tRPC setup, context builder, auth/lista/security routers, Docker Compose |
| 2 | Core Domain Modules | 13 domain routers (modelos, perfis, recursos, clientes, faturamentos, transacoes, processamento, historico, showroom, categorias, baldes, dashboard, lista) |
| 3 | Admin Module | admin.stats, users, invitations, perfis (extended), recursos (extended), entities (generic), showroom management, analytics (ingest + 6 reports), auditLog, invitation email |
| 4 | Frontend | tRPC client, auth store, all pages/components (§8, §10), admin layout + pages (ADMIN_MODULE.md §4), analytics service |
| 5 | Deployment & Operations | CI/CD pipelines, multi-stage Docker builds, Kubernetes Helm, Nginx config, env substitution script |

---

## Workflow Steps

**Step 1 — List all subtasks for the phase**
Before creating any file, output a complete numbered task list. Each task maps to one file or one command.

**Step 2 — Create config files (Phase 1 only)**

```bash
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'

# packages/api/package.json
{ "name": "@osm/api", "version": "0.0.0", "main": "./src/index.ts",
  "types": "./src/index.ts", "dependencies": { "zod": "^3.23.0" },
  "devDependencies": { "typescript": "^5.4.0" } }

# apps/backend/package.json
{ "name": "@osm/backend", "dependencies": { "@osm/api": "workspace:*",
  "hono": "^4.0.0", "@hono/trpc-server": "^0.3.0", "@trpc/server": "^11.0.0",
  "zod": "^3.23.0", "@prisma/client": "^5.0.0", "jose": "^5.0.0" },
  "devDependencies": { "prisma": "^5.0.0", "vitest": "^1.0.0", "typescript": "^5.4.0" } }

# apps/frontend/package.json
{ "name": "@osm/frontend", "dependencies": { "@osm/api": "workspace:*",
  "@trpc/client": "^11.0.0", "vue": "^3.4.0", "pinia": "^2.1.0",
  "@tanstack/vue-query": "^5.0.0", "vee-validate": "^4.0.0" } }
```

**Step 3 — Scaffold in dependency order**
Always: `packages/api` → `apps/backend` → `apps/frontend`

For each new module, follow the `new-module` workflow.
For each new page, follow the `new-page` workflow.

**Step 4 — Run validation**

```bash
pnpm install
pnpm --filter @osm/api build
pnpm --filter @osm/backend exec prisma generate   # Phase 1+
pnpm --filter @osm/backend exec prisma migrate dev --name phase-<N>   # Phase 1+
pnpm --filter @osm/backend build
pnpm --filter @osm/frontend build
```

**Step 5 — Update phase tracker**
Update `.github/copilot-instructions.md §12` to mark phase as complete and next phase as CURRENT.

---

## Verification Checklist

- [ ] All files listed in the task list have been created
- [ ] `pnpm install` runs without errors
- [ ] TypeScript builds without errors in all three packages
- [ ] Prisma schema parses without errors (`prisma validate`)
- [ ] At least one Vitest test passes per new router

---

## Success Criteria

"Phase [N] scaffold is complete when all boilerplate files exist, TypeScript compiles, and the phase tracker in `.github/copilot-instructions.md` is updated."
