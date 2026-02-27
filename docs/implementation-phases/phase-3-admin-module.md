# Phase 3: Admin Module

> **Branch:** `feat/phase-3/admin-module`  
> **Status:** In Progress  
> **Reference:** `new-architecture-starter.md` §9, `NEW_ARCHITECTURE_PLAN.md` §6, `ADMIN_MODULE.md`

---

## Overview

Phase 3 implements the full admin control plane: users, invitations, roles, permissions, generic entity CRUD, showroom management, analytics, and audit log. All procedures require `admin:access` or specific `admin.*` permissions.

---

## Deliverables

| # | Deliverable | Description | Status |
|---|-------------|-------------|--------|
| 1 | admin.stats | Dashboard KPIs (users, invitations, roles, etc.) | ✅ |
| 2 | admin.users.* | list, getById, updateStatus, assignRoles | ✅ |
| 3 | admin.invitations.* | list, create, resend, cancel, validate, accept | ✅ |
| 4 | admin.roles.* | list, getById, create, update, clone, getUsers | ✅ |
| 5 | admin.permissions.* | list, getById, create, update | ✅ |
| 6 | admin.entities.* | list, create, update for reference types | ✅ |
| 7 | admin.showroom.* | pool list, add, remove, reorder featured, config | ✅ |
| 8 | admin.analytics.* | event ingestion (analyticsIngest) | ✅ |
| 9 | admin.auditLog.* | list, getById | ✅ |
| 10 | UserInvitation model + email flow | Nodemailer/Resend placeholder | ⬜ |

---

## Prisma Additions

- UserInvitation model (already in schema from Phase 1 — verify)
- AnalyticsEvent model (if not present)

---

## Permission Requirements

| Procedure | Permission |
|-----------|------------|
| admin.stats | admin:access |
| admin.users.* | admin.users:list, admin.users:read, etc. |
| admin.invitations.* | admin.invitations.* |
| admin.roles.* | admin.roles.* |
| admin.permissions.* | admin.permissions.* |
| admin.entities.* | admin.entities.* |
| admin.showroom.* | admin.showroom.* |
| admin.analytics.* | admin.analytics.* |
| admin.auditLog.* | admin.audit.* |

---

## Notes

- **admin.invitations.validate** and **admin.invitations.accept** may be public (token-based).
- **Audit middleware:** Write AuditLog entry after every admin mutation.
- **Email:** Placeholder for Nodemailer/Resend; full flow in later iteration.
