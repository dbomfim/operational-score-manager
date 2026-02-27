# implement-feature — Full-Stack Feature Orchestrator

## When to Use

Use this workflow when implementing any new feature that touches more than one layer (schema, backend, frontend). It ensures the dependency order is respected and all layers are consistent.

**Invoke:** "Follow the implement-feature workflow for [feature-name]"

---

## Input Requirements

- Feature name or description
- Relevant section(s) of `PROJECT_INSTRUCTIONS.md` or `ADMIN_MODULE.md` (if known)
- Target app(s): frontend only / backend only / full-stack

---

## Workflow Steps

**Step 1 — Read the spec**
- Open `PROJECT_INSTRUCTIONS.md` or `ADMIN_MODULE.md` and find the section covering this feature.
- Identify all TypeScript types (§6), tRPC procedures (§7), routes (§8), and permission codes (§9).
- Note any business rules (Appendix B).

**Step 2 — Decompose into layers**
List every subtask before writing any code:
```
[ ] packages/api — add/update Zod schema in packages/api/src/schemas/<domain>.schema.ts
[ ] packages/api — export from packages/api/src/index.ts
[ ] apps/backend — implement router procedure(s) in apps/backend/src/routers/<domain>.ts
[ ] apps/backend — register in apps/backend/src/routers/index.ts (if new router)
[ ] apps/backend — add Prisma model(s) to schema.prisma (if new entity)
[ ] apps/frontend — create page component in apps/frontend/src/pages/<domain>/
[ ] apps/frontend — add route + meta.permission in apps/frontend/src/router/index.ts
[ ] apps/frontend — add nav item in NavMenu (with v-if permission guard)
[ ] apps/backend  — add *.spec.ts Vitest tests for the router
[ ] apps/frontend — add *.spec.ts Vitest + Testing Library tests for the page
```

**Step 3 — Execute in dependency order**
1. `packages/api` — schema first (always)
2. `apps/backend` — router + Prisma (never before schema is done)
3. `apps/frontend` — page + route (never before backend procedure exists)

**Step 4 — Apply rules**
After each layer, verify:
- [ ] `trpc-type-safety.md` — no raw REST for domain data
- [ ] `auth-guard.md` — every procedure uses `withPermission()` or `protectedProcedure`
- [ ] `permission-codes.md` — UI elements use `v-if`, correct permission code used
- [ ] `dependency-order.md` — no downstream imports, no circular deps

**Step 5 — Test**
```bash
pnpm --filter @osm/api build
pnpm --filter @osm/backend test
pnpm --filter @osm/frontend test
pnpm --filter @osm/backend build && pnpm --filter @osm/frontend build
```

**Step 6 — Report**
State:
- What was built (files created/modified)
- Which procedures were added (tRPC path + input/output types)
- Which routes were added (path + permission code)
- What was intentionally skipped and why
- What remains to be done

---

## Verification Checklist

- [ ] `packages/api` schema matches the TypeScript interface in `PROJECT_INSTRUCTIONS.md §6` exactly
- [ ] Backend procedure input validated by Zod schema from `@osm/api`
- [ ] Frontend imports types from `@osm/api` only — no local type definitions
- [ ] Route has `meta.permission` set to the correct code from §9 or `ADMIN_MODULE.md §5`
- [ ] Audit log written after every admin mutation
- [ ] No `any` types in new code
- [ ] Tests pass: `pnpm test` green

---

## Success Criteria

"Feature X is complete when:
1. tRPC procedure is callable from the frontend with full type safety
2. Permission guard blocks unauthorised users at the procedure level (backend) and hides the UI (frontend)
3. Vitest tests cover the happy path and at least one error case (FORBIDDEN or NOT_FOUND)
4. TypeScript builds without errors across all three packages"
