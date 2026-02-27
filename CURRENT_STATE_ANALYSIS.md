# OSM — Current State Analysis

> **Purpose:** Faithful snapshot of the OSM application as specified today, before any rewrite. This document captures what exists (or is planned to exist) in the current architecture. Use it as the source of truth for what the new application must cover.

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Entities & Schemas](#2-entities--schemas)
3. [Routes & Endpoints](#3-routes--endpoints)
4. [Frontend Routes](#4-frontend-routes)
5. [Permission System](#5-permission-system)
6. [Design Issues & Observations](#6-design-issues--observations)

---

## 1. Technology Stack

### Original (Legacy)

| Layer | Technology |
|-------|------------|
| Frontend | Angular 16, TypeScript 4.9 |
| UI | Experian Design System + Angular Material 16 |
| Auth | Okta SAML SSO + custom IAM JWT token |
| Testing | Jest 29 |
| Deployment | Docker, Kubernetes + Helm + Argo Rollouts, Jenkins CI/CD |

### New (Planned / In Progress)

| Layer | Technology |
|-------|------------|
| Frontend | Vue 3 or React 18 + Vite, TypeScript 5 |
| UI | shadcn/vue or shadcn/ui |
| State | Pinia (Vue) or Zustand (React) |
| API Client | tRPC v11 + TanStack Query |
| Backend | Node.js 22 LTS, Hono 4.x |
| API Layer | tRPC v11 |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Auth (JWT) | jose |
| Validation | Zod (shared via `packages/api`) |
| Monorepo | pnpm workspaces |

---

## 2. Entities & Schemas

All entity and field names below use the **current Portuguese naming** as specified.

### 2.1 Core Domain Entities

#### Modelo (Scoring Model)

Main entity for credit scoring model lifecycle management.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | string | Primary key |
| `nome` | string | Model name |
| `descricaoModelo` | string | Description |
| `cliente` | Cliente | Client reference |
| `cnpj` | string | CNPJ stored at model level |
| `nomeCliente` | string | Denormalized client name |
| `gerenteProduto` | PmResponsavel | Product manager |
| `grupoEstrategico` | string | Strategic group |
| `areaProprietaria` | AreaProprietaria | Owner area |
| `publico` | Publico | Audience |
| `tipoProduto` | TipoProduto | Product type |
| `tipoCobranca` | TipoCobranca | Charge type |
| `status` | StatusModelo | Model status |
| `dataInicio` | string | Start date |
| `dataTermino` | Date | End date |
| `dataDragonizacao` | string | Dragonization (go-live) date |
| `idadeModelo` | number | Model age in months |
| `canais` | Canal[] | Channels (M2M) |
| `flatFee` | boolean | Flat fee billing |
| `frequenciaExecucao` | FrequenciaExecucao | Execution frequency |
| `tipoExecucao` | TipoExecucao | Execution type |
| `ambientesImplantacao` | AmbienteImplantacao[] | Deployment environments |
| `bureau` | Bureau | Credit bureau |
| `plataformas` | Plataforma[] | Platforms (M2M) |
| `books` | Book[] | Books (M2M) |
| `rangeInicial` | number | Score range start |
| `rangeFinal` | number | Score range end |
| `retornaFlag` | boolean | Returns flag |
| `meioAcessoApi` | boolean | API access |
| `meioAcessoBatch` | boolean | Batch access |
| `meioAcessoMenuProdutos` | boolean | Menu products access |
| `meioAcessoString` | boolean | String access |
| `backtest` | boolean | Has backtest |
| `showroomBizDev` | boolean | Showroom BizDev flag |
| `autoExclusao` | boolean | Auto exclusion |
| `disponivelDelivery` | boolean | Available for delivery |
| `recalibragem` | boolean | Recalibration |
| `variaveisCliente` | boolean | Client variables |
| `grandesVolumes` | boolean | High volume |
| `entregasRecorrentes` | boolean | Recurring deliveries |
| `dependenciaModelos` | boolean | Has model dependencies |
| `modelos` | Modelo[] | Dependent models |
| `transacoes` | Transacao[] | Linked transactions |
| `finalidade` | Finalidade | Purpose |
| `perfilPublico` | PerfilPublico | Public profile |
| `filtrosAplicados` | string | Applied filters |
| `regrasEspecificas` | string | Specific rules |
| `observacao` | string | Notes |
| `texto` | string | Free text |

**Relationships:** M:1 with Cliente, StatusModelo, TipoProduto, TipoCobranca, TipoExecucao, FrequenciaExecucao, Bureau, AreaProprietaria, Publico, Finalidade, PerfilPublico, UnidadeNegocio, PmResponsavel; M2M with Canal, Plataforma, Book, MeioAcesso, AmbienteImplantacao; self-referential via dependenciaModelos; M2M with Transacao.

---

#### Cliente

| Field | Type |
|-------|------|
| `_id` | string |
| `nome` | string |
| `cnpj` | string |

---

#### Perfil (Role)

| Field | Type |
|-------|------|
| `_id` | string |
| `nome` | string |
| `recursos` | Recurso[] |

**Relationships:** M2M with Recurso via PerfilRecurso.

---

#### Recurso (Permission)

| Field | Type |
|-------|------|
| `_id` | string |
| `nome` | string (permission code) |
| `descricao` | string |

---

#### Category (Categoria)

| Field | Type |
|-------|------|
| `_id` | string |
| `categoryName` | string |
| `categoryDescription` | string |
| `percentage` | number |

---

#### Bucket (Balde)

| Field | Type |
|-------|------|
| `_id` | string |
| `nome` | string |
| `descricao` | string |

**Relationships:** M:1 with Category (implied by quota allocation).

---

#### Faturamento (Billing Type)

| Field | Type |
|-------|------|
| `_id` | string |
| `descricao` | string |
| `codigo` | number |

---

#### Transacao (Transaction)

| Field | Type |
|-------|------|
| `_id` | string |
| `codigo` | string |
| `descricao` | string |
| `detalheCanal` | DetalheCanal |
| `faturamento` | Faturamento |
| `modelos` | Modelo[] |
| `unidadeNegocio` | UnidadeNegocio |
| `areaProprietaria` | AreaProprietaria |
| `tipoCobranca` | TipoCobranca |
| `meioAcesso` | MeioAcesso |

---

### 2.2 Reference / Lookup Entities

All extend base shape: `_id`, `descricao`. Fetched from `/lista` endpoint.

| Entity | Extra Fields |
|--------|--------------|
| StatusModelo | — |
| TipoProduto | `color` |
| TipoExecucao | — |
| TipoCobranca | — |
| FrequenciaExecucao | — |
| AmbienteImplantacao | — |
| AreaProprietaria | — |
| Publico | — |
| Bureau | — |
| Plataforma | — |
| Canal | — |
| DetalheCanal | — |
| PmResponsavel | — |
| PerfilPublico | — |
| UnidadeNegocio | — |
| MeioAcesso | — |
| Meses | — |
| Finalidade | — |
| Book | `nome` |

---

### 2.3 Processing & History (to be removed in new architecture)

#### DagExecucaoDto (DAG Execution)

| Field | Type |
|-------|------|
| dagRunId | string |
| dagId | string |
| startDate | string |
| endDate | string |
| state | string |
| executionTime | string |
| failedAt | string \| null |
| modelo | Modelo[] |

---

#### HistoricoConsultaItem (Query History)

| Field | Type |
|-------|------|
| _id | string |
| modelo | string |
| dataConsulta | string |
| quantidadeConsultas | number |

---

### 2.4 Dashboard Types (to be removed in new architecture)

- `DashboardMacroDto`, `DashboardMacroModelo`, `DashboardMacroModeloSmm`
- `DashboardMacroTotalMsu`, `DashboardMacroMaisDemorado`, `DashboardMacroMaisFaturamento`
- `DashboardMacroModeloAws`, `DashboardMacroScoreBatch`, `DashboardMacroViaBatch`
- `CustoAwsMensalDto`, `FiltroCustoAwsDto`

---

### 2.5 Admin Entities

#### User (local mirror of Okta)

| Field | Type |
|-------|------|
| id | string |
| email | string |
| fullName | string |
| username | string |
| isActive | boolean |
| lastLoginAt | string \| null |
| firstLoginAt | string \| null |
| createdAt | string |
| updatedAt | string |
| perfis | PerfilSummary[] |
| invitedBy | string \| null |
| invitedAt | string \| null |

---

#### UserInvitation

| Field | Type |
|-------|------|
| id | string |
| email | string |
| invitedBy | string |
| invitedByName | string |
| perfilIds | string[] |
| status | PENDING \| ACCEPTED \| EXPIRED \| CANCELLED |
| token | string |
| message | string \| null |
| createdAt | string |
| expiresAt | string |
| acceptedAt | string \| null |

---

#### AuditLogEntry

| Field | Type |
|-------|------|
| id | string |
| actorId | string |
| actorName | string |
| action | AuditAction |
| entityType | AuditEntityType |
| entityId | string |
| entityLabel | string |
| changes | AuditFieldChange[] |
| ipAddress | string |
| userAgent | string |
| timestamp | string |
| metadata | Record \| null |

---

#### AnalyticsEvent

| Field | Type |
|-------|------|
| sessionId | string |
| userId | string |
| eventType | AnalyticsEventType |
| page | string |
| referrer | string \| null |
| entityType | string (optional) |
| entityId | string (optional) |
| featureName | string (optional) |
| actionLabel | string (optional) |
| duration | number (optional) |
| loadTime | number (optional) |
| metadata | Record (optional) |
| timestamp | string |

---

#### ShowroomEntry

| Field | Type |
|-------|------|
| id | string |
| modeloId | string |
| modeloNome | string |
| modeloStatus | string |
| addedAt | string |
| addedBy | string |
| addedByName | string |
| isFeatured | boolean |
| featuredPosition | number \| null |

---

#### ShowroomFeatured

| Field | Type |
|-------|------|
| id | string |
| modeloId | string |
| modeloNome | string |
| modeloStatus | string |
| position | number |
| addedAt | string |
| addedBy | string |
| addedByName | string |
| pinnedUntil | string \| null |

---

#### ShowroomConfig

| Field | Type |
|-------|------|
| id | string (singleton) |
| maxFeatured | number |
| autoSyncFromFlag | boolean |
| poolTitle | string |
| featuredTitle | string |
| updatedAt | string |
| updatedBy | string |

---

### 2.6 Supporting Types

- `ModelCommit`, `ModelChange` — audit history for models
- `PaginatedResponse<T>` — generic paginated wrapper
- `UserInfoPayload` — from IAM
- `ConfigsList` — all lookup lists from `/lista`

---

## 3. Routes & Endpoints

### 3.1 tRPC Router Tree

```
appRouter
├── auth.me
├── auth.renewToken
├── security.me
├── modelos.list
├── modelos.getById
├── modelos.getHistory
├── modelos.getFaturamento
├── modelos.create
├── modelos.update
├── modelos.sync
├── modelos.syncOne
├── modelos.dashboard
├── perfis.list | getById | create | update | delete
├── recursos.list | listAll | getById | create | update | delete
├── clientes.list | getByCnpj
├── faturamentos.list | listAll | getById | getByCodigo | create | update
├── transacoes.list | getById | create | update
├── processamento.list
├── historico.list | grafico
├── showroom.list | top5 | relatorios
├── categorias.list | listAll | getById | create | update
├── baldes.list | listAll | getById | getEditInfo | create | update
├── dashboard.consolidado | macro | msu | smm | scoreBatch | maisConsultas | custoAws
├── lista.all
└── admin.*
    ├── stats
    ├── users.*
    ├── invitations.*
    ├── perfis.*
    ├── recursos.*
    ├── entities.*
    ├── showroom.*
    ├── analytics.*
    └── auditLog.*
```

### 3.2 REST Endpoints (File Uploads)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/upload/template` | Upload model template file |
| POST | `/upload/validate-variables` | Validate model variable files |

---

## 4. Frontend Routes

### Public

| Path | Page |
|------|------|
| `/login` | AuthCallbackPage |
| `/sign-in` | SignInPage |

### Private

| Path | Page | Permission |
|------|------|------------|
| `/home` | Redirect to dashboard | — |
| `/modelos/dashboard` | ModelDashboardPage | TELA_DASHBOARD |
| `/modelos/inventario` | ModelInventoryPage | TELA_CONSULTA_MODELO |
| `/modelos/cadastro` | ModelCreatePage | write |
| `/modelos/editar/:id` | ModelEditPage | write |
| `/modelos/visualizar/:id` | ModelViewPage | TELA_CONSULTA_MODELO |
| `/modelos/sync` | ModelSyncPage | TELA_SINCRONIZACAO |
| `/modelos/jobs` | SyncJobsPage | TELA_JOBS |
| `/historico/consulta` | QueryHistoryPage | TELA_HISTORICO_CONSULTAS |
| `/historico/:id` | QueryHistoryDetailPage | TELA_HISTORICO_CONSULTAS |
| `/categorias/consulta` | CategoryListPage | TELA_CATEGORIAS |
| `/categorias/cadastro` | CategoryCreatePage | write |
| `/categorias/:id` | CategoryEditPage | write |
| `/baldes` | BucketListPage | TELA_CONSULTA_BALDE |
| `/baldes/novo` | BucketCreatePage | write |
| `/baldes/:id` | BucketEditPage | write |
| `/showroom` | ShowroomQueryPage | SHOWROOM_CONSULTA |
| `/showroom/relatorios` | ShowroomReportsPage | SHOWROOM_RELATORIOS |
| `/showroom/modelos` | ShowroomModelsPage | SHOWROOM_MODELOS |
| `/perfis/consulta` | ProfileListPage | TELA_CONSULTA_PERFIL |
| `/perfis/cadastro` | ProfileCreatePage | write |
| `/perfis/:id` | ProfileEditPage | write |
| `/recursos/consulta` | ResourceListPage | TELA_CONSULTA_RECURSO |
| `/recursos/cadastro` | ResourceCreatePage | write |
| `/recursos/:id` | ResourceEditPage | write |

### Admin

| Path | Page | Permission |
|------|------|------------|
| `/admin` | AdminDashboardPage | ADMIN_DASHBOARD |
| `/admin/usuarios` | UserListPage | ADMIN_USUARIOS_VIEW |
| `/admin/usuarios/:id` | UserDetailPage | ADMIN_USUARIOS_VIEW |
| `/admin/convites` | InvitationListPage | ADMIN_USUARIOS_MANAGE |
| `/admin/convites/novo` | InvitationCreatePage | ADMIN_USUARIOS_MANAGE |
| `/admin/perfis` | ProfileListPage | ADMIN_PERFIS_VIEW |
| `/admin/perfis/novo` | ProfileCreatePage | ADMIN_PERFIS_MANAGE |
| `/admin/perfis/:id` | ProfileEditPage | ADMIN_PERFIS_MANAGE |
| `/admin/recursos` | ResourceListPage | ADMIN_RECURSOS_VIEW |
| `/admin/recursos/novo` | ResourceCreatePage | ADMIN_RECURSOS_MANAGE |
| `/admin/recursos/:id` | ResourceEditPage | ADMIN_RECURSOS_MANAGE |
| `/admin/entidades` | EntityHubPage | ADMIN_ENTIDADES_VIEW |
| `/admin/entidades/:entity` | EntityListPage | ADMIN_ENTIDADES_VIEW |
| `/admin/entidades/:entity/novo` | EntityCreatePage | ADMIN_ENTIDADES_MANAGE |
| `/admin/entidades/:entity/:id` | EntityEditPage | ADMIN_ENTIDADES_MANAGE |
| `/admin/showroom` | ShowroomAdminPage | ADMIN_SHOWROOM_VIEW |
| `/admin/analytics` | AnalyticsDashboardPage | ADMIN_ANALYTICS_VIEW |
| `/admin/analytics/paginas` | PageViewsReportPage | ADMIN_ANALYTICS_VIEW |
| `/admin/analytics/funcionalidades` | FeatureUsageReportPage | ADMIN_ANALYTICS_VIEW |
| `/admin/analytics/usuarios` | UserBehaviorReportPage | ADMIN_ANALYTICS_VIEW |
| `/admin/analytics/sessoes` | SessionReportPage | ADMIN_ANALYTICS_VIEW |
| `/admin/auditoria` | AuditLogPage | ADMIN_AUDITORIA_VIEW |

---

## 5. Permission System

### Menu-Level

| Code | Description |
|------|-------------|
| MENU_MODELOS | Models menu section |
| MENU_SOLUCOES_ANALITICAS | Analytical solutions menu |
| SHOWROOM_CONSULTA | Showroom menu |
| MENU_ADMIN | Admin menu |

### Page-Level

| Code | Description |
|------|-------------|
| TELA_DASHBOARD | Dashboard screen |
| TELA_CONSULTA_MODELO | Model list/view |
| TELA_SINCRONIZACAO | Sync screen |
| TELA_JOBS | Jobs screen |
| TELA_HISTORICO_CONSULTAS | Query history |
| TELA_CATEGORIAS | Categories |
| TELA_CONSULTA_BALDE | Buckets |
| SHOWROOM_CONSULTA | Showroom query |
| SHOWROOM_RELATORIOS | Showroom reports |
| SHOWROOM_MODELOS | Showroom models |
| TELA_CONSULTA_PERFIL | Roles list |
| TELA_CONSULTA_RECURSO | Permissions list |

### Admin

| Code | Description |
|------|-------------|
| SUPER_ADMIN | Access to /admin |
| ADMIN_DASHBOARD | Admin dashboard |
| ADMIN_USUARIOS_VIEW | View users |
| ADMIN_USUARIOS_MANAGE | Manage users, invitations |
| ADMIN_PERFIS_VIEW | View roles |
| ADMIN_PERFIS_MANAGE | Manage roles |
| ADMIN_RECURSOS_VIEW | View permissions |
| ADMIN_RECURSOS_MANAGE | Manage permissions |
| ADMIN_ENTIDADES_VIEW | View support entities |
| ADMIN_ENTIDADES_MANAGE | Manage support entities |
| ADMIN_SHOWROOM_VIEW | View showroom admin |
| ADMIN_SHOWROOM_MANAGE | Manage showroom |
| ADMIN_ANALYTICS_VIEW | View analytics |
| ADMIN_AUDITORIA_VIEW | View audit log |

---

## 6. Design Issues & Observations

### Naming

- **Domain language is Portuguese** — entity names (Modelo, Perfil, Recurso, Faturamento, Transacao, Categoria, Balde, etc.), field names (descricao, nome, dataInicio, dataTermino), and route paths (/modelos, /perfis, /recursos) are all in Portuguese.
- **Inconsistent ID field** — some entities use `_id` (MongoDB-style), others use `id`.
- **Mixed terminology** — "Perfil" vs "Role", "Recurso" vs "Permission", "Balde" vs "Bucket" used interchangeably in docs.

### Architecture

- **tRPC coupling** — Frontend and backend share the same router type; switching to REST would require significant refactoring.
- **No clear module boundaries** — Routers are flat; admin procedures live under `admin.*` but main app procedures are at root level.
- **Billing/domain entanglement** — Faturamento, Transacao, ModeloFaturamentoDto, and dashboard cost/volume endpoints are tightly coupled to the core model domain.

### Data Model

- **Redundant fields** — Modelo stores both `cliente` (object) and `cnpj`/`nomeCliente` (denormalized). Same pattern in ShowroomEntry (modeloId + modeloNome + modeloStatus).
- **Access method booleans** — `meioAcessoApi`, `meioAcessoBatch`, etc. could be replaced by a single `accessMethods[]` relation to MeioAcesso.
- **M2M junction tables** — PostgreSQL schema uses implicit M2M; MongoDB would require explicit junction collections.

### Removed in New Architecture

The following are present in the current state but will be **excluded** from the new application:

- **Billing:** Faturamento, Transacao, ModeloFaturamentoDto, faturamentos.*, transacoes.*, modelos.getFaturamento
- **Processing:** DagExecucaoDto, processamento.list
- **History:** HistoricoConsultaItem, historico.list, historico.grafico
- **Dashboard:** dashboard.consolidado, dashboard.macro, dashboard.msu, dashboard.smm, dashboard.scoreBatch, dashboard.maisConsultas, dashboard.custoAws
- **Cost:** CustoAwsMensalDto, FiltroCustoAwsDto, Custo, CustoAws

---

*End of CURRENT_STATE_ANALYSIS.md*
