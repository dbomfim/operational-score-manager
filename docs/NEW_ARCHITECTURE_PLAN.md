# OSM — New Architecture Plan

> **Purpose:** Complete redesign blueprint for the OSM application. All domains, schemas, routes, and code identifiers use **English only**. User-facing text is handled via i18n. Billing, transactions, processing, history, dashboard, and cost entities are **excluded**.

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Known Incompatibilities](#2-known-incompatibilities)
3. [Domain Model](#3-domain-model)
4. [Prisma Schema (MongoDB)](#4-prisma-schema-mongodb)
5. [NestJS Module Architecture](#5-nestjs-module-architecture)
6. [API Specification (tRPC + REST)](#6-api-specification-trpc--rest)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Permission System](#8-permission-system)
9. [i18n Strategy](#9-i18n-strategy)
10. [Monorepo Structure](#10-monorepo-structure)

---

## 1. Technology Stack

| Layer      | Technology                                    |
| ---------- | --------------------------------------------- |
| Monorepo   | pnpm workspaces                               |
| Runtime    | Node.js 22 LTS                                |
| Backend    | NestJS 10+                                    |
| API Layer  | tRPC v11 (`@trpc/server`) + NestJS adapter    |
| ORM        | Prisma 7                                      |
| Database   | MongoDB                                       |
| Auth (JWT) | jose                                          |
| Validation | Zod (shared with frontend via `@osm/shared`)   |
| Frontend   | Vue 3 + Vite + TypeScript 5                   |
| UI         | shadcn/vue                                    |
| State      | Pinia                                         |
| API Client | @trpc/client + @trpc/vue-query + TanStack Query |
| i18n       | vue-i18n v9 (frontend), nestjs-i18n (backend) |
| Auth       | Okta SAML SSO + JWT                           |

### Shared Package

`@osm/shared` — AppRouter type export, DTOs, enums, constants, Zod schemas. Imported by both `apps/api` (router implementation) and `apps/web` (typed client). Single source of truth for API contracts.

---

## 2. Known Incompatibilities

| Issue                               | Impact                                    | Mitigation                                                                                                |
| ----------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Prisma 7 + MongoDB implicit M2M** | Not supported                             | All many-to-many relations require explicit junction collections (e.g. `ModelChannel`, `UserRole`)        |
| **Prisma 7 + MongoDB migrations**   | No `.sql` migration files                 | Use `prisma db push` for schema sync. No migration history in version control.                            |
| **Prisma 7 + MongoDB transactions** | Requires replica set                      | Use MongoDB Atlas or local replica set in dev. Single-node dev without transactions for write operations. |
| **NestJS + tRPC**                  | tRPC is framework-agnostic                 | Use `nestjs-trpc` or `trpc-nest` adapter to mount tRPC router on NestJS. Procedures call NestJS services. |
| **NestJS + Okta SAML**             | No built-in SAML adapter                  | Use `passport-saml` or Okta OIDC endpoint. Auth callback handles JWT from Okta redirect.                  |
| **PostgreSQL → MongoDB**            | Different data model                      | No foreign keys; use ObjectId references. Denormalize where useful (e.g. `modelName` in ShowroomEntry).   |

---

## 3. Domain Model

### 3.1 Core Entities

#### ScoringModel (was Modelo)

| Field                | Type              | Notes                    |
| -------------------- | ----------------- | ------------------------ |
| id                   | string (ObjectId) | Primary key              |
| name                 | string            |                          |
| description          | string            |                          |
| clientId             | string            | FK to Client             |
| productManagerId     | string            | FK to ProductManager     |
| strategicGroup       | string            |                          |
| ownerAreaId          | string            | FK to OwnerArea          |
| audienceId           | string            | FK to Audience           |
| productTypeId        | string            | FK to ProductType        |
| chargeTypeId         | string            | FK to ChargeType         |
| statusId             | string            | FK to ModelStatus        |
| startDate            | Date              |                          |
| endDate              | Date              |                          |
| dragonizationDate    | Date              |                          |
| modelAge             | number            |                          |
| executionFrequencyId | string            | FK to ExecutionFrequency |
| executionTypeId      | string            | FK to ExecutionType      |
| bureauId             | string            | FK to Bureau             |
| rangeStart           | number            |                          |
| rangeEnd             | number            |                          |
| returnsFlag          | boolean           |                          |
| hasBacktest          | boolean           |                          |
| isShowroomBizDev     | boolean           |                          |
| autoExclusion        | boolean           |                          |
| availableForDelivery | boolean           |                          |
| recalibration        | boolean           |                          |
| clientVariables      | boolean           |                          |
| highVolume           | boolean           |                          |
| recurringDeliveries  | boolean           |                          |
| purposeId            | string            | FK to Purpose            |
| publicProfileId      | string            | FK to PublicProfile      |
| businessUnitId       | string            | FK to BusinessUnit       |
| appliedFilters       | string            |                          |
| specificRules        | string            |                          |
| notes                | string            |                          |
| text                 | string            |                          |
| createdAt            | DateTime          |                          |
| updatedAt            | DateTime          |                          |
| createdBy            | string            |                          |
| updatedBy            | string            |                          |

**Relations:** M:1 with Client, ModelStatus, ProductType, ChargeType, ExecutionType, ExecutionFrequency, Bureau, OwnerArea, Audience, Purpose, PublicProfile, BusinessUnit, ProductManager. M2M via junction: Channel, Platform, Book, AccessMethod, DeploymentEnvironment. Self-referential: ModelDependency.

---

#### Client (was Cliente)

| Field     | Type              |
| --------- | ----------------- |
| id        | string            |
| name      | string            |
| taxId     | string (was cnpj) |
| isActive  | boolean           |
| createdAt | DateTime          |
| updatedAt | DateTime          |

---

#### Category (was Categoria)

| Field       | Type     |
| ----------- | -------- |
| id          | string   |
| name        | string   |
| description | string   |
| percentage  | number   |
| isActive    | boolean  |
| createdAt   | DateTime |
| updatedAt   | DateTime |

---

#### Bucket (was Balde)

| Field       | Type     |
| ----------- | -------- |
| id          | string   |
| name        | string   |
| description | string   |
| categoryId  | string   |
| isActive    | boolean  |
| createdAt   | DateTime |
| updatedAt   | DateTime |

---

### 3.2 Admin Entities

#### User

| Field        | Type     |
| ------------ | -------- |
| id           | string   |
| oktaId       | string   |
| email        | string   |
| fullName     | string   |
| username     | string   |
| isActive     | boolean  |
| lastLoginAt  | DateTime |
| firstLoginAt | DateTime |
| createdAt    | DateTime |
| updatedAt    | DateTime |

M2M with Role via UserRole.

---

#### Role (was Perfil)

| Field       | Type     |
| ----------- | -------- |
| id          | string   |
| name        | string   |
| description | string   |
| isActive    | boolean  |
| createdAt   | DateTime |
| updatedAt   | DateTime |

M2M with Permission via RolePermission.

---

#### Permission (was Recurso)

| Field       | Type     |
| ----------- | -------- | ---------------------- |
| id          | string   |
| code        | string   | e.g. "VIEW_MODEL_LIST" |
| description | string   |
| module      | string   |
| isActive    | boolean  |
| createdAt   | DateTime |
| updatedAt   | DateTime |

---

#### UserInvitation

| Field       | Type                                        |
| ----------- | ------------------------------------------- |
| id          | string                                      |
| email       | string                                      |
| invitedById | string                                      |
| roleIds     | string[]                                    |
| status      | PENDING \| ACCEPTED \| EXPIRED \| CANCELLED |
| token       | string                                      |
| message     | string                                      |
| expiresAt   | DateTime                                    |
| acceptedAt  | DateTime                                    |
| createdAt   | DateTime                                    |

---

#### AuditLog (was AuditLogEntry)

| Field       | Type     |
| ----------- | -------- |
| id          | string   |
| actorId     | string   |
| actorName   | string   |
| action      | string   |
| entityType  | string   |
| entityId    | string   |
| entityLabel | string   |
| changes     | Json     |
| ipAddress   | string   |
| userAgent   | string   |
| timestamp   | DateTime |
| metadata    | Json     |

---

#### ShowroomEntry

| Field            | Type     |
| ---------------- | -------- |
| id               | string   |
| modelId          | string   |
| modelName        | string   |
| modelStatus      | string   |
| addedById        | string   |
| isFeatured       | boolean  |
| featuredPosition | number   |
| addedAt          | DateTime |

---

#### ShowroomConfig

| Field            | Type               |
| ---------------- | ------------------ |
| id               | string (singleton) |
| maxFeatured      | number             |
| autoSyncFromFlag | boolean            |
| poolTitle        | string             |
| featuredTitle    | string             |
| updatedAt        | DateTime           |
| updatedBy        | string             |

---

### 3.3 Reference / Lookup Entities

All share: `id`, `description`, `isActive`, `createdAt`, `updatedAt`.

| Entity                | Was                 | Extra Fields |
| --------------------- | ------------------- | ------------ |
| ModelStatus           | StatusModelo        | —            |
| ProductType           | TipoProduto         | color        |
| ExecutionType         | TipoExecucao        | —            |
| ChargeType            | TipoCobranca        | —            |
| ExecutionFrequency    | FrequenciaExecucao  | —            |
| DeploymentEnvironment | AmbienteImplantacao | —            |
| OwnerArea             | AreaProprietaria    | —            |
| Audience              | Publico             | —            |
| Bureau                | Bureau              | —            |
| Platform              | Plataforma          | —            |
| Book                  | Book                | name         |
| Channel               | Canal               | —            |
| ChannelDetail         | DetalheCanal        | —            |
| ProductManager        | PmResponsavel       | —            |
| PublicProfile          | PerfilPublico        | —            |
| BusinessUnit          | UnidadeNegocio      | —            |
| AccessMethod          | MeioAcesso          | —            |
| Purpose               | Finalidade          | —            |

**Removed:** Faturamento, Transacao, DagExecucao, Historico, Dashboard, Custo, CustoAws, Meses.

---

### 3.4 Explicit Junction Collections (MongoDB)

| Collection                 | Fields                           | Purpose                              |
| -------------------------- | -------------------------------- | ------------------------------------ |
| ModelChannel               | modelId, channelId               | ScoringModel ↔ Channel               |
| ModelPlatform              | modelId, platformId              | ScoringModel ↔ Platform              |
| ModelBook                  | modelId, bookId                  | ScoringModel ↔ Book                  |
| ModelAccessMethod          | modelId, accessMethodId          | ScoringModel ↔ AccessMethod          |
| ModelDeploymentEnvironment | modelId, deploymentEnvironmentId | ScoringModel ↔ DeploymentEnvironment |
| ModelDependency            | modelId, dependsOnId             | ScoringModel self-referential        |
| UserRole                   | userId, roleId                   | User ↔ Role                          |
| RolePermission             | roleId, permissionId             | Role ↔ Permission                    |

---

## 4. Prisma Schema (MongoDB)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

// ─── Auth & Users ────────────────────────────────────────────────────────────

model User {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  oktaId       String   @unique
  email        String
  fullName     String
  username     String
  isActive     Boolean  @default(true)
  lastLoginAt  DateTime?
  firstLoginAt DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  roles        UserRole[]
}

model UserRole {
  userId   String   @db.ObjectId
  roleId   String   @db.ObjectId
  user     User     @relation(fields: [userId], references: [id])
  role     Role     @relation(fields: [roleId], references: [id])
  @@id([userId, roleId])
}

// ─── RBAC ────────────────────────────────────────────────────────────────────

model Role {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  name          String   @unique
  description   String?
  isActive      Boolean  @default(true)
  parentRoleId  String?  @db.ObjectId
  scope         Json?    // Future: { clientIds, teamId } for scoped access
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  parentRole    Role?    @relation("RoleHierarchy", fields: [parentRoleId], references: [id])
  childRoles    Role[]   @relation("RoleHierarchy")
  users         UserRole[]
  permissions   RolePermission[]
}

model Permission {
  id            String    @id @default(auto()) @map("_id") @db.ObjectId
  code          String    @unique
  resource      String
  action        String
  fieldGroup    String?   // For field-level: "client", "commercial", etc.
  description   String
  module        String
  riskLevel     String?   // "low" | "medium" | "high" | "critical"
  category      String?   // For UI grouping: "data", "admin", "audit"
  isSensitive   Boolean   @default(false)
  isActive      Boolean   @default(true)
  deprecatedAt  DateTime?
  replacedById  String?   @db.ObjectId
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  roles         RolePermission[]
}

model RolePermission {
  roleId       String   @db.ObjectId
  permissionId String   @db.ObjectId
  role         Role     @relation(fields: [roleId], references: [id])
  permission    Permission @relation(fields: [permissionId], references: [id])
  @@id([roleId, permissionId])
}

// ─── Scoring Model ────────────────────────────────────────────────────────────

model ScoringModel {
  id                    String    @id @default(auto()) @map("_id") @db.ObjectId
  name                  String
  description           String?
  clientId              String?   @db.ObjectId
  productManagerId      String?   @db.ObjectId
  strategicGroup        String?
  ownerAreaId           String?   @db.ObjectId
  audienceId            String?   @db.ObjectId
  productTypeId         String?   @db.ObjectId
  chargeTypeId          String?   @db.ObjectId
  statusId              String    @db.ObjectId
  startDate             DateTime?
  endDate               DateTime?
  dragonizationDate     DateTime?
  modelAge              Int?
  executionFrequencyId  String?   @db.ObjectId
  executionTypeId       String?   @db.ObjectId
  bureauId              String?   @db.ObjectId
  rangeStart            Int?
  rangeEnd              Int?
  returnsFlag           Boolean   @default(false)
  hasBacktest           Boolean   @default(false)
  isShowroomBizDev      Boolean   @default(false)
  autoExclusion          Boolean   @default(false)
  availableForDelivery  Boolean   @default(false)
  recalibration         Boolean   @default(false)
  clientVariables       Boolean   @default(false)
  highVolume            Boolean   @default(false)
  recurringDeliveries   Boolean   @default(false)
  purposeId             String?   @db.ObjectId
  publicProfileId       String?   @db.ObjectId
  businessUnitId        String?   @db.ObjectId
  appliedFilters        String?
  specificRules         String?
  notes                 String?
  text                  String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  createdBy             String?
  updatedBy             String?

  client                Client?   @relation(fields: [clientId], references: [id])
  status                ModelStatus @relation(fields: [statusId], references: [id])
  productType           ProductType? @relation(fields: [productTypeId], references: [id])
  chargeType            ChargeType? @relation(fields: [chargeTypeId], references: [id])
  executionType         ExecutionType? @relation(fields: [executionTypeId], references: [id])
  executionFrequency    ExecutionFrequency? @relation(fields: [executionFrequencyId], references: [id])
  bureau                Bureau?   @relation(fields: [bureauId], references: [id])
  ownerArea             OwnerArea? @relation(fields: [ownerAreaId], references: [id])
  audience              Audience? @relation(fields: [audienceId], references: [id])
  purpose               Purpose?  @relation(fields: [purposeId], references: [id])
  publicProfile         PublicProfile? @relation(fields: [publicProfileId], references: [id])
  businessUnit          BusinessUnit? @relation(fields: [businessUnitId], references: [id])
  productManager        ProductManager? @relation(fields: [productManagerId], references: [id])
  channels              ModelChannel[]
  platforms             ModelPlatform[]
  books                 ModelBook[]
  accessMethods         ModelAccessMethod[]
  deploymentEnvs        ModelDeploymentEnvironment[]
  dependents            ModelDependency[] @relation("DependsOn")
  dependencies          ModelDependency[] @relation("DependedBy")
  showroomEntry         ShowroomEntry?
}

model ModelChannel {
  modelId   String @db.ObjectId
  channelId String @db.ObjectId
  model     ScoringModel @relation(fields: [modelId], references: [id])
  channel   Channel @relation(fields: [channelId], references: [id])
  @@id([modelId, channelId])
}

model ModelPlatform {
  modelId    String   @db.ObjectId
  platformId String   @db.ObjectId
  model      ScoringModel @relation(fields: [modelId], references: [id])
  platform   Platform @relation(fields: [platformId], references: [id])
  @@id([modelId, platformId])
}

model ModelBook {
  modelId String @db.ObjectId
  bookId  String @db.ObjectId
  model   ScoringModel @relation(fields: [modelId], references: [id])
  book    Book   @relation(fields: [bookId], references: [id])
  @@id([modelId, bookId])
}

model ModelAccessMethod {
  modelId        String @db.ObjectId
  accessMethodId String @db.ObjectId
  model          ScoringModel @relation(fields: [modelId], references: [id])
  accessMethod   AccessMethod @relation(fields: [accessMethodId], references: [id])
  @@id([modelId, accessMethodId])
}

model ModelDeploymentEnvironment {
  modelId                 String @db.ObjectId
  deploymentEnvironmentId String @db.ObjectId
  model                   ScoringModel @relation(fields: [modelId], references: [id])
  deploymentEnvironment   DeploymentEnvironment @relation(fields: [deploymentEnvironmentId], references: [id])
  @@id([modelId, deploymentEnvironmentId])
}

model ModelDependency {
  modelId     String @db.ObjectId
  dependsOnId String @db.ObjectId
  model       ScoringModel @relation("DependsOn", fields: [modelId], references: [id])
  dependsOn   ScoringModel @relation("DependedBy", fields: [dependsOnId], references: [id])
  @@id([modelId, dependsOnId])
}

// ─── Client ───────────────────────────────────────────────────────────────────

model Client {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  name      String
  taxId     String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  models    ScoringModel[]
}

// ─── Analytical Solutions ─────────────────────────────────────────────────────

model Category {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  description String?
  percentage  Float
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  buckets     Bucket[]
}

model Bucket {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  description String?
  categoryId  String   @db.ObjectId
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  category    Category @relation(fields: [categoryId], references: [id])
}

// ─── Reference / Lookup Entities ─────────────────────────────────────────────

model ModelStatus {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  description String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  models    ScoringModel[]
}

model ProductType {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  description String
  color     String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  models    ScoringModel[]
}

model ExecutionType {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  description String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  models    ScoringModel[]
}

model ChargeType {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  description String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  models    ScoringModel[]
}

model ExecutionFrequency {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  description String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  models    ScoringModel[]
}

model DeploymentEnvironment {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  description String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  models    ModelDeploymentEnvironment[]
}

model OwnerArea {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  description String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  models    ScoringModel[]
}

model Audience {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  description String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  models    ScoringModel[]
}

model Bureau {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  description String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  models    ScoringModel[]
}

model Platform {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  description String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  models    ModelPlatform[]
}

model Book {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  description String
  name      String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  models    ModelBook[]
}

model Channel {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  description String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  models      ModelChannel[]
}

model ChannelDetail {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  description String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ProductManager {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  description String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  models    ScoringModel[]
}

model PublicProfile {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  description String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  models    ScoringModel[]
}

model BusinessUnit {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  description String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  models    ScoringModel[]
}

model AccessMethod {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  description String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  models    ModelAccessMethod[]
}

model Purpose {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  description String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  models    ScoringModel[]
}

// ─── Showroom ─────────────────────────────────────────────────────────────────

model ShowroomEntry {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  modelId         String   @unique @db.ObjectId
  modelName       String
  modelStatus     String
  addedById       String   @db.ObjectId
  isFeatured      Boolean  @default(false)
  featuredPosition Int?
  addedAt         DateTime @default(now())
  model           ScoringModel @relation(fields: [modelId], references: [id])
}

model ShowroomConfig {
  id               String   @id @default("singleton") @map("_id")
  maxFeatured      Int      @default(5)
  autoSyncFromFlag Boolean  @default(true)
  poolTitle        String   @default("Showroom Pool")
  featuredTitle    String   @default("Featured Models")
  updatedAt        DateTime @updatedAt
  updatedBy        String   @default("system")
}

// ─── Admin ───────────────────────────────────────────────────────────────────

model UserInvitation {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  email      String
  invitedById String  @db.ObjectId
  roleIds    String[] @db.ObjectId
  status     String   @default("PENDING") // PENDING | ACCEPTED | EXPIRED | CANCELLED
  token      String   @unique
  message    String?
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  acceptedAt DateTime?
}

model AuditLog {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  actorId     String
  actorName   String
  action      String
  entityType  String
  entityId    String
  entityLabel String
  changes     Json?
  ipAddress   String?
  userAgent   String?
  timestamp   DateTime @default(now())
  metadata    Json?
}

model AnalyticsEvent {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  sessionId       String
  userId          String
  eventType       String
  page            String?
  referrer        String?
  entityType      String?
  entityId        String?
  featureName     String?
  actionLabel     String?
  duration        Int?
  loadTime        Int?
  metadata        Json?
  timestamp       DateTime @default(now())
}
```

---

## 5. NestJS Module Architecture

```
apps/api/src/
├── app.module.ts
├── main.ts
├── trpc/
│   ├── trpc.module.ts            # tRPC context, procedures, middleware
│   ├── context.ts                # createContext (JWT → ctx)
│   ├── router.ts                 # Root AppRouter (merges all sub-routers)
│   └── routers/
│       ├── index.ts              # Root router
│       ├── auth.router.ts
│       ├── models.router.ts
│       ├── clients.router.ts
│       ├── categories.router.ts
│       ├── buckets.router.ts
│       ├── showroom.router.ts
│       ├── lookup.router.ts
│       └── admin/
│           ├── index.ts
│           ├── users.router.ts
│           ├── roles.router.ts
│           ├── permissions.router.ts
│           ├── entities.router.ts
│           ├── showroom.router.ts
│           ├── analytics.router.ts
│           ├── audit.router.ts
│           └── invitations.router.ts
├── prisma/
│   └── prisma.module.ts          # Global PrismaModule
├── i18n/
│   └── i18n.module.ts            # nestjs-i18n
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── require-permissions.decorator.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── permissions.guard.ts
│   ├── interceptors/
│   │   ├── audit.interceptor.ts
│   │   └── transform.interceptor.ts
│   └── filters/
│       └── http-exception.filter.ts
└── modules/
    ├── auth/
    ├── models/
    ├── clients/
    ├── categories/
    ├── buckets/
    ├── showroom/
    ├── lookup/
    └── admin/
        # Each module: *.module.ts, *.service.ts, *.dto.ts
        # Routers call services; no controllers for tRPC procedures
```

---

## 6. API Specification (tRPC + REST)

### 6.1 Transport

- **tRPC endpoint:** `{API_URL}/trpc` (e.g. `http://localhost:3000/trpc`)
- **File uploads (REST):** `{API_URL}/upload/template`, `{API_URL}/upload/validate-variables` — remain REST because tRPC does not handle multipart/form-data natively.

### 6.2 tRPC Router Tree

```
appRouter
├── auth
│   ├── me                      query  → UserInfoPayload
│   └── renewToken              mutation → { accessToken: string }
├── security
│   └── me                      query  → user resources/permissions
├── models
│   ├── list                    query(page, size, sort?, filter?)       → PaginatedResponse<ScoringModel>
│   ├── getById                 query(id)                               → ScoringModel
│   ├── getAudit                query(id)                               → AuditLogEntry[]
│   ├── create                  mutation(ScoringModelDto)               → ScoringModel
│   ├── update                  mutation(id, ScoringModelDto)           → ScoringModel
│   ├── sync                    mutation(modelIds: string[])             → { synced: number }
│   └── syncOne                 mutation(id)                            → ScoringModel
├── clients
│   ├── list                    query()                                 → Client[]
│   └── getById                 query(id)                               → Client
├── categories
│   ├── list                    query(page, size)                       → PaginatedResponse<Category>
│   ├── listAll                 query()                                 → Category[]
│   ├── getById                 query(id)                               → Category
│   ├── create                  mutation(CategoryDto)                    → Category
│   └── update                  mutation(id, CategoryDto)               → Category
├── buckets
│   ├── list                    query(page, size)                       → PaginatedResponse<Bucket>
│   ├── listAll                 query()                                 → Bucket[]
│   ├── getById                 query(id)                               → Bucket
│   ├── getEditInfo             query(id)                               → BucketEditInfo
│   ├── create                  mutation(BucketDto)                      → Bucket
│   └── update                  mutation(id, BucketDto)                  → Bucket
├── showroom
│   ├── list                    query(page, size, filter?)              → PaginatedResponse<ShowroomEntry>
│   ├── featured                query()                                 → ShowroomEntry[]
│   └── reports                 query(dataInicio, dataFim)              → ShowroomReport[]
├── lookup
│   ├── all                     query()                                → LookupConfigs
│   └── byEntity                query(entity: string)                   → LookupEntity[]
└── admin
    ├── stats                   query()                                → AdminStats
    ├── users.*
    ├── invitations.*
    ├── roles.*
    ├── permissions.*
    ├── entities.*
    ├── showroom.*
    ├── analytics.*
    └── auditLog.*
```

### 6.3 tRPC Procedures (Summary)

- **auth.me**, **auth.renewToken** — protected
- **security.me** — protected, returns user resources
- **models.*** — protected, permission-gated
- **clients.*** — protected
- **categories.*** — protected
- **buckets.*** — protected
- **showroom.*** — protected
- **lookup.*** — protected (or public for dropdowns)
- **admin.*** — protected, requires ADMIN_* permissions

### 6.4 REST Endpoints (File Uploads Only)

| Method | Path                       | Description             |
| ------ | -------------------------- | ----------------------- |
| POST   | /upload/template           | Upload model template   |
| POST   | /upload/validate-variables | Validate variable files |

### 6.5 tRPC Context & Middleware

```typescript
// Context: { userId, userEmail, userResources }
// protectedProcedure: requires valid JWT
// withPermission(code): requires JWT + code in userResources
```

---

## 7. Frontend Architecture

The permission system (Section 8) affects both backend and frontend. The backend enforces permissions on procedures and filters response fields. The frontend uses the same permission codes for route guards, menu visibility, and conditional UI (e.g. show/hide client field).

### 7.1 Routes (Vue Router, English)

```
/login
/sign-in
/models
/models/new
/models/:id
/models/:id/edit
/models/sync
/categories
/categories/new
/categories/:id
/buckets
/buckets/new
/buckets/:id
/showroom
/showroom/reports
/admin
/admin/users
/admin/users/:id
/admin/invitations
/admin/roles
/admin/roles/new
/admin/roles/:id
/admin/permissions
/admin/permissions/new
/admin/permissions/:id
/admin/entities/:type
/admin/entities/:type/new
/admin/entities/:type/:id
/admin/showroom
/admin/analytics
/admin/audit-log
```

**Route–permission mapping**

| Route | Required permission |
|-------|----------------------|
| /models | models:list or models:read |
| /models/new | models:create |
| /models/:id | models:read |
| /models/:id/edit | models:update |
| /models/sync | models:sync |
| /categories | categories:list or categories:read |
| /categories/new | categories:create |
| /categories/:id | categories:read or categories:update |
| /buckets | buckets:list or buckets:read |
| /buckets/new | buckets:create |
| /buckets/:id | buckets:read or buckets:update |
| /showroom | showroom:view |
| /showroom/reports | showroom:reports |
| /admin | admin:access |
| /admin/users | admin.users:list or admin.users:read |
| /admin/roles | admin.roles:list or admin.roles:read |
| /admin/permissions | admin.permissions:list or admin.permissions:read |
| /admin/entities/:type | admin.entities:list or admin.entities:read |
| /admin/showroom | admin.showroom:list or admin.showroom:read |
| /admin/analytics | admin.analytics:read |
| /admin/audit-log | admin.audit:read |

### 7.2 Tech Stack

- Vue 3 + Vite
- TypeScript 5
- shadcn/vue
- Pinia
- @trpc/client + @trpc/vue-query + TanStack Query
- vue-i18n v9
- Vue Router 4
- Native `fetch` for file uploads (REST `/upload/*`)

### 7.3 Project Structure

```
apps/web/src/
├── lib/
│   ├── trpc.ts          # tRPC client
│   └── auth.ts          # Token storage, getAccessToken, logout
├── components/
│   ├── layout/          # AppHeader, Sidebar, PrivateLayout, AdminLayout
│   ├── common/          # DataTable, FilterPanel, ConfirmDialog, PermissionGate
│   └── [feature]/       # Feature-specific components
├── composables/
│   ├── useAuth.ts       # isLoggedIn, user, logout
│   ├── usePermission.ts # hasPermission, hasAnyPermission
│   └── usePagination.ts
├── i18n/
│   └── locales/         # en.json, pt-BR.json
├── layouts/
│   ├── PublicLayout.vue
│   ├── PrivateLayout.vue
│   └── AdminLayout.vue
├── pages/
│   ├── auth/
│   ├── models/
│   ├── categories/
│   ├── buckets/
│   ├── showroom/
│   └── admin/
├── router/
│   ├── index.ts         # Route definitions
│   └── guards.ts        # Auth guard, permission guard
├── stores/
│   ├── auth.store.ts    # user, permissions, fetchUserResources
│   └── ui.store.ts
├── types/
└── utils/
```

### 7.4 tRPC Client Setup

```typescript
// lib/trpc.ts
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '@osm/shared'
import { getAccessToken } from './auth'

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${import.meta.env.VITE_API_URL}/trpc`,
      headers: () => ({
        Authorization: `Bearer ${getAccessToken() ?? ''}`,
      }),
    }),
  ],
})

// Usage with @trpc/vue-query: trpc.models.list.useQuery({ page: 0, size: 20 })
// File uploads: fetch(`${VITE_UPLOAD_URL}/template`, { method: 'POST', body: formData })
```

### 7.5 Auth Store & Permissions

The auth store holds the user and their **resolved permission codes** (from `security.me`). Permissions are cached in sessionStorage with TTL.

```typescript
// stores/auth.store.ts
interface AuthState {
  user: UserInfo | null
  permissions: string[]   // e.g. ['models:list', 'models:read', 'models.fields.client:read']
  isLoading: boolean
}

// Methods: setUser, setPermissions, hasPermission(code), hasAnyPermission(codes[]), logout
// On app init: fetch security.me → store permissions
// On 401: clear store, redirect to /sign-in
```

### 7.6 Permission Composable

```typescript
// composables/usePermission.ts
export function usePermission() {
  const authStore = useAuthStore()
  return {
    hasPermission: (code: string) => authStore.hasPermission(code),
    hasAnyPermission: (codes: string[]) => authStore.hasAnyPermission(codes),
    canAccessModels: () => authStore.hasAnyPermission(['models:list', 'models:read', 'models:create', 'models:update', 'models:delete', 'models:sync']),
    canAccessAdmin: () => authStore.hasPermission('admin:access') || authStore.hasPermission('admin:super'),
    canSeeClientField: () => authStore.hasPermission('models.fields.client:read'),
    canEditClientField: () => authStore.hasPermission('models.fields.client:update'),
    // ... other helpers
  }
}
```

### 7.7 Route Guards

```typescript
// router/guards.ts
// Before each route: check auth, then required permission
// Route meta: { permission: 'models:list' } or { permission: 'admin:access', adminRoute: true }

// /models → requires models:list or models:read
// /models/new → requires models:create
// /models/:id/edit → requires models:update
// /admin/* → requires admin:access
// /admin/users → requires admin.users:list or admin.users:read
```

### 7.8 Menu Derivation

Build the sidebar from `authStore.permissions`:

```typescript
// No MENU_* permissions. Derive visibility:
// Models menu visible if hasAnyPermission(['models:list', 'models:read', ...])
// Analytical Solutions if hasAnyPermission(['categories:*', 'buckets:*'])
// Showroom if hasAnyPermission(['showroom:view', 'showroom:reports', 'showroom:export'])
// Admin if hasPermission('admin:access') || hasPermission('admin:super')
```

### 7.9 Field-Level Visibility (UI)

The API returns **already-filtered** data (backend serializer). The frontend:

- **Tables/lists:** Render columns for the fields present in the response. No client column → don't render it.
- **Forms (create/edit):** Use `usePermission()` to show/hide or disable field groups:

```vue
<!-- ModelForm.vue -->
<template>
  <form>
    <!-- Basic fields: always shown if models:create/update -->
    <FormField name="name" />
    <FormField name="description" />
    
    <!-- Client section: only if models.fields.client:read -->
    <section v-if="canSeeClientField">
      <FormField name="clientId" :disabled="!canEditClientField" />
    </section>
    
    <!-- Commercial section -->
    <section v-if="canSeeCommercialField">
      <FormField name="chargeTypeId" :disabled="!canEditCommercialField" />
    </section>
  </form>
</template>
```

### 7.10 Permission-Gated Actions

Use `PermissionGate` or `v-if="hasPermission(...)"` for buttons:

```vue
<Button v-if="hasPermission('models:create')" @click="goToCreate">Create Model</Button>
<Button v-if="hasPermission('models:update')" @click="edit">Edit</Button>
<Button v-if="hasPermission('models:delete')" variant="destructive">Delete</Button>
```

### 7.11 Layouts

| Layout | Use case |
|--------|----------|
| PublicLayout | /login, /sign-in |
| PrivateLayout | Main app: /models, /categories, /buckets, /showroom |
| AdminLayout | /admin/* — separate sidebar, requires admin:access |

### 7.12 Error Handling

- **401:** Clear auth store, redirect to /sign-in?status=expired
- **403:** Show "Access denied" message or redirect to home
- **tRPC link:** Intercept 401 in fetch, trigger logout

---

## 8. Permission System

### 8.1 Resource:Action Pattern

All permissions follow `resource:action` or `resource.fields.group:action`. Menu visibility is **derived** from permissions (no explicit `MENU_*` codes).

### 8.2 Permission Codes

**Main app**

| Code | Description |
|------|--------------|
| models:list | List models |
| models:read | Read model (basic fields only) |
| models:create | Create model |
| models:update | Update model |
| models:delete | Delete model |
| models:sync | Sync models |
| models.fields.client:read | See client-related fields (clientId, client, taxId, clientName) |
| models.fields.client:update | Edit client-related fields |
| models.fields.commercial:read | See commercial fields (chargeType, flatFee, etc.) |
| models.fields.commercial:update | Edit commercial fields |
| models.fields.technical:read | See technical fields (rangeStart, rangeEnd, access methods, etc.) |
| models.fields.technical:update | Edit technical fields |
| models.fields.internal:read | See internal/audit fields (notes, createdBy, updatedBy) |
| clients:list | List clients |
| clients:read | Read client |
| categories:list | List categories |
| categories:read | Read category |
| categories:create | Create category |
| categories:update | Update category |
| categories:delete | Delete category |
| buckets:list | List buckets |
| buckets:read | Read bucket |
| buckets:create | Create bucket |
| buckets:update | Update bucket |
| buckets:delete | Delete bucket |
| showroom:view | View showroom |
| showroom:reports | Showroom reports |
| showroom:export | Export showroom data |

**Admin (gate + sub-resources)**

| Code | Description |
|------|--------------|
| admin:access | Access /admin section |
| admin:super | All admin permissions (wildcard) |
| admin.users:list | List users |
| admin.users:read | Read user |
| admin.users:invite | Send invitation |
| admin.users:update | Update user (status, roles) |
| admin.users:delete | Deactivate/delete user |
| admin.roles:list | List roles |
| admin.roles:read | Read role |
| admin.roles:create | Create role |
| admin.roles:update | Update role |
| admin.roles:delete | Delete role |
| admin.roles:clone | Clone role |
| admin.permissions:list | List permissions |
| admin.permissions:read | Read permission |
| admin.permissions:create | Create permission |
| admin.permissions:update | Update permission |
| admin.permissions:delete | Delete permission |
| admin.entities:list | List support entities |
| admin.entities:read | Read support entity |
| admin.entities:create | Create support entity |
| admin.entities:update | Update support entity |
| admin.entities:delete | Delete support entity |
| admin.showroom:list | List showroom pool |
| admin.showroom:read | Read showroom config |
| admin.showroom:create | Add to pool, add featured |
| admin.showroom:update | Reorder, update config |
| admin.showroom:delete | Remove from pool/featured |
| admin.analytics:read | View analytics reports |
| admin.audit:read | View audit log |
| admin.audit:export | Export audit log |

### 8.3 Menu Visibility (Derived)

| Menu | Condition |
|------|-----------|
| Models | Any `models:*` |
| Analytical Solutions | Any `categories:*` or `buckets:*` |
| Showroom | Any `showroom:*` |
| Admin | `admin:access` |

### 8.4 Field-Level Permissions

**ScoringModel field groups**

| Group | Fields |
|-------|--------|
| basic | name, description, statusId, startDate, endDate, productTypeId, executionTypeId |
| client | clientId, client, taxId, clientName |
| commercial | chargeTypeId, flatFee, strategicGroup, ownerAreaId, audienceId |
| technical | rangeStart, rangeEnd, accessMethods, deploymentEnvs, bureauId, executionFrequencyId |
| internal | notes, appliedFilters, specificRules, createdBy, updatedBy |

**Behavior:** `models:read` exposes only `basic`. Each `models.fields.X:read` adds that group. Same pattern for `models.fields.X:update` on write.

**Serialization:** A dedicated serializer filters the response based on user permissions before returning.

### 8.5 Permission Hierarchy & Dependencies

Some permissions imply others. When checking, resolve dependencies:

```typescript
const PERMISSION_DEPENDENCIES: Record<string, string[]> = {
  'models:update': ['models:read'],
  'models:delete': ['models:read'],
  'models:sync': ['models:read'],
  'models.fields.client:update': ['models.fields.client:read'],
  'categories:update': ['categories:read'],
  'categories:delete': ['categories:read'],
  // ...
};
```

### 8.6 Permission Groups (Bundles)

Predefined bundles for easier role assignment:

```typescript
const PERMISSION_GROUPS = {
  'models:full': ['models:list', 'models:read', 'models:create', 'models:update', 'models:delete', 'models:sync'],
  'models.fields:full': ['models.fields.client:read', 'models.fields.client:update', 'models.fields.commercial:read', 'models.fields.commercial:update', 'models.fields.technical:read', 'models.fields.technical:update', 'models.fields.internal:read'],
  'categories:full': ['categories:list', 'categories:read', 'categories:create', 'categories:update', 'categories:delete'],
  'buckets:full': ['buckets:list', 'buckets:read', 'buckets:create', 'buckets:update', 'buckets:delete'],
  'admin.users:full': ['admin.users:list', 'admin.users:read', 'admin.users:invite', 'admin.users:update', 'admin.users:delete'],
  // ...
};
```

### 8.7 Wildcard Support

- `models:*` — all actions on models
- `admin.*:read` — read-only for all admin sub-resources
- `admin:super` — all admin permissions

### 8.8 Role Composition

Roles can extend other roles. Effective permissions = own + parent (recursive).

```prisma
model Role {
  parentRoleId String? @db.ObjectId
  parentRole   Role?   @relation("RoleHierarchy", fields: [parentRoleId], references: [id])
  childRoles   Role[]  @relation("RoleHierarchy")
  // ...
}
```

### 8.9 Procedure–Permission Contract

Explicit mapping in `packages/shared` ensures every protected procedure has a permission:

```typescript
export const PROCEDURE_PERMISSIONS = {
  'models.list': 'models:list',
  'models.getById': 'models:read',
  'models.create': 'models:create',
  'models.update': 'models:update',
  'models.delete': 'models:delete',
  'models.sync': 'models:sync',
  'admin.users.list': 'admin.users:list',
  // ... exhaustive map
} as const;
```

### 8.10 Centralized Constants

```typescript
// packages/shared/src/permissions.ts
export const PERMISSIONS = {
  MODELS: {
    LIST: 'models:list',
    READ: 'models:read',
    CREATE: 'models:create',
    UPDATE: 'models:update',
    DELETE: 'models:delete',
    SYNC: 'models:sync',
    FIELDS: {
      CLIENT_READ: 'models.fields.client:read',
      CLIENT_UPDATE: 'models.fields.client:update',
      COMMERCIAL_READ: 'models.fields.commercial:read',
      // ...
    },
  },
  ADMIN: { ACCESS: 'admin:access', SUPER: 'admin:super', USERS: { /* ... */ }, /* ... */ },
} as const;
```

### 8.11 Preset Roles

| Role | Permissions |
|------|-------------|
| Viewer | models:list, models:read, clients:list, clients:read, categories:list, categories:read, buckets:list, buckets:read, showroom:view |
| Model Editor | Viewer + models:create, models:update, models:sync |
| Sales | Viewer + models.fields.client:read, models.fields.commercial:read |
| Analytical Solutions Manager | Viewer + categories:full, buckets:full |
| User Manager | admin:access, admin.users:full, admin.roles:list, admin.roles:read |
| Content Manager | admin:access, admin.entities:full, admin.showroom:full |
| Analyst | admin:access, admin.analytics:read, admin.audit:read |
| Super Admin | admin:super |

### 8.12 Deprecation

Permissions support soft deprecation: `deprecatedAt`, `replacedById`. Deprecated permissions are not assignable to new roles but still resolve for existing ones until migration.

---

## 9. i18n Strategy

### 9.1 Backend (nestjs-i18n)

- **Purpose:** Translate error messages, validation messages, API response labels.
- **Locale detection:** `Accept-Language` header.
- **Files:** `apps/api/src/i18n/en/`, `apps/api/src/i18n/pt-BR/`
- **Example keys:** `errors.unauthorized`, `validation.required`, `entity.model.name`

### 9.2 Frontend (vue-i18n v9)

- **Purpose:** All user-facing text (labels, buttons, titles, messages).
- **Locale:** Stored in session/localStorage; user preference or browser default.
- **Files:** `apps/web/src/i18n/locales/en.json`, `pt-BR.json`
- **Code:** All entity IDs, field names, route paths use English. Only labels use `$t('key')`.

### 9.3 Rule

**Everything that is not presentational text must be in English.** Routes, API paths, entity names, field names, permission codes, TypeScript identifiers, database keys.

---

## 10. Monorepo Structure

```
/
├── apps/
│   ├── api/                 # NestJS
│   │   ├── src/
│   │   ├── prisma/
│   │   └── package.json
│   └── web/                 # Vue 3
│       ├── src/
│       └── package.json
├── packages/
│   └── shared/             # @osm/shared
│       ├── src/
│       │   ├── index.ts    # Re-exports AppRouter type (from api) + Zod schemas
│       │   ├── permissions.ts  # PERMISSIONS, PROCEDURE_PERMISSIONS, PERMISSION_GROUPS, PERMISSION_DEPENDENCIES
│       │   ├── field-groups.ts # SCORING_MODEL_FIELD_GROUPS, etc.
│       │   ├── dto/
│       │   ├── enums/
│       │   └── schemas/   # Zod schemas for tRPC input validation
│       └── package.json   # Depends on apps/api for AppRouter type
├── prisma/
│   └── schema.prisma       # Single schema, MongoDB
├── pnpm-workspace.yaml
├── package.json
└── .env.example
```

---

_End of NEW_ARCHITECTURE_PLAN.md_
