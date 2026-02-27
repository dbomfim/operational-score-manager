# deploy — Deploy to Environment

## When to Use

Use when deploying to staging or production. This workflow validates prerequisites, runs migrations, and confirms the deployment.

**Invoke:** "Follow the deploy workflow to [staging|production]"

---

## Input Requirements

- Target environment: `staging` or `production`
- Confirm current branch

---

## Workflow Steps

**Step 1 — Validate branch**

| Environment | Required branch | Trigger |
|---|---|---|
| `staging` | `develop` | Push to `develop` (auto via CI) or manual |
| `production` | `main` | Push to `main` (auto via CI) or manual |

```bash
git branch --show-current   # must be 'develop' for staging, 'main' for production
git status                  # must be clean (no uncommitted changes)
git log --oneline -5        # confirm the commits to be deployed
```

**Step 2 — Run quality gate**

```bash
pnpm --filter @osm/api build
pnpm --filter @osm/backend test
pnpm --filter @osm/frontend test
pnpm --filter @osm/backend build
pnpm --filter @osm/frontend build
```

All checks must be green before proceeding.

**Step 3 — Run database migrations**

```bash
# staging
DATABASE_URL=<staging-db-url> pnpm --filter @osm/backend exec prisma migrate deploy

# production — extra confirmation required
echo "About to run migrations on PRODUCTION database. Confirm? (yes/no)"
DATABASE_URL=<prod-db-url> pnpm --filter @osm/backend exec prisma migrate deploy
```

**Step 4 — Build Docker images**

```bash
# Backend
docker build -t osm-backend:$(git rev-parse --short HEAD) ./apps/backend

# Frontend
docker build -t osm-frontend:$(git rev-parse --short HEAD) ./apps/frontend
```

**Step 5 — Deploy**

For staging (automatic via `staging.yml` GitHub Actions on push to `develop`):
```bash
git push origin develop
# CI handles: build → migrate → docker push → k8s rollout
```

For production (automatic via `production.yml` on push to `main`):
```bash
# Merge PR from develop to main
gh pr merge <pr-number> --squash --delete-branch
# CI handles: build → migrate → docker push → argo rollout canary → promote
```

**Step 6 — Verify deployment**

```bash
# Check backend health
curl https://<backend-url>/health

# Check frontend loads
curl -I https://<frontend-url>

# Check recent logs for errors
kubectl logs -l app=osm-backend --tail=50 -n osm
```

---

## Production-Only Safeguards

- **Never** push directly to `main` — always merge via PR
- **Always** run migrations before deploying new backend image
- **Argo Rollouts** — production uses canary deployment. Monitor error rate for 5 minutes before promoting to 100%
- If something goes wrong, Argo Rollouts can abort the canary and revert to the previous stable version

---

## Rollback

```bash
# Abort canary if error rate spikes
kubectl argo rollouts abort osm-backend -n osm

# Previous version is restored automatically by Argo Rollouts
# To also revert migrations (use with extreme caution):
DATABASE_URL=<prod-db-url> pnpm --filter @osm/backend exec prisma migrate resolve --rolled-back <migration-name>
```

---

## Verification Checklist

- [ ] Correct branch for target environment
- [ ] All tests pass
- [ ] Database migrations ran without errors
- [ ] Docker images built successfully
- [ ] Health check endpoint returns `{ status: "ok" }`
- [ ] Frontend loads without console errors
- [ ] No spike in backend error logs post-deploy

---

## Success Criteria

"Deployment is complete when the health check passes, frontend loads, and no errors appear in logs within 5 minutes of the rollout."
