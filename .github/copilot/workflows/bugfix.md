# bugfix — Bug Fix Workflow

## When to Use

Use when fixing a confirmed bug. This workflow enforces test-first discipline: write a failing test that proves the bug exists, then fix it.

**Invoke:** "Follow the bugfix workflow for [bug description]"

---

## Input Requirements

- Bug description
- Reproduction steps
- Layer affected (frontend / backend / both)
- Related issue number (if any)

---

## Workflow Steps

**Step 1 — Reproduce and understand**
Run through the `debug` workflow (Step 1–3) to confirm the root cause before writing any code.

**Step 2 — Create the fix branch**

```bash
git checkout develop
git pull origin develop
git checkout -b fix/<scope>/<short-description>
# e.g. fix/auth/token-renewal-loop
# e.g. fix/modelos/inventory-filter-reset
```

**Step 3 — Write the failing test first**

Before touching production code, write a test that:
1. Reproduces the bug exactly
2. Fails with the current code
3. Will pass once the fix is applied

```typescript
// Backend example
it('should return 404 when modelo does not exist', async () => {
  // This test FAILS before the fix (wrong error code was being thrown)
  await expect(caller.modelos.getById({ id: 'nonexistent' }))
    .rejects.toMatchObject({ code: 'NOT_FOUND' })
})

// Frontend example
it('should reset to page 0 when filter changes', async () => {
  const { state, reset } = usePagination()
  state.page = 3
  reset()
  expect(state.page).toBe(0)   // FAILS if reset() is broken
})
```

Confirm the test fails:
```bash
pnpm --filter @osm/<package> test --run
```

**Step 4 — Fix the bug**

Make the minimum code change to make the failing test pass. Do not:
- Refactor unrelated code
- Add features not related to the bug
- Change API contracts (Zod schemas) unless the schema itself is wrong

**Step 5 — Verify**

```bash
# Confirm failing test now passes
pnpm --filter @osm/<package> test --run

# Confirm no regressions
pnpm --filter @osm/api build
pnpm --filter @osm/backend test
pnpm --filter @osm/frontend test
```

**Step 6 — Commit**

```bash
git add <changed files>
git commit -m "fix(<scope>): <short description of what was wrong and what was fixed>

Fixes #<issue number if applicable>
Root cause: <one sentence>"
```

**Step 7 — Open PR to develop**

```bash
gh pr create \
  --base develop \
  --title "fix(<scope>): <description>" \
  --body "## What was broken
<description>

## Root cause
<one sentence>

## Fix
<what changed>

## Test
<name of the test that was added>"
```

---

## Verification Checklist

- [ ] Fix branch is based on `develop` (not `main`)
- [ ] Failing test was written BEFORE the fix
- [ ] Failing test now passes
- [ ] No other tests were broken
- [ ] Fix is minimal — no unrelated changes
- [ ] Commit message follows `fix(<scope>): <description>` format
- [ ] PR targets `develop`

---

## Success Criteria

"Bug fix is complete when: the failing test passes, all other tests still pass, the fix is on a branch targeting `develop`, and a PR is open."
