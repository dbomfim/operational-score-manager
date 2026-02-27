# status — Project Progress Report

## When to Use

Use to get a snapshot of where the project stands: what has been built, what is in progress, and what comes next.

**Invoke:** "Follow the status workflow"

---

## Workflow Steps

**Step 1 — Check the phase tracker**

Read `.github/copilot-instructions.md §12`. Identify the current phase.

**Step 2 — Scan packages/api**

```
packages/api/src/schemas/
```
List all schema files that exist. For each, confirm it is exported from `index.ts`.
Report which domains have schemas vs which are still missing (compare to `PROJECT_INSTRUCTIONS.md §6`).

**Step 3 — Scan apps/backend**

```
apps/backend/src/routers/
apps/backend/prisma/schema.prisma
```

List all router files. For each router, check:
- Does it exist? (`*.ts` file present)
- Is it registered in `routers/index.ts`?
- Does it have a `*.spec.ts` test file?

Compare against the full router tree in `PROJECT_INSTRUCTIONS.md §5` and `ADMIN_MODULE.md §3`.

**Step 4 — Scan apps/frontend**

```
apps/frontend/src/pages/
apps/frontend/src/router/index.ts
```

List all page components. For each route in `PROJECT_INSTRUCTIONS.md §8` and `ADMIN_MODULE.md §4`, report:
- Page component exists? (✅ / ❌)
- Route registered with `meta.permission`? (✅ / ❌)
- Has test file? (✅ / ❌)

**Step 5 — Run build + test (optional)**

```bash
pnpm --filter @osm/api build 2>&1 | tail -5
pnpm --filter @osm/backend test --run 2>&1 | tail -10
pnpm --filter @osm/frontend test --run 2>&1 | tail -10
```

**Step 6 — Generate the report**

Output the report in this format:

```
## OSM Status Report — [date]

### Current Phase: [N] — [Name]

### packages/api (Zod schemas)
✅ modelo.schema.ts
✅ perfil.schema.ts
❌ admin/analytics.schema.ts   ← missing
...

### apps/backend (tRPC routers)
✅ auth.ts — registered, has spec
✅ lista.ts — registered, has spec
❌ dashboard.ts — file missing
⚠️  historico.ts — exists, not registered in index.ts
...

### apps/frontend (pages)
✅ /modelos/dashboard — page + route + spec
❌ /admin/usuarios — page missing
⚠️  /modelos/inventario — page exists, no spec file
...

### Summary
- Schemas: 8 / 14 complete
- Backend routers: 5 / 16 complete
- Frontend pages: 3 / 28 complete

### Next steps (in dependency order)
1. Create missing Zod schemas: admin/analytics, admin/showroom
2. Implement backend routers: dashboard, processamento
3. Create frontend pages: /modelos/inventario, /historico/consulta
```

---

## Verification Checklist

- [ ] Phase tracker in `.github/copilot-instructions.md §12` is accurate
- [ ] Report compares against the spec (not against what "seems done")
- [ ] Next steps are listed in dependency order (`@osm/api` work before backend, backend before frontend)

---

## Success Criteria

"Status report is complete when it accurately reflects which files exist vs which are missing, and next steps are clearly prioritised by dependency order."
