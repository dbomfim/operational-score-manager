# OSM — Admin Module Specification

> **Companion file to `PROJECT_INSTRUCTIONS.md`.**
> This document specifies the full Admin module: user management, role/permission management, support entity CRUD, showroom management, analytics & usage reports, and audit logging.
> All schemas are in TypeScript-compatible syntax. Every section is framework-agnostic.

---

## Table of Contents

1. [Overview](#1-overview)
2. [TypeScript Types & Schemas](#2-typescript-types--schemas)
3. [Full Admin API Specification](#3-full-admin-api-specification)
4. [Admin Routes & Pages](#4-admin-routes--pages)
5. [Admin Permission Codes](#5-admin-permission-codes)
6. [Analytics Tracking Guide (Client-Side)](#6-analytics-tracking-guide-client-side)
7. [User Invitation Flow](#7-user-invitation-flow)
8. [Showroom Management Detail](#8-showroom-management-detail)
9. [Implementation Notes](#9-implementation-notes)

---

## 1. Overview

### What this module adds

The original OSM application had basic profile and resource management screens. This Admin module expands that into a full control plane:

| Area | Original OSM | New Admin Module |
|---|---|---|
| Users | No user list; roles assigned externally | Read-only mirror of all SSO users; role assignment; invitation system |
| Roles (Perfis) | Create/edit/list | Same + user count per role + role cloning |
| Permissions (Recursos) | Create/edit/list | Same + usage count + group by module |
| Support entities | Read-only dropdowns from `/lista` | Full CRUD for all 20 reference types |
| Showroom | `showroomBizDev` flag on model | Dedicated pool management + ordered featured list with drag-and-drop |
| Analytics | None | Event ingestion + 6 report types + admin dashboard KPIs |
| Audit log | None | Immutable log of every admin action |

### Guiding principles

- **Okta is the identity source of truth.** The backend only stores a local `User` record as a mirror (first-name, email, last-login). Passwords, MFA, and account creation happen in Okta.
- **Invitations never bypass Okta.** Sending an invite means sending a link that takes the user through Okta login. The invite just pre-registers their email so they land in the app with a default role.
- **Analytics are fire-and-forget.** Events never block the UI. If the analytics endpoint fails, it is silently ignored.
- **Audit log is server-side.** The backend writes an audit entry for every mutation that goes through an admin endpoint. The frontend never writes audit entries directly.
- **Showroom pool vs featured.** All models with `showroomBizDev: true` are in the pool. The featured list is a separate, ordered subset of the pool, managed exclusively in the admin.

---

## 2. TypeScript Types & Schemas

### 2.1 User (local mirror of Okta user)

```typescript
// User record — created/updated automatically on each Okta login.
// Never created manually. Read-only from the admin's perspective.
interface User {
  id: string;                     // Matches user_id from JWT (Okta sub)
  email: string;
  fullName: string;
  username: string;               // Usually the email prefix or Okta username
  isActive: boolean;              // Can be toggled by admin to block app access without touching Okta
  lastLoginAt: string | null;     // ISO 8601
  firstLoginAt: string | null;    // ISO 8601 — when they first appeared in the system
  createdAt: string;              // ISO 8601 — when local record was created
  updatedAt: string;              // ISO 8601
  perfis: PerfilSummary[];        // Assigned roles (summary, not full object)
  invitedBy: string | null;       // User ID of admin who sent the invite (if applicable)
  invitedAt: string | null;       // ISO 8601
}

// Lightweight role reference used inside User
interface PerfilSummary {
  _id: string;
  nome: string;
}

// Filter DTO for user list
interface FiltroUserDto {
  search?: string;          // Matches email, fullName, username
  isActive?: boolean;
  perfilId?: string;        // Filter users by role
  hasNoPerfil?: boolean;    // Users with no roles assigned
  invitedOnly?: boolean;    // Users who came via invitation
  dataInicio?: string;      // firstLoginAt range start
  dataFim?: string;         // firstLoginAt range end
}
```

---

### 2.2 User Invitation

```typescript
type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';

interface UserInvitation {
  id: string;
  email: string;                  // Target email address
  invitedBy: string;              // Admin user ID
  invitedByName: string;          // Admin user full name
  perfilIds: string[];            // Roles to assign on first login
  status: InvitationStatus;
  token: string;                  // Opaque invite token (URL-safe, single-use)
  message: string | null;         // Optional personal message included in the email
  createdAt: string;              // ISO 8601
  expiresAt: string;              // ISO 8601 — default 7 days from creation
  acceptedAt: string | null;      // ISO 8601 — when the user first logged in via this invite
}

interface CreateInvitationDto {
  email: string;
  perfilIds: string[];            // Must be valid perfil _id values
  message?: string;               // Optional message for the email body
  expirationDays?: number;        // Default: 7. Max: 30.
}

interface FiltroInvitationDto {
  email?: string;
  status?: InvitationStatus;
  invitedBy?: string;
  dataInicio?: string;
  dataFim?: string;
}
```

---

### 2.3 Audit Log

```typescript
type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ACTIVATE'
  | 'DEACTIVATE'
  | 'ASSIGN_ROLE'
  | 'REMOVE_ROLE'
  | 'SEND_INVITATION'
  | 'CANCEL_INVITATION'
  | 'REORDER_SHOWROOM'
  | 'ADD_TO_SHOWROOM'
  | 'REMOVE_FROM_SHOWROOM'
  | 'LOGIN'
  | 'LOGOUT';

type AuditEntityType =
  | 'USER'
  | 'PERFIL'
  | 'RECURSO'
  | 'MODELO'
  | 'FATURAMENTO'
  | 'TRANSACAO'
  | 'CATEGORIA'
  | 'BALDE'
  | 'SHOWROOM_ENTRY'
  | 'SHOWROOM_FEATURED'
  | 'INVITATION'
  | 'STATUS_MODELO'
  | 'TIPO_PRODUTO'
  | 'TIPO_EXECUCAO'
  | 'TIPO_COBRANCA'
  | 'FREQUENCIA_EXECUCAO'
  | 'AMBIENTE_IMPLANTACAO'
  | 'AREA_PROPRIETARIA'
  | 'PUBLICO'
  | 'BUREAU'
  | 'PLATAFORMA'
  | 'BOOK'
  | 'CANAL'
  | 'DETALHE_CANAL'
  | 'PM_RESPONSAVEL'
  | 'PERFIL_PUBLICO'
  | 'UNIDADE_NEGOCIO'
  | 'MEIO_ACESSO'
  | 'MESES'
  | 'FINALIDADE'
  | 'CLIENTE';

interface AuditFieldChange {
  field: string;                  // Name of the changed field
  previousValue: unknown;         // Value before change (null for CREATE)
  newValue: unknown;              // Value after change (null for DELETE)
}

interface AuditLogEntry {
  id: string;
  actorId: string;                // User ID of who performed the action
  actorName: string;              // Display name of who performed the action
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;               // ID of the affected entity
  entityLabel: string;            // Human-readable identifier (e.g. model name, user email)
  changes: AuditFieldChange[];    // Empty for DELETE/LOGIN/LOGOUT
  ipAddress: string;              // Server-side resolved
  userAgent: string;
  timestamp: string;              // ISO 8601
  metadata: Record<string, unknown> | null;  // Extra context if needed
}

interface FiltroAuditLogDto {
  actorId?: string;
  action?: AuditAction;
  entityType?: AuditEntityType;
  entityId?: string;
  dataInicio?: string;            // ISO 8601
  dataFim?: string;               // ISO 8601
  search?: string;                // Full-text across actorName, entityLabel
}
```

---

### 2.4 Analytics Events

```typescript
// All possible event types the client can emit
type AnalyticsEventType =
  | 'PAGE_VIEW'           // User navigated to a page
  | 'SESSION_START'       // App loaded and user is authenticated
  | 'SESSION_END'         // User logged out or session timed out
  | 'FEATURE_USED'        // User interacted with a specific named feature
  | 'SEARCH'              // User performed a search/filter action
  | 'EXPORT'              // User exported data (CSV, PDF, etc.)
  | 'FORM_SUBMITTED'      // User submitted a create/edit form
  | 'FILTER_APPLIED'      // User applied filters to a list
  | 'MODEL_VIEWED'        // User opened a model detail/edit page
  | 'SHOWROOM_VIEWED'     // User viewed the showroom
  | 'INVITE_SENT'         // Admin sent a user invitation
  | 'BUTTON_CLICKED'      // Generic CTA / button interaction
  | 'ERROR_ENCOUNTERED';  // Frontend error displayed to user

// A single tracked event — sent from client to backend
interface AnalyticsEvent {
  // Identity (server fills sessionId if missing)
  sessionId: string;              // UUID generated client-side at session start, stored in sessionStorage
  userId: string;                 // From JWT user_id claim

  // Event context
  eventType: AnalyticsEventType;
  page: string;                   // Current route path, e.g. "/modelos/inventario"
  referrer: string | null;        // Previous route path (for navigation tracking)

  // Optional entity context
  entityType?: AuditEntityType;   // e.g. "MODELO"
  entityId?: string;              // ID of entity being viewed/edited

  // Feature/action detail
  featureName?: string;           // e.g. "model_export_csv", "filter_panel_open"
  actionLabel?: string;           // Human-readable label of button/action

  // Performance
  duration?: number;              // Milliseconds (for PAGE_VIEW: time on page; for SESSION_END: total session time)
  loadTime?: number;              // Milliseconds for initial page load (only on PAGE_VIEW)

  // Context
  metadata?: Record<string, string | number | boolean>;  // Max 10 keys, no PII values

  // Timestamps
  timestamp: string;              // ISO 8601 — client-side event time
}

// Batch payload — client sends multiple events in one request
interface AnalyticsEventBatch {
  events: AnalyticsEvent[];       // Max 50 events per batch
}
```

---

### 2.5 Analytics Report Types

```typescript
// Shared filter for all analytics report endpoints
interface AnalyticsReportFilter {
  dataInicio: string;             // ISO 8601 — required
  dataFim: string;                // ISO 8601 — required
  userId?: string;                // Narrow to a single user
  page?: string;                  // Narrow to a specific route
  entityType?: AuditEntityType;
  granularity?: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH'; // Default: DAY
}

// Page Views Report
interface PageViewDataPoint {
  period: string;                 // ISO 8601 date/hour string based on granularity
  page: string;                   // Route path
  views: number;
  uniqueUsers: number;
  avgDuration: number;            // Average time on page in ms
}

interface PageViewsReport {
  filter: AnalyticsReportFilter;
  totalViews: number;
  totalUniqueUsers: number;
  topPages: { page: string; views: number; uniqueUsers: number }[];
  timeSeries: PageViewDataPoint[];
}

// Feature Usage Report
interface FeatureUsageDataPoint {
  featureName: string;
  usageCount: number;
  uniqueUsers: number;
  lastUsedAt: string;             // ISO 8601
}

interface FeatureUsageReport {
  filter: AnalyticsReportFilter;
  totalEvents: number;
  features: FeatureUsageDataPoint[];
}

// User Behavior Report
interface UserBehaviorSummary {
  userId: string;
  userFullName: string;
  userEmail: string;
  totalSessions: number;
  totalPageViews: number;
  totalActions: number;
  avgSessionDurationMs: number;
  mostVisitedPage: string;
  lastActiveAt: string;           // ISO 8601
  topFeatures: string[];          // Top 3 feature names
}

interface UserBehaviorReport {
  filter: AnalyticsReportFilter;
  users: UserBehaviorSummary[];
}

// Session Report
interface SessionDataPoint {
  sessionId: string;
  userId: string;
  userFullName: string;
  startedAt: string;              // ISO 8601
  endedAt: string | null;         // ISO 8601 — null if session still open
  durationMs: number | null;
  pageViewCount: number;
  actionCount: number;
  entryPage: string;              // First page visited
  exitPage: string | null;        // Last page before session end
}

interface SessionReport {
  filter: AnalyticsReportFilter;
  totalSessions: number;
  avgSessionDurationMs: number;
  sessions: SessionDataPoint[];
}

// Search/Export Report
interface SearchExportDataPoint {
  period: string;
  searches: number;
  exports: number;
  topSearchTerms: string[];
}

interface SearchExportReport {
  filter: AnalyticsReportFilter;
  timeSeries: SearchExportDataPoint[];
}
```

---

### 2.6 Admin Dashboard Stats

```typescript
// Overview KPIs shown on the admin dashboard home
interface AdminStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    loggedInLast30Days: number;
    pendingInvitations: number;
  };
  roles: {
    total: number;
    totalWithNoUsers: number;     // Orphaned roles
  };
  resources: {
    total: number;
  };
  models: {
    total: number;
    active: number;
    inShowroomPool: number;
    featured: number;
  };
  analytics: {
    pageViewsToday: number;
    pageViewsLast7Days: number;
    activeUsersToday: number;
    mostVisitedPageToday: string;
  };
  auditLog: {
    actionsToday: number;
    actionsLast7Days: number;
    lastActionAt: string | null;  // ISO 8601
  };
}
```

---

### 2.7 Showroom Management

```typescript
// A model that has been added to the showroom pool.
// The pool is the full set of models eligible for the showroom.
// Source of truth: a model is in the pool if showroomBizDev = true OR it has been explicitly added here.
interface ShowroomEntry {
  id: string;                     // Internal record ID
  modeloId: string;               // References Modelo._id
  modeloNome: string;             // Denormalized for display
  modeloStatus: string;           // Denormalized status
  addedAt: string;                // ISO 8601
  addedBy: string;                // Admin user ID
  addedByName: string;
  isFeatured: boolean;            // True if also in the featured list
  featuredPosition: number | null; // 1-based position; null if not featured
}

// A model in the ordered featured list (front of showroom).
interface ShowroomFeatured {
  id: string;                     // Internal record ID
  modeloId: string;               // References Modelo._id
  modeloNome: string;             // Denormalized
  modeloStatus: string;           // Denormalized
  position: number;               // 1-based display order (1 = first/top)
  addedAt: string;                // ISO 8601
  addedBy: string;                // Admin user ID
  addedByName: string;
  pinnedUntil: string | null;     // Optional expiry for the featured slot (ISO 8601)
}

// Global showroom configuration
interface ShowroomConfig {
  maxFeatured: number;            // Max number of models allowed in featured list (default: 5)
  autoSyncFromFlag: boolean;      // If true, models with showroomBizDev=true auto-join the pool
  poolTitle: string;              // Display label for the showroom pool section
  featuredTitle: string;          // Display label for the featured section
  updatedAt: string;              // ISO 8601
  updatedBy: string;              // Admin user ID
}

// DTO for adding a model to the featured list
interface AddShowroomFeaturedDto {
  modeloId: string;
  position?: number;              // If omitted, appended at the end
  pinnedUntil?: string;           // ISO 8601 — optional expiry
}

// DTO for reordering the entire featured list (drag-and-drop)
interface ReorderShowroomFeaturedDto {
  orderedModeloIds: string[];     // Full ordered list of modeloIds (position = array index + 1)
}
```

---

### 2.8 Support Entity DTOs (Generic CRUD)

All 20 reference/lookup entities follow the same generic shape. Each has:
- A list endpoint (paginated + flat list variant)
- A get-by-id endpoint
- A create endpoint
- An update endpoint
- A soft-delete endpoint (sets `isActive: false` — never hard-deletes)

```typescript
// Generic response shape for all support entities
interface SupportEntity {
  _id: string;
  descricao: string;
  isActive: boolean;              // Soft-delete flag
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}

// Generic create/update DTO for entities with only descricao
interface SupportEntityDto {
  descricao: string;
}

// ------- Entity-specific extensions -------

// TipoProduto — adds color
interface TipoProdutoSupportEntity extends SupportEntity {
  color: string;                  // CSS color string e.g. "#FF5722"
}
interface TipoProdutoDto {
  descricao: string;
  color: string;
}

// Book — adds nome
interface BookSupportEntity extends SupportEntity {
  nome: string;
}
interface BookDto {
  descricao: string;
  nome: string;
}

// Faturamento — adds codigo
interface FaturamentoSupportEntity extends SupportEntity {
  codigo: number;
}
interface FaturamentoDto {
  descricao: string;
  codigo: number;
}

// Cliente — has its own shape
interface ClienteSupportEntity {
  _id: string;
  nome: string;
  cnpj: string;                   // Brazilian CNPJ, 14 digits, formatted
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
interface ClienteDto {
  nome: string;
  cnpj: string;                   // Raw 14-digit string or formatted
}

// All other entities (use SupportEntityDto for create/update):
// StatusModelo, TipoExecucao, TipoCobranca, FrequenciaExecucao,
// AmbienteImplantacao, AreaProprietaria, Publico, Bureau, Plataforma,
// Canal, DetalheCanal, PmResponsavel, PerfilPublico, UnidadeNegocio,
// MeioAcesso, Meses, Finalidade
```

---

## 3. Full Admin tRPC Procedure Specification

All admin procedures live under the `admin` namespace of the tRPC router, mounted at `/trpc` on the backend. Auth is handled by the tRPC context builder (JWT decoded via `jose`; `ctx.userResources` populated from the IAM token). The `withPermission(code)` middleware checks `ctx.userResources.includes(code)`.

**Standard error codes:**
| Code | Meaning |
|---|---|
| `UNAUTHORIZED` | No valid JWT in request |
| `FORBIDDEN` | JWT valid but missing required permission |
| `NOT_FOUND` | Entity not found |
| `BAD_REQUEST` | Zod input validation failure |
| `UNPROCESSABLE_CONTENT` | Business rule violation (e.g. `maxFeatured` exceeded) |

---

### 3.1 Admin Dashboard

#### `admin.stats`
**Type:** `query`
**Permission:** `ADMIN_DASHBOARD`
**Input:** none

**Returns:** `AdminStats`

---

### 3.2 User Management

#### `admin.users.list`
**Type:** `query`
**Permission:** `ADMIN_USUARIOS_VIEW`
**Input:**
```typescript
z.object({
  page: z.number().min(1).default(1),
  size: z.number().min(1).max(100).default(20),
  search: z.string().optional(),        // Matches name or email (case-insensitive)
  isActive: z.boolean().optional(),
  perfilId: z.string().optional(),      // Filter by assigned role
})
```
**Returns:** `PaginatedResponse<User>`

---

#### `admin.users.getById`
**Type:** `query`
**Permission:** `ADMIN_USUARIOS_VIEW`
**Input:**
```typescript
z.object({ id: z.string() })
```
**Returns:** `User` (with full `perfis` array populated)

---

#### `admin.users.updateStatus`
**Type:** `mutation`
**Permission:** `ADMIN_USUARIOS_MANAGE`
**Input:**
```typescript
z.object({
  id: z.string(),
  isActive: z.boolean(),
  reason: z.string().optional(),        // Written to audit log
})
```
**Returns:** `User`

**Notes:** Does not touch Okta; blocks/allows app access only.

---

#### `admin.users.assignPerfis`
**Type:** `mutation`
**Permission:** `ADMIN_USUARIOS_MANAGE`
**Input:**
```typescript
z.object({
  id: z.string(),
  perfilIds: z.array(z.string()),       // Full replacement — empty array removes all roles
})
```
**Returns:** `User`

---

#### `admin.users.addPerfil`
**Type:** `mutation`
**Permission:** `ADMIN_USUARIOS_MANAGE`
**Input:**
```typescript
z.object({ id: z.string(), perfilId: z.string() })
```
**Returns:** `User`

---

#### `admin.users.removePerfil`
**Type:** `mutation`
**Permission:** `ADMIN_USUARIOS_MANAGE`
**Input:**
```typescript
z.object({ id: z.string(), perfilId: z.string() })
```
**Returns:** `User`

---

### 3.3 Invitations

#### `admin.invitations.create`
**Type:** `mutation`
**Permission:** `ADMIN_USUARIOS_MANAGE`
**Input:**
```typescript
z.object({
  email: z.string().email(),
  nome: z.string().min(2),
  perfilIds: z.array(z.string()).min(1), // Roles to assign on acceptance
  message: z.string().optional(),        // Custom message in the invite email
})
```
**Returns:** `UserInvitation`

**Side effects:**
- Sends invitation email to the target address.
- Invite link format: `{APP_URL}/aceitar-convite?token=<token>`
- Clicking the link redirects the user to Okta for authentication.
- On successful Okta login, the auth callback creates the local `User` record (if it doesn't exist) and assigns the specified roles.

---

#### `admin.invitations.list`
**Type:** `query`
**Permission:** `ADMIN_USUARIOS_MANAGE`
**Input:**
```typescript
z.object({
  page: z.number().min(1).default(1),
  size: z.number().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED']).optional(),
  email: z.string().optional(),
})
```
**Returns:** `PaginatedResponse<UserInvitation>`

---

#### `admin.invitations.getById`
**Type:** `query`
**Permission:** `ADMIN_USUARIOS_MANAGE`
**Input:**
```typescript
z.object({ id: z.string() })
```
**Returns:** `UserInvitation`

---

#### `admin.invitations.cancel`
**Type:** `mutation`
**Permission:** `ADMIN_USUARIOS_MANAGE`
**Input:**
```typescript
z.object({ id: z.string() })
```
**Returns:** `UserInvitation` (with `status: 'CANCELLED'`)

---

#### `admin.invitations.resend`
**Type:** `mutation`
**Permission:** `ADMIN_USUARIOS_MANAGE`
**Input:**
```typescript
z.object({ id: z.string() })
```
**Returns:** `UserInvitation`

**Notes:** Resets expiry. Reuses the existing token if still valid; generates a new token otherwise.

---

#### `admin.invitations.validate`
**Type:** `query`
**Permission:** None (public — called by `/aceitar-convite` page before Okta redirect)
**Input:**
```typescript
z.object({ token: z.string() })
```
**Returns:**
```typescript
interface InvitationValidation {
  valid: boolean;
  email: string | null;
  nome: string | null;
  expiresAt: string | null;         // ISO 8601
}
```

---

#### `admin.invitations.accept`
**Type:** `mutation`
**Permission:** None (called by auth callback after successful Okta login via invitation link)
**Input:**
```typescript
z.object({
  token: z.string(),
  oktaUserId: z.string(),
})
```
**Returns:** `User` (newly created or updated local user record with roles assigned)

---

### 3.4 Role Management (Perfis) — Extended

#### `admin.perfis.list`
**Type:** `query`
**Permission:** `ADMIN_PERFIS_VIEW`
**Input:**
```typescript
z.object({
  page: z.number().min(1).default(1),
  size: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
})
```
**Returns:** `PaginatedResponse<PerfilWithStats>`

```typescript
interface PerfilWithStats {
  _id: string;
  nome: string;
  recursos: Recurso[];
  userCount: number;                  // How many active users have this role
  createdAt: string;
  updatedAt: string;
}
```

---

#### `admin.perfis.getById`
**Type:** `query`
**Permission:** `ADMIN_PERFIS_VIEW`
**Input:**
```typescript
z.object({ id: z.string() })
```
**Returns:** `PerfilWithStats`

---

#### `admin.perfis.create`
**Type:** `mutation`
**Permission:** `ADMIN_PERFIS_MANAGE`
**Input:**
```typescript
z.object({
  nome: z.string().min(2),
  recursos: z.array(z.object({ _id: z.string() })),
})
```
**Returns:** `PerfilWithStats`

---

#### `admin.perfis.update`
**Type:** `mutation`
**Permission:** `ADMIN_PERFIS_MANAGE`
**Input:**
```typescript
z.object({
  id: z.string(),
  nome: z.string().min(2),
  recursos: z.array(z.object({ _id: z.string() })),
})
```
**Returns:** `PerfilWithStats`

---

#### `admin.perfis.delete`
**Type:** `mutation`
**Permission:** `ADMIN_PERFIS_MANAGE`
**Input:**
```typescript
z.object({ id: z.string() })
```
**Returns:** `{ message: string }`

**Business rule:** Throws `BAD_REQUEST` if any active user currently has this role assigned.

---

#### `admin.perfis.clone`
**Type:** `mutation`
**Permission:** `ADMIN_PERFIS_MANAGE`
**Input:**
```typescript
z.object({
  id: z.string(),           // Source role to clone
  nome: z.string().min(2),  // Name for the new role
})
```
**Returns:** `PerfilWithStats`

---

#### `admin.perfis.getUsers`
**Type:** `query`
**Permission:** `ADMIN_PERFIS_VIEW`
**Input:**
```typescript
z.object({
  id: z.string(),
  page: z.number().min(1).default(1),
  size: z.number().min(1).max(100).default(20),
})
```
**Returns:** `PaginatedResponse<User>`

---

### 3.5 Permission Management (Recursos) — Extended

#### `admin.recursos.list`
**Type:** `query`
**Permission:** `ADMIN_RECURSOS_VIEW`
**Input:**
```typescript
z.object({
  page: z.number().min(1).default(1),
  size: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  module: z.string().optional(),    // Filter by logical module group
})
```
**Returns:** `PaginatedResponse<RecursoWithStats>`

```typescript
interface RecursoWithStats {
  _id: string;
  nome: string;                     // Permission code, e.g. "TELA_CONSULTA_MODELO"
  descricao: string;
  module: string;                   // Logical module grouping, e.g. "MODELOS", "ADMIN"
  perfilCount: number;              // How many roles have this permission
  createdAt: string;
  updatedAt: string;
}
```

---

#### `admin.recursos.getById`
**Type:** `query`
**Permission:** `ADMIN_RECURSOS_VIEW`
**Input:**
```typescript
z.object({ id: z.string() })
```
**Returns:** `RecursoWithStats`

---

#### `admin.recursos.create`
**Type:** `mutation`
**Permission:** `ADMIN_RECURSOS_MANAGE`
**Input:**
```typescript
z.object({
  nome: z.string().regex(/^[A-Z_]+$/, 'Must be UPPER_SNAKE_CASE'),
  descricao: z.string().min(4),
  module: z.string().min(2),
})
```
**Returns:** `RecursoWithStats`

---

#### `admin.recursos.update`
**Type:** `mutation`
**Permission:** `ADMIN_RECURSOS_MANAGE`
**Input:**
```typescript
z.object({
  id: z.string(),
  nome: z.string().regex(/^[A-Z_]+$/),
  descricao: z.string().min(4),
  module: z.string().min(2),
})
```
**Returns:** `RecursoWithStats`

---

#### `admin.recursos.delete`
**Type:** `mutation`
**Permission:** `ADMIN_RECURSOS_MANAGE`
**Input:**
```typescript
z.object({ id: z.string() })
```
**Returns:** `{ message: string }`

**Business rule:** Throws `BAD_REQUEST` if any role currently uses this permission.

---

### 3.6 Support Entity CRUD

All 20 reference entities are managed through the `admin.entities` sub-router. The `entity` discriminator field tells the backend which table to operate on.

| Entity | `entity` value |
|---|---|
| StatusModelo | `"status-modelo"` |
| TipoProduto | `"tipo-produto"` |
| TipoExecucao | `"tipo-execucao"` |
| TipoCobranca | `"tipo-cobranca"` |
| FrequenciaExecucao | `"frequencia-execucao"` |
| AmbienteImplantacao | `"ambiente-implantacao"` |
| AreaProprietaria | `"area-proprietaria"` |
| Publico | `"publico"` |
| Bureau | `"bureau"` |
| Plataforma | `"plataforma"` |
| Book | `"book"` |
| Canal | `"canal"` |
| DetalheCanal | `"detalhe-canal"` |
| PmResponsavel | `"pm-responsavel"` |
| PerfilPublico | `"perfil-publico"` |
| UnidadeNegocio | `"unidade-negocio"` |
| MeioAcesso | `"meio-acesso"` |
| Meses | `"meses"` |
| Finalidade | `"finalidade"` |
| Cliente | `"cliente"` |

```typescript
// Shared Zod discriminator (used in all admin.entities procedures)
const EntityType = z.enum([
  'status-modelo', 'tipo-produto', 'tipo-execucao', 'tipo-cobranca',
  'frequencia-execucao', 'ambiente-implantacao', 'area-proprietaria',
  'publico', 'bureau', 'plataforma', 'book', 'canal', 'detalhe-canal',
  'pm-responsavel', 'perfil-publico', 'unidade-negocio', 'meio-acesso',
  'meses', 'finalidade', 'cliente',
]);
```

---

#### `admin.entities.list`
**Type:** `query`
**Permission:** `ADMIN_ENTIDADES_VIEW`
**Input:**
```typescript
z.object({
  entity: EntityType,
  page: z.number().min(1).default(1),
  size: z.number().min(1).max(100).default(20),
  search: z.string().optional(),    // Matches `descricao` (case-insensitive)
  isActive: z.boolean().optional(), // Omit = return all; true/false = filter
})
```
**Returns:** `PaginatedResponse<SupportEntity>` (entity-specific extension for `tipo-produto`, `book`, `cliente`)

---

#### `admin.entities.flatList`
**Type:** `query`
**Permission:** `ADMIN_ENTIDADES_VIEW`
**Input:**
```typescript
z.object({
  entity: EntityType,
  includeInactive: z.boolean().default(false),
})
```
**Returns:** `SupportEntity[]`

**Notes:** No pagination. Used to populate dropdowns. `includeInactive: false` returns only `isActive: true` records.

---

#### `admin.entities.getById`
**Type:** `query`
**Permission:** `ADMIN_ENTIDADES_VIEW`
**Input:**
```typescript
z.object({ entity: EntityType, id: z.string() })
```
**Returns:** `SupportEntity`

---

#### `admin.entities.create`
**Type:** `mutation`
**Permission:** `ADMIN_ENTIDADES_MANAGE`
**Input:**
```typescript
z.object({
  entity: EntityType,
  data: SupportEntityDtoSchema,     // Entity-specific union — see Section 2.8
})
```
**Returns:** `SupportEntity`

---

#### `admin.entities.update`
**Type:** `mutation`
**Permission:** `ADMIN_ENTIDADES_MANAGE`
**Input:**
```typescript
z.object({
  entity: EntityType,
  id: z.string(),
  data: SupportEntityDtoSchema,
})
```
**Returns:** `SupportEntity`

---

#### `admin.entities.updateStatus`
**Type:** `mutation`
**Permission:** `ADMIN_ENTIDADES_MANAGE`
**Input:**
```typescript
z.object({
  entity: EntityType,
  id: z.string(),
  isActive: z.boolean(),
})
```
**Returns:** `SupportEntity`

**Notes:** Soft-delete (`isActive: false`) or restore (`isActive: true`). Never hard-deletes.

---

### 3.7 Showroom Management

#### `admin.showroom.getPool`
**Type:** `query`
**Permission:** `ADMIN_SHOWROOM_VIEW`
**Input:**
```typescript
z.object({
  page: z.number().min(1).default(1),
  size: z.number().min(1).max(100).default(20),
  search: z.string().optional(),        // Matches model name
  isFeatured: z.boolean().optional(),   // Filter to featured-only or non-featured
})
```
**Returns:** `PaginatedResponse<ShowroomEntry>`

---

#### `admin.showroom.addToPool`
**Type:** `mutation`
**Permission:** `ADMIN_SHOWROOM_MANAGE`
**Input:**
```typescript
z.object({ modeloId: z.string() })
```
**Returns:** `ShowroomEntry`

**Business rule:** Throws `BAD_REQUEST` if the model's status is not `ATIVO`.

---

#### `admin.showroom.removeFromPool`
**Type:** `mutation`
**Permission:** `ADMIN_SHOWROOM_MANAGE`
**Input:**
```typescript
z.object({ modeloId: z.string() })
```
**Returns:** `{ message: string }`

**Notes:** Also removes from featured list if present.

---

#### `admin.showroom.getFeatured`
**Type:** `query`
**Permission:** `ADMIN_SHOWROOM_VIEW`
**Input:** none

**Returns:** `ShowroomFeatured[]` (sorted by `position` ascending; position 1 = first/top)

---

#### `admin.showroom.addFeatured`
**Type:** `mutation`
**Permission:** `ADMIN_SHOWROOM_MANAGE`
**Input:**
```typescript
z.object({
  modeloId: z.string(),
  position: z.number().min(1).optional(),       // If omitted, appended at the end
  pinnedUntil: z.string().datetime().optional(), // Optional expiry for the featured slot
})
```
**Returns:** `ShowroomFeatured`

**Business rule:** Throws `UNPROCESSABLE_CONTENT` if `maxFeatured` is already reached. The model must already be in the pool.

---

#### `admin.showroom.reorder`
**Type:** `mutation`
**Permission:** `ADMIN_SHOWROOM_MANAGE`
**Input:**
```typescript
z.object({
  orderedModeloIds: z.array(z.string()).min(1),
  // Complete ordered list — position = array index + 1
})
```
**Returns:** `ShowroomFeatured[]` (the new full ordered list)

---

#### `admin.showroom.removeFeatured`
**Type:** `mutation`
**Permission:** `ADMIN_SHOWROOM_MANAGE`
**Input:**
```typescript
z.object({ modeloId: z.string() })
```
**Returns:** `{ message: string }`

**Notes:** Removes from featured list only; model stays in the pool.

---

#### `admin.showroom.getConfig`
**Type:** `query`
**Permission:** `ADMIN_SHOWROOM_VIEW`
**Input:** none

**Returns:** `ShowroomConfig`

---

#### `admin.showroom.updateConfig`
**Type:** `mutation`
**Permission:** `ADMIN_SHOWROOM_MANAGE`
**Input:**
```typescript
z.object({
  maxFeatured: z.number().min(1).max(20).optional(),
  autoSyncFromFlag: z.boolean().optional(),
  poolTitle: z.string().optional(),
  featuredTitle: z.string().optional(),
})
```
**Returns:** `ShowroomConfig`

---

### 3.8 Analytics

#### `admin.analytics.ingestEvents`
**Type:** `mutation`
**Permission:** None (any authenticated user; JWT required but no specific `recurso` check)
**Input:**
```typescript
z.object({
  events: z.array(AnalyticsEventSchema).min(1).max(50),
  sessionId: z.string(),
  clientTimestamp: z.string().datetime(),
})
```
**Returns:** `{ received: number }`

**Behavior:**
- Non-blocking: always returns quickly; processing is asynchronous.
- Malformed individual events are silently dropped; valid events are persisted.
- Batches exceeding 50 events throw `BAD_REQUEST`.

---

#### `admin.analytics.pageViewsReport`
**Type:** `query`
**Permission:** `ADMIN_ANALYTICS_VIEW`
**Input:**
```typescript
z.object({
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  userIds: z.array(z.string()).optional(),
  pages: z.array(z.string()).optional(),
})
```
**Returns:** `PageViewsReport`

---

#### `admin.analytics.featureUsageReport`
**Type:** `query`
**Permission:** `ADMIN_ANALYTICS_VIEW`
**Input:** Same as `pageViewsReport`

**Returns:** `FeatureUsageReport`

---

#### `admin.analytics.userBehaviorReport`
**Type:** `query`
**Permission:** `ADMIN_ANALYTICS_VIEW`
**Input:**
```typescript
z.object({
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime(),
  page: z.number().min(1).default(1),
  size: z.number().min(1).max(100).default(20),
})
```
**Returns:** `UserBehaviorReport`

---

#### `admin.analytics.sessionsReport`
**Type:** `query`
**Permission:** `ADMIN_ANALYTICS_VIEW`
**Input:**
```typescript
z.object({
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime(),
  page: z.number().min(1).default(1),
  size: z.number().min(1).max(100).default(20),
})
```
**Returns:** `SessionReport`

---

#### `admin.analytics.searchExportReport`
**Type:** `query`
**Permission:** `ADMIN_ANALYTICS_VIEW`
**Input:** Same filter as `pageViewsReport`

**Returns:** `SearchExportReport`

---

#### `admin.analytics.topPages`
**Type:** `query`
**Permission:** `ADMIN_ANALYTICS_VIEW`
**Input:**
```typescript
z.object({
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime(),
  limit: z.number().min(1).max(50).default(10),
})
```
**Returns:**
```typescript
interface TopPage {
  page: string;
  views: number;
  uniqueUsers: number;
  avgDurationMs: number;
}
type TopPagesResponse = TopPage[];
```

---

#### `admin.analytics.topUsers`
**Type:** `query`
**Permission:** `ADMIN_ANALYTICS_VIEW`
**Input:**
```typescript
z.object({
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime(),
  limit: z.number().min(1).max(50).default(10),
})
```
**Returns:**
```typescript
interface TopUser {
  userId: string;
  userFullName: string;
  userEmail: string;
  totalEvents: number;
  totalPageViews: number;
  totalSessions: number;
}
type TopUsersResponse = TopUser[];
```

---

### 3.9 Audit Log

#### `admin.auditLog.list`
**Type:** `query`
**Permission:** `ADMIN_AUDITORIA_VIEW`
**Input:**
```typescript
z.object({
  page: z.number().min(1).default(1),
  size: z.number().min(1).max(100).default(20),
  userId: z.string().optional(),
  action: z.string().optional(),        // e.g. "UPDATE_USER_STATUS", "CREATE_PERFIL"
  entityType: z.string().optional(),    // e.g. "User", "Modelo", "ShowroomFeatured"
  entityId: z.string().optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
})
```
**Returns:** `PaginatedResponse<AuditLogEntry>` (most recent first)

---

#### `admin.auditLog.getById`
**Type:** `query`
**Permission:** `ADMIN_AUDITORIA_VIEW`
**Input:**
```typescript
z.object({ id: z.string() })
```
**Returns:** `AuditLogEntry` (with full `changes` array)

---

#### `admin.auditLog.export`
**Type:** `query`
**Permission:** `ADMIN_AUDITORIA_VIEW`
**Input:** Same filters as `admin.auditLog.list`, minus pagination fields

**Returns:** `{ downloadUrl: string; expiresAt: string }`

**Notes:** The backend generates a signed URL for a temporary CSV file (S3 in production, local filesystem in development). URL expires after 5 minutes.

---

## 4. Admin Routes & Pages

All admin routes are under the `/admin` path prefix and require the `SUPER_ADMIN` permission to even reach the admin layout. Sub-pages have additional granular permissions.

### Layout

The admin section uses a **dedicated sidebar layout** separate from the main application layout. The sidebar groups pages by sub-module.

---

### Route Table

| Path | Page Component | Permission | UI Description |
|---|---|---|---|
| `/admin` | `AdminDashboardPage` | `ADMIN_DASHBOARD` | KPI cards: user counts, model counts, page views today, last audit action. Quick-links to each sub-section. |
| `/admin/usuarios` | `UserListPage` | `ADMIN_USUARIOS_VIEW` | Table of all users; columns: name, email, roles (chips), status, last login, first login. Filters: search, role, status. Row actions: view, assign roles, activate/deactivate. |
| `/admin/usuarios/:id` | `UserDetailPage` | `ADMIN_USUARIOS_VIEW` | User profile card (read-only from Okta). Role chips with add/remove. Login history list. Audit log entries for this user. |
| `/admin/convites` | `InvitationListPage` | `ADMIN_USUARIOS_MANAGE` | Table of all invitations; columns: email, status badge, invited by, created, expires, accepted. Actions: resend, cancel. |
| `/admin/convites/novo` | `InvitationCreatePage` | `ADMIN_USUARIOS_MANAGE` | Form: email (with CNPJ auto-check against existing users), role multi-select, optional personal message, expiration days. Preview of the email that will be sent. |
| `/admin/perfis` | `ProfileListPage` | `ADMIN_PERFIS_VIEW` | Table: role name, number of permissions, number of users. Actions: edit, clone, delete (if no users). |
| `/admin/perfis/novo` | `ProfileCreatePage` | `ADMIN_PERFIS_MANAGE` | Form: name, permission multi-select grouped by module. |
| `/admin/perfis/:id` | `ProfileEditPage` | `ADMIN_PERFIS_MANAGE` | Edit form + list of users with this role. |
| `/admin/recursos` | `ResourceListPage` | `ADMIN_RECURSOS_VIEW` | Table: code, description, module tag, role count. Actions: edit, delete (if no roles). |
| `/admin/recursos/novo` | `ResourceCreatePage` | `ADMIN_RECURSOS_MANAGE` | Form: name (code), description, module grouping. |
| `/admin/recursos/:id` | `ResourceEditPage` | `ADMIN_RECURSOS_MANAGE` | Edit form + list of roles that include this permission. |
| `/admin/entidades` | `EntityHubPage` | `ADMIN_ENTIDADES_VIEW` | Grid of all 20 support entity types as cards. Click a card to go to that entity's list. |
| `/admin/entidades/:entity` | `EntityListPage` | `ADMIN_ENTIDADES_VIEW` | Generic list page: table of records with descricao, isActive status, created date. Actions: edit, activate/deactivate. Top-right: "New" button. |
| `/admin/entidades/:entity/novo` | `EntityCreatePage` | `ADMIN_ENTIDADES_MANAGE` | Generic create form. Renders extra fields (color picker for TipoProduto, nome field for Book, etc.) based on entity type. |
| `/admin/entidades/:entity/:id` | `EntityEditPage` | `ADMIN_ENTIDADES_MANAGE` | Generic edit form. Same as create but pre-populated. Shows audit history for this entity. |
| `/admin/showroom` | `ShowroomAdminPage` | `ADMIN_SHOWROOM_VIEW` | Two-panel layout: left = pool table (searchable, with "Add to Featured" action); right = ordered featured list with drag-and-drop handles. Config button (maxFeatured, autoSync). |
| `/admin/analytics` | `AnalyticsDashboardPage` | `ADMIN_ANALYTICS_VIEW` | Analytics home: date range picker. Row of KPI cards (page views, active users, top page, top feature). Chart: page views time series. |
| `/admin/analytics/paginas` | `PageViewsReportPage` | `ADMIN_ANALYTICS_VIEW` | Table + time series chart of page view data. Filter by date range, granularity. Breakdown by page. |
| `/admin/analytics/funcionalidades` | `FeatureUsageReportPage` | `ADMIN_ANALYTICS_VIEW` | Bar chart + table of feature usage. Filter by date range, feature name. |
| `/admin/analytics/usuarios` | `UserBehaviorReportPage` | `ADMIN_ANALYTICS_VIEW` | Table of per-user behavior summary. Click a row to open that user's detail. |
| `/admin/analytics/sessoes` | `SessionReportPage` | `ADMIN_ANALYTICS_VIEW` | Table of sessions: user, start, end, duration, page count. Expandable rows show page sequence. |
| `/admin/auditoria` | `AuditLogPage` | `ADMIN_AUDITORIA_VIEW` | Table: actor, action badge, entity type, entity label, timestamp. Filters: actor, action, entity type, date range. Click a row to see full diff (field-by-field changes). Export CSV. |

---

## 5. Admin Permission Codes

```typescript
const ADMIN_PERMISSIONS = {

  // ── Top-level module gate ──────────────────────────────────────────────
  SUPER_ADMIN:              'SUPER_ADMIN',          // Required to access /admin at all

  // ── Dashboard ─────────────────────────────────────────────────────────
  ADMIN_DASHBOARD:          'ADMIN_DASHBOARD',

  // ── User Management ───────────────────────────────────────────────────
  ADMIN_USUARIOS_VIEW:      'ADMIN_USUARIOS_VIEW',   // Read user list and detail
  ADMIN_USUARIOS_MANAGE:    'ADMIN_USUARIOS_MANAGE', // Assign roles, activate/deactivate, send invites

  // ── Role Management (Perfis) ──────────────────────────────────────────
  ADMIN_PERFIS_VIEW:        'ADMIN_PERFIS_VIEW',
  ADMIN_PERFIS_MANAGE:      'ADMIN_PERFIS_MANAGE',

  // ── Permission Management (Recursos) ──────────────────────────────────
  ADMIN_RECURSOS_VIEW:      'ADMIN_RECURSOS_VIEW',
  ADMIN_RECURSOS_MANAGE:    'ADMIN_RECURSOS_MANAGE',

  // ── Support Entity Management ─────────────────────────────────────────
  ADMIN_ENTIDADES_VIEW:     'ADMIN_ENTIDADES_VIEW',  // Read all reference tables
  ADMIN_ENTIDADES_MANAGE:   'ADMIN_ENTIDADES_MANAGE',// Create / update / activate-deactivate

  // ── Showroom Management ───────────────────────────────────────────────
  ADMIN_SHOWROOM_VIEW:      'ADMIN_SHOWROOM_VIEW',
  ADMIN_SHOWROOM_MANAGE:    'ADMIN_SHOWROOM_MANAGE', // Add/remove/reorder

  // ── Analytics & Reports ───────────────────────────────────────────────
  ADMIN_ANALYTICS_VIEW:     'ADMIN_ANALYTICS_VIEW',  // View all analytics reports

  // ── Audit Log ─────────────────────────────────────────────────────────
  ADMIN_AUDITORIA_VIEW:     'ADMIN_AUDITORIA_VIEW',  // Read-only access to audit log

} as const;

type AdminPermission = typeof ADMIN_PERMISSIONS[keyof typeof ADMIN_PERMISSIONS];
```

### Suggested role presets

| Role Name | Permissions |
|---|---|
| `SUPER_ADMIN` | All `ADMIN_*` permissions |
| `ADMIN_READONLY` | All `*_VIEW` permissions |
| `USER_MANAGER` | `ADMIN_DASHBOARD`, `ADMIN_USUARIOS_VIEW`, `ADMIN_USUARIOS_MANAGE`, `ADMIN_PERFIS_VIEW` |
| `CONTENT_MANAGER` | `ADMIN_DASHBOARD`, `ADMIN_ENTIDADES_VIEW`, `ADMIN_ENTIDADES_MANAGE`, `ADMIN_SHOWROOM_VIEW`, `ADMIN_SHOWROOM_MANAGE` |
| `ANALYST` | `ADMIN_DASHBOARD`, `ADMIN_ANALYTICS_VIEW`, `ADMIN_AUDITORIA_VIEW` |

---

## 6. Analytics Tracking Guide (Client-Side)

### 6.1 How it works

1. On app startup (after auth), generate a `sessionId` (UUID v4) and store it in `sessionStorage`.
2. Fire a `SESSION_START` event immediately.
3. On every route change, fire a `PAGE_VIEW` event. Include the time spent on the previous page as `duration`.
4. When the user logs out, fire `SESSION_END` with total session `duration`.
5. Accumulate events in an in-memory queue.
6. Flush the queue to `POST /admin/analytics/events` every **5 seconds** (if queue is non-empty).
7. Also flush on `beforeunload` and `visibilitychange` (when tab becomes hidden).
8. If a flush request fails, silently drop — do not retry, do not alert the user.

### 6.2 Events Reference

| EventType | When to fire | Required metadata keys |
|---|---|---|
| `SESSION_START` | App mounted + user authenticated | — |
| `SESSION_END` | Logout or session timeout | `duration` (total session ms) |
| `PAGE_VIEW` | Every route navigation | `duration` (time on previous page ms), `loadTime` (ms) |
| `FEATURE_USED` | Any meaningful feature interaction (see list below) | `featureName` |
| `SEARCH` | User submits a filter or search form | `featureName: "model_search"` or similar |
| `EXPORT` | User clicks any export button | `featureName: "export_csv"` or similar, `entityType` |
| `FORM_SUBMITTED` | Create / edit form successfully saved | `entityType`, `entityId` (if edit) |
| `FILTER_APPLIED` | User applies a filter (not just types — applies/submits) | `featureName`, `entityType` |
| `MODEL_VIEWED` | Model detail, edit, or visualize page opened | `entityType: "MODELO"`, `entityId` |
| `SHOWROOM_VIEWED` | Showroom page opened | — |
| `INVITE_SENT` | Admin successfully creates an invitation | `featureName: "invite_sent"` |
| `BUTTON_CLICKED` | Important CTAs (sync, activate, deactivate, clone) | `featureName`, `actionLabel` |
| `ERROR_ENCOUNTERED` | An error toast/alert is shown to the user | `featureName: error code or type` |

### 6.3 Named feature list (featureName values)

```
model_create           model_edit             model_view
model_export_csv       model_sync             model_history_open
filter_panel_open      filter_applied         filter_cleared
pagination_changed     page_size_changed
showroom_pool_add      showroom_pool_remove   showroom_featured_add
showroom_featured_remove  showroom_reorder
user_role_assign       user_deactivate        user_activate
invite_sent            invite_resend          invite_cancel
perfil_create          perfil_edit            perfil_clone
recurso_create         recurso_edit
entity_create          entity_edit            entity_deactivate
audit_log_viewed       audit_log_export
analytics_report_viewed
```

### 6.4 Privacy rules

- **Never include PII in `metadata`** (no names, emails, document numbers, phone numbers).
- `userId` is acceptable (it is an opaque system ID, not a person-readable identifier).
- `entityId` is acceptable (it references a system record, not a person's identity).
- Do not track raw search query text — only that a search occurred.
- Events from `/sign-in` and `/login` (public routes) are not tracked.

### 6.5 Client implementation sketch

```typescript
// analytics.service.ts
class AnalyticsService {
  private queue: AnalyticsEvent[] = [];
  private sessionId: string;
  private flushInterval: ReturnType<typeof setInterval>;
  private lastPageEntry: number = Date.now();
  private lastPage: string = '';

  init(userId: string): void {
    this.sessionId = sessionStorage.getItem('analyticsSessionId') ?? crypto.randomUUID();
    sessionStorage.setItem('analyticsSessionId', this.sessionId);
    this.track({ eventType: 'SESSION_START', userId, page: window.location.pathname });
    this.flushInterval = setInterval(() => this.flush(), 5000);
    window.addEventListener('beforeunload', () => this.flush());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush();
    });
  }

  trackPageView(newPage: string, userId: string): void {
    const duration = Date.now() - this.lastPageEntry;
    if (this.lastPage) {
      // Update previous page_view with duration
      const prev = this.queue.findLast(e => e.eventType === 'PAGE_VIEW' && e.page === this.lastPage);
      if (prev) prev.duration = duration;
    }
    this.lastPage = newPage;
    this.lastPageEntry = Date.now();
    this.track({ eventType: 'PAGE_VIEW', userId, page: newPage });
  }

  track(partial: Partial<AnalyticsEvent> & Pick<AnalyticsEvent, 'eventType' | 'userId'>): void {
    this.queue.push({
      sessionId: this.sessionId,
      referrer: null,
      timestamp: new Date().toISOString(),
      page: window.location.pathname,
      ...partial,
    } as AnalyticsEvent);
    if (this.queue.length >= 50) this.flush();
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0);
    try {
      await trpcClient.admin.analytics.ingestEvents.mutate({
        events: batch,
        sessionId: getSessionId(),
        clientTimestamp: new Date().toISOString(),
      });
      // Note: use fetch with keepalive on page unload to guarantee delivery:
      // await fetch('/trpc/admin.analytics.ingestEvents', { method: 'POST', keepalive: true, ... })
    } catch {
      // Silently drop — analytics must never break the app
    }
  }
}
```

---

## 7. User Invitation Flow

### Step-by-step

```
1. Admin opens /admin/convites/novo
2. Admin enters target email, selects role(s), optionally adds a message
3. Admin submits → `admin.invitations.create` mutation
4. Backend:
   a. Checks if a User record with that email already exists (if so, throws `CONFLICT`)
   b. Checks if a PENDING invitation already exists for that email (if so, throws `CONFLICT`)
   c. Generates a secure random token (32-byte hex)
   d. Stores invitation record with status=PENDING
   e. Sends invitation email with link: {APP_URL}/aceitar-convite?token=<token>
   f. Returns the UserInvitation object
5. Invitee receives the email, clicks the link
6. App loads /aceitar-convite?token=<token>
7. Frontend calls `admin.invitations.validate` query with `{ token }` to check validity
   - If EXPIRED or CANCELLED → show error page with message
   - If ACCEPTED → show "already accepted" message
   - If PENDING → proceed
8. Frontend immediately redirects to Okta SAML: {OKTA_SAML_URL}{SERVICE_PROVIDER_ID}?RelayState=<token>
9. User authenticates in Okta
10. Okta redirects to /login?token=<jwtToken>&userId=<userId>&relayState=<inviteToken>
11. AuthCallbackComponent:
    a. Extracts JWT token as normal
    b. If relayState is present, calls `admin.invitations.accept` mutation with `{ token, oktaUserId }`
    c. Backend marks invitation as ACCEPTED, creates User record (or updates existing), assigns specified perfis
12. User is redirected to /modelos/dashboard as normal
```

> See Section 3.3 for the full tRPC input/output specification of `admin.invitations.validate` and `admin.invitations.accept`.

---

## 8. Showroom Management Detail

### Pool vs Featured

```
┌─────────────────────────────────────────────────────────────────┐
│                        SHOWROOM POOL                            │
│  All models eligible to appear in the showroom.                 │
│  A model is in the pool if:                                     │
│    (a) showroomBizDev = true on the Modelo record, OR           │
│    (b) an admin has explicitly added it via POST /showroom/pool  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │               FEATURED LIST (ordered)                   │     │
│  │  A manually curated subset of the pool.                │     │
│  │  Displayed prominently at the top of the Showroom.     │     │
│  │  Max N models (configurable, default 5).               │     │
│  │  Admin sets order via drag-and-drop.                   │     │
│  │                                                        │     │
│  │  Position 1 ──► [Model A]                              │     │
│  │  Position 2 ──► [Model B]                              │     │
│  │  Position 3 ──► [Model C]                              │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### Admin UI — Showroom Page (`/admin/showroom`)

Layout: two-panel side-by-side.

**Left panel — Pool table:**
- Search input to find models by name
- Columns: Model name, Status badge, Product type, Added date
- Each row has an "Add to Featured" button (disabled if already featured or max reached)
- Pagination or infinite scroll

**Right panel — Featured list:**
- Drag handle icon on each row for reordering
- Rows: position number, model name, status, "Remove" button
- At the top: `X / maxFeatured featured` count badge
- Reorder is applied immediately (optimistic UI) and confirmed via `PUT /admin/showroom/featured/reorder`
- A "Config" button opens a side drawer for editing `ShowroomConfig`

### Auto-sync rule

If `autoSyncFromFlag = true` in `ShowroomConfig`, the backend automatically adds any model with `showroomBizDev = true` to the pool on save/update. Removing from the pool does not unset the `showroomBizDev` flag.

---

## 9. Implementation Notes

### Admin Layout Structure

```
/admin                     ← AdminLayout component (own layout, not PrivateLayout)
├── Sidebar
│   ├── Dashboard (link)
│   ├── Usuários
│   │   ├── Lista de usuários
│   │   └── Convites
│   ├── Papéis & Permissões
│   │   ├── Perfis
│   │   └── Recursos
│   ├── Entidades de Suporte (expandable)
│   │   ├── Status Modelo
│   │   ├── Tipo Produto
│   │   └── ... (all 20)
│   ├── Showroom
│   ├── Analytics
│   │   ├── Visão Geral
│   │   ├── Páginas
│   │   ├── Funcionalidades
│   │   ├── Usuários
│   │   └── Sessões
│   └── Auditoria
└── Main content area
```

### Route Guard

The admin layout's root guard checks for `SUPER_ADMIN` permission. If absent, redirect to the main app with a toast notification. Individual sub-pages check their own granular permissions.

### Generic Entity Page Pattern

The 20 support entity pages (`/admin/entidades/:entity`) all use the **same generic component** parameterized by entity type. The entity type is resolved from the `:entity` route param. A configuration map drives which extra fields to show:

```typescript
interface EntityPageConfig {
  entityPath: string;             // URL segment, e.g. "tipo-produto"
  label: string;                  // Display label, e.g. "Tipos de Produto"
  labelSingular: string;          // e.g. "Tipo de Produto"
  extraFields: EntityExtraField[];
}

interface EntityExtraField {
  name: string;
  label: string;
  type: 'text' | 'color' | 'number';
  required: boolean;
}

const ENTITY_CONFIG: Record<string, EntityPageConfig> = {
  'tipo-produto': {
    entityPath: 'tipo-produto',
    label: 'Tipos de Produto',
    labelSingular: 'Tipo de Produto',
    extraFields: [{ name: 'color', label: 'Cor', type: 'color', required: true }],
  },
  'book': {
    entityPath: 'book',
    label: 'Books',
    labelSingular: 'Book',
    extraFields: [{ name: 'nome', label: 'Nome', type: 'text', required: true }],
  },
  // ... all other entities with no extraFields get just { descricao }
};
```

### Audit Log — Server-Side Only

The backend must write an `AuditLogEntry` for every mutation endpoint under `/admin/*`. The frontend never calls an audit-write endpoint directly. If a mutation succeeds (HTTP 2xx), the audit entry is guaranteed to exist.

Recommended implementation: a middleware or decorator in the backend API layer that intercepts all admin write requests and writes the audit entry after successful persistence.

### Showroom Reorder — Optimistic UI

```
User drags item from position 3 to position 1:
  1. Update local state immediately (no loading spinner shown)
  2. Fire PUT /admin/showroom/featured/reorder in background
  3. If API succeeds: do nothing (state is already correct)
  4. If API fails: revert local state to server order, show error toast
```

### Date Ranges in Analytics

All analytics report endpoints must return data **inclusively** between `dataInicio` (start of day, 00:00:00 UTC) and `dataFim` (end of day, 23:59:59 UTC). The frontend always sends ISO date strings in `YYYY-MM-DD` format; the backend interprets them as full-day ranges.

---

*End of ADMIN_MODULE.md — Companion to PROJECT_INSTRUCTIONS.md*
