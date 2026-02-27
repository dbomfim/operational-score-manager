# Phase 2: Core Domain Modules

> **Branch:** `feat/phase-2/core-domain-modules`  
> **Status:** Complete  
> **Reference:** `new-architecture-starter.md` §9, `NEW_ARCHITECTURE_PLAN.md` §5–6

---

## Overview

Phase 2 implements the core domain tRPC routers and REST file upload endpoints. All procedures are protected and permission-gated where applicable.

---

## Deliverables

| # | Deliverable | Description | Status |
|---|-------------|-------------|--------|
| 1 | Prisma schema expansion | ScoringModel, Client, Category, Bucket, ShowroomEntry, reference entities | ✅ |
| 2 | models router | list, getById, getAudit, create, update, sync, syncOne | ✅ |
| 3 | clients router | list, getById | ✅ |
| 4 | categories router | list, listAll, create, update | ✅ |
| 5 | buckets router | list, listAll, getEditInfo, create, update | ✅ |
| 6 | showroom router | list, featured, reports | ✅ |
| 7 | lookup router | all, byEntity | ✅ |
| 8 | withPermission middleware | Permission-gate procedures by code | ✅ |
| 9 | File upload REST | POST /upload/template, POST /upload/validate-variables | ✅ |

---

## tRPC Procedures (Phase 2)

| Router | Procedure | Type | Permission |
|--------|-----------|------|------------|
| models | list | query | models:list |
| models | getById | query | models:read |
| models | getAudit | query | models:read |
| models | create | mutation | models:create |
| models | update | mutation | models:update |
| models | sync | mutation | models:sync |
| models | syncOne | mutation | models:sync |
| clients | list | query | clients:list |
| clients | getById | query | clients:read |
| categories | list | query | categories:list |
| categories | listAll | query | categories:list |
| categories | create | mutation | categories:create |
| categories | update | mutation | categories:update |
| buckets | list | query | buckets:list |
| buckets | listAll | query | buckets:list |
| buckets | getEditInfo | query | buckets:read |
| buckets | create | mutation | buckets:create |
| buckets | update | mutation | buckets:update |
| showroom | list | query | showroom:view |
| showroom | featured | query | showroom:view |
| showroom | reports | query | showroom:reports |
| lookup | all | query | (protected or public) |
| lookup | byEntity | query | (protected or public) |

---

## REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /upload/template | Upload model template |
| POST | /upload/validate-variables | Validate variable files |

---

## Dependency Order

```
packages/shared (schemas) → apps/api (routers)
```

---

## Notes

- **models.sync / syncOne:** Placeholder implementation (no external sync service yet).
- **models.getAudit:** Requires AuditLog model and audit entries for ScoringModel.
- **lookup:** May be public for dropdown population, or protected.
- **File upload:** Multipart/form-data; NestJS Multer or similar.
