# review — Code Review Checklist

## When to Use

Use before merging any PR, or to review a specific file or feature for quality and rule compliance.

**Invoke:** "Follow the review workflow for [file/feature/PR]"

---

## Input Requirements

- Target: file path, feature name, or PR description
- Scope: backend only / frontend only / full-stack

---

## Workflow Steps

**Step 1 — Identify changed files**
List all files added or modified. Group by layer: `packages/api`, `apps/backend`, `apps/frontend`.

**Step 2 — Rule compliance checks**

#### tRPC Type Safety (`trpc-type-safety.md`)
- [ ] No `fetch('/api/...')` or `axios.get()` calls for domain data in frontend
- [ ] All new procedures defined in `apps/backend/src/routers/`
- [ ] All new Zod schemas in `packages/api/src/schemas/` and exported from `index.ts`
- [ ] Frontend types imported from `@osm/api` — no local duplicates

#### Auth Guard (`auth-guard.md`)
- [ ] No domain procedure uses `publicProcedure` (unless listed as an explicit exception)
- [ ] Admin procedures use `withPermission('ADMIN_*')` with correct code
- [ ] Non-admin domain procedures use `withPermission('TELA_*')` or `withPermission('SHOWROOM_*')`
- [ ] `createContext` returns `{ userId: null, userResources: [] }` on invalid JWT — never throws

#### Permission Codes (`permission-codes.md`)
- [ ] All nav items and action buttons use `v-if` — not `v-show` or `:disabled`
- [ ] Route definitions have `meta.permission` set to the correct code
- [ ] Route guard blocks navigation when permission is missing
- [ ] Admin layout root guard checks `SUPER_ADMIN`

#### Dependency Order (`dependency-order.md`)
- [ ] `packages/api` has no dependencies on `apps/backend` or `apps/frontend`
- [ ] `apps/backend` only imports from `@osm/api`, `zod`, and its own `src/`
- [ ] `apps/frontend` only imports from `@osm/api` (types) and its own `src/`

**Step 3 — Code quality checks**

- [ ] No `any` types introduced (use `unknown` + type narrowing instead)
- [ ] No `console.log` left in production paths (only in error catch blocks if needed)
- [ ] All Prisma queries use `select` or `include` explicitly — no accidental over-fetching
- [ ] Soft-delete pattern: admin.entities mutations set `isActive: false`, never `delete()`
- [ ] Audit log written after every admin mutation (`writeAuditLog()` called in mutation body)
- [ ] Analytics events are fire-and-forget (wrapped in try/catch, errors silently swallowed)
- [ ] CNPJ inputs use mask format `XX.XXX.XXX/XXXX-XX`

**Step 4 — Test coverage checks**

- [ ] New backend router procedures have a `.spec.ts` with happy path + FORBIDDEN test
- [ ] New frontend pages have a `.spec.ts` with at least one render test
- [ ] New components have a `.spec.ts` covering rendering and event emission
- [ ] `pnpm test` passes across all packages

**Step 5 — Report findings**

Report by severity:
- 🔴 **Blocker** — violates a hard rule; PR cannot merge
- 🟡 **Warning** — code smell or missing test; should fix before merge
- 🟢 **Suggestion** — minor improvement; optional

---

## Verification Checklist

- [ ] All 4 hard rules verified (tRPC type safety, auth guard, permission codes, dependency order)
- [ ] No `any` types
- [ ] Audit log present in all admin mutations
- [ ] Tests pass

---

## Success Criteria

"Review is complete when all 🔴 blockers are resolved and findings have been reported with severity labels."
