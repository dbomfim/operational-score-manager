# debug — Structured Debugging Protocol

## When to Use

Use when a bug or unexpected behaviour needs to be investigated systematically. Do not jump straight to code changes — isolate the layer first.

**Invoke:** "Follow the debug workflow for [issue description]"

---

## Input Requirements

- Description of the unexpected behaviour
- Steps to reproduce (or the error message / stack trace)
- Layer where it was first observed: frontend / network / backend / database

---

## Workflow Steps

**Step 1 — Reproduce**
Confirm the bug is reproducible with a minimal scenario:
- What exact action triggers it?
- What is the expected result?
- What is the actual result?
- Is it consistent or intermittent?

**Step 2 — Isolate the layer**

Work from the outside in:

```
Frontend → tRPC client → Network → Backend (tRPC handler) → Prisma → Database
```

| Layer | How to isolate |
|---|---|
| **Frontend** | Check browser console for errors. Is the tRPC call being made? What input is sent? |
| **tRPC client** | Log the input before the call: `console.log('input', input)`. Does it match the Zod schema? |
| **Network** | Check Network tab in DevTools. Is the request reaching the backend? Status code? |
| **Backend (tRPC)** | Add `console.log` in the procedure handler. Is the context populated (`ctx.userId`, `ctx.userResources`)? |
| **Prisma** | Enable Prisma query log: `new PrismaClient({ log: ['query'] })`. Is the SQL correct? |
| **Database** | Run the equivalent SQL directly in psql/pgAdmin. Does the data exist? |

**Step 3 — Trace data flow**

For a tRPC call:
1. What Zod schema validates the input? (`packages/api/src/schemas/`)
2. Does the input pass Zod validation? If not, `BAD_REQUEST` is thrown before the handler runs.
3. Does `ctx.userResources` include the required permission code? If not, `FORBIDDEN`.
4. Does the Prisma query return the expected data? Is the `where` clause correct?
5. Does the procedure output match the expected TypeScript type?

For a frontend display bug:
1. What does `data` contain after the tRPC query resolves?
2. Is there a computed property transforming it incorrectly?
3. Is the template rendering the right field name (check Portuguese field names)?

**Step 4 — Fix**

- Make the minimum change to resolve the root cause.
- Do not refactor surrounding code as part of a bug fix.
- Do not change the Zod schema in `@osm/api` unless the schema itself is wrong.

**Step 5 — Verify**

```bash
# After the fix:
pnpm --filter @osm/api build
pnpm --filter @osm/backend test
pnpm --filter @osm/frontend test
# Confirm the original reproduction steps no longer trigger the bug
```

**Step 6 — Document (if recurring)**

If this bug has a non-obvious root cause, add a comment in the code. If it reveals a gap in the rules, update the relevant `.github/copilot/rules/*.md` file.

---

## Common OSM-Specific Debug Patterns

| Symptom | Likely Cause |
|---|---|
| `FORBIDDEN` on a procedure that should work | User's Perfil does not have the required Recurso; or `userResources` cache is stale (clear sessionStorage and re-login) |
| `UNAUTHORIZED` on every call | JWT expired or not being sent; check `Authorization` header in Network tab |
| Empty dropdown (Modelo form) | `lista.all` not fetched or localStorage cache expired; clear `configs` from localStorage |
| Type error on frontend after backend change | Schema in `@osm/api` was not rebuilt; run `pnpm --filter @osm/api build` |
| Prisma query returns more data than expected | Missing `where: { isActive: true }` on reference entities |
| Showroom pool not updating after model save | `autoSyncFromFlag` may be false in `ShowroomConfig`; check the DB record |

---

## Verification Checklist

- [ ] Root cause identified (not just symptom suppressed)
- [ ] Fix is in the correct layer — not a workaround in a downstream layer
- [ ] Regression test added if the bug was caused by missing test coverage
- [ ] `pnpm test` still passes after the fix

---

## Success Criteria

"Debug is complete when the reproduction steps no longer trigger the bug, root cause is documented, and tests pass."
