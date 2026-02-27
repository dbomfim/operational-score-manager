# OSM — Operational Score Manager: Full Project Instructions

> **Purpose of this file:** Complete specification to re-implement this project as a full-stack TypeScript application. Contains all entities, types, tRPC procedure contracts, routes, auth flows, business rules, and deployment details. Every schema is strictly typed and shared between frontend and backend via Zod.

> **Admin Module:** See companion file [`ADMIN_MODULE.md`](./ADMIN_MODULE.md) for the full Admin module specification.
> **Architecture Decision:** See [`ARCHITECTURE_DECISIONS.md`](./ARCHITECTURE_DECISIONS.md) for the reasoning behind choosing tRPC over REST and GraphQL.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack — Original & Recommendations](#2-tech-stack)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Environment Variables](#4-environment-variables)
5. [API Base URLs & Configuration](#5-api-base-urls--configuration)
6. [All TypeScript Types & Schemas](#6-all-typescript-types--schemas)
7. [Full API Specification](#7-full-api-specification)
8. [Application Routes & Pages](#8-application-routes--pages)
9. [Permission System (RBAC)](#9-permission-system-rbac)
10. [Frontend Implementation Guide](#10-frontend-implementation-guide)
11. [State & Caching Strategy](#11-state--caching-strategy)
12. [Docker & Deployment](#12-docker--deployment)

---

## 1. Project Overview

**Name:** OSM — Operational Score Manager (internal name: `experian-score-web-front`)
**Domain:** Credit scoring model lifecycle management for the Brazilian credit bureau market (Serasa Experian).
**Version:** 2.2.30

### What it does

OSM is a back-office web application used by internal teams to:

- **Manage scoring models** (credit score / risk score models): create, edit, view, activate, deactivate, and synchronise models from external sources.
- **Track model history** (audit log of every change to a model, commit-style).
- **Manage analytical solutions** — quota categories and quota buckets used for API rate-limiting.
- **View the Showroom** — an analytics module that shows which models were queried, by whom, with what documents.
- **View query history** — chronological log of all API calls made against models.
- **Manage profiles (roles) and resources (permissions)** — custom RBAC system.
- **View billing and transactions** linked to models (read-only access, data managed elsewhere).
- **View processing/DAG executions** of model pipelines (Apache Airflow DAG runs).
- **Dashboard & macro analytics** — charts and KPIs for model usage, AWS costs, MSU volumes.

---

## 2. Tech Stack

### Original Stack

| Layer | Technology |
|---|---|
| Frontend framework | Angular 16 |
| Language | TypeScript 4.9 |
| UI component library | Experian Design System + Angular Material 16 |
| Authentication | Okta SAML SSO + custom IAM token |
| JWT handling | @auth0/angular-jwt |
| Charts | Chart.js 3 + chartjs-plugin-datalabels |
| Date handling | Luxon 2 |
| Input masking | ngx-mask |
| File export | file-saver, export-to-csv |
| HTTP client | Angular HttpClient |
| Build tool | Angular CLI + Custom Webpack 5 |
| Test framework | Jest 29 + jest-preset-angular |
| Container | Docker (multi-stage), Nginx 1.29-alpine |
| Orchestration | Kubernetes + Helm + Argo Rollouts |
| CI/CD | Jenkins + PiaaS |
| Code quality | SonarQube |
| Security scan | Veracode |

### Chosen Stack — Full-Stack TypeScript Monorepo with tRPC

See [`ARCHITECTURE_DECISIONS.md`](./ARCHITECTURE_DECISIONS.md) for the full rationale (REST vs GraphQL vs tRPC).

#### Frontend

| Layer | Vue 3 option | React option |
|---|---|---|
| Framework | Vue 3 + Vite | React 18 + Vite |
| Language | TypeScript 5 | TypeScript 5 |
| UI components | shadcn/vue or Vuetify 3 | shadcn/ui or MUI v5 |
| Routing | Vue Router 4 | React Router v6 |
| State management | Pinia | Zustand |
| API client | @trpc/client + @tanstack/vue-query | @trpc/client + @tanstack/react-query |
| Forms + validation | vee-validate + zod | react-hook-form + zod |
| Charts | Vue-chartjs or echarts | react-chartjs-2 or recharts |
| Date handling | date-fns | date-fns |
| File export | FileSaver.js, Papa Parse | FileSaver.js, Papa Parse |
| Drag and drop | vue-draggable-plus | @dnd-kit/core |
| File uploads | Native `fetch` (multipart REST) | Native `fetch` (multipart REST) |
| Testing | Vitest + Vue Testing Library | Vitest + React Testing Library |
| Build | Vite | Vite |
| Container | Docker + Nginx | Docker + Nginx |

#### Backend (new — built from scratch)

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Language | TypeScript 5 |
| Server framework | Hono (lightweight, edge-ready, TypeScript-first) |
| API layer | tRPC v11 (`@trpc/server`) |
| Validation | Zod (shared with frontend via `packages/api`) |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Auth (JWT validation) | jose |
| Email (invitations) | Resend (or Nodemailer + SMTP) |
| File storage | AWS S3 (via `@aws-sdk/client-s3`) |
| Testing | Vitest |
| Container | Docker |

#### Monorepo Structure

```
/
├── apps/
│   ├── frontend/          # Vue 3 or React app
│   └── backend/           # Hono + tRPC server
└── packages/
    └── api/               # Shared tRPC router type + Zod schemas
                           # Imported by both frontend and backend
```

---

## 3. Authentication & Authorization

### Overview

The application uses **two-layer authentication**:

1. **Okta SAML SSO** — the entry point. The user is redirected to an Okta identity provider URL. On successful SSO, Okta redirects to `/login?token=<JWT>&userId=<id>`.
2. **IAM JWT Token** — a custom Experian IAM JWT token passed via query param on the redirect. This token is stored in `localStorage` and sent as `Authorization: Bearer <token>` on every API request.

### Token Lifecycle

```
User visits app
  → if no token: redirect to Okta SAML URL
  → Okta authenticates user
  → Okta redirects to /login?token=<accessToken>&userId=<userId>
  → App extracts token from query params
  → App stores token in localStorage
  → App fetches user profile from IAM /me endpoint
  → App redirects to /modelos/dashboard
```

### Token Renewal

When the token is nearing expiration (detected via JWT exp claim):
- Call `POST {IAM_ROOT}/security/iam/v1/user-identities/renew-app-token`
- Include `{ originClientId, clientId }` in the body
- Store the new token in localStorage

### JWT Token Payload

```typescript
interface AccessTokenPayload {
  app_id: string;
  business_id: string;
  client_id: string;
  client_id_default: string;
  customer_id: number;
  exp: number;           // Unix timestamp expiry
  iat: number;           // Unix timestamp issued-at
  jti: string;           // JWT ID
  scope: string[];
  service_id: string;
  user_id: string;
  authorities: string[]; // Permission strings
}
```

### HTTP Interceptor Rule

Every outgoing HTTP request must include:

```
Authorization: Bearer <accessToken>
```

### Route Guard Logic

Before navigating to any private route:
1. Decode the JWT. If expired or absent, redirect to sign-in.
2. Fetch user resources (permissions) from `GET /api/score-manager/v1/security/recursos`.
3. Cache user resources in `sessionStorage` as base64-encoded JSON for 4 hours.
4. For each route, check if the required permission resource code is present in the user's resources list.
5. If not present, show an "unauthorized access" modal / redirect.

### Okta SAML URL Pattern

```
https://<OKTA_BASE_URL>/saml2/authenticate/<SERVICE_PROVIDER_ID>
```

---

## 4. Environment Variables

All values are injected via environment files (`.env.local` for dev, Docker env vars for production). Never commit secrets.

#### Frontend environment variables (`apps/frontend/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_TRPC_URL` | tRPC backend endpoint | `http://localhost:3000/trpc` |
| `VITE_UPLOAD_URL` | REST file upload endpoint | `http://localhost:3000/upload` |
| `VITE_OKTA_SAML_URL` | Okta SAML base URL | `https://digital-sso-saml-nonprod.serasaexperian.com.br/saml2/authenticate/` |
| `VITE_OKTA_SERVICE_PROVIDER_ID` | Okta service provider ID | `experian-score-manager-model-local` |

#### Backend environment variables (`apps/backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/osm` |
| `PORT` | HTTP server port | `3000` |
| `NODE_ENV` | Environment | `development` \| `production` |
| `JWT_SECRET` | Secret for signing internal tokens (if any) | 256-bit random string |
| `IAM_ACCOUNT_URL` | Okta/IAM account base URL | `https://uat-api.serasaexperian.com.br` |
| `IAM_ROOT_URL` | IAM root base URL | `https://uat-api.serasaexperian.com.br` |
| `IAM_ORIGIN_CLIENT_ID` | Okta origin client ID | `5ecfba0b3ea4e5292baf9b4c` |
| `IAM_CLIENT_ID` | OAuth client ID | `6012c351cc74d81973961b7b` |
| `OKTA_SAML_URL` | Okta SAML base URL | `https://digital-sso-saml-nonprod.serasaexperian.com.br/saml2/authenticate/` |
| `OKTA_SERVICE_PROVIDER_ID` | Service provider ID | `experian-score-manager-model-local` |
| `AWS_REGION` | AWS region for S3 | `us-east-1` |
| `AWS_S3_BUCKET` | S3 bucket for file uploads | `osm-files-dev` |
| `AWS_ACCESS_KEY_ID` | AWS credentials | — |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | — |
| `EMAIL_FROM` | Sender address for invitations | `noreply@osm.example.com` |
| `RESEND_API_KEY` | Resend API key (or SMTP config) | — |
| `APP_URL` | Public frontend URL (used in invite emails) | `https://osm.example.com` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:5173` |

---

## 5. tRPC Router Structure

The entire API surface (except file uploads) is exposed through a single tRPC router. The frontend calls procedures; there are no URLs to manage, no HTTP verbs to remember, no type drift.

### Transport

- **tRPC endpoint:** `{VITE_TRPC_URL}` (e.g. `http://localhost:3000/trpc`)
- **File upload endpoint (REST):** `{VITE_UPLOAD_URL}/template` and `{VITE_UPLOAD_URL}/validate-variables`
- External Okta/IAM calls are made **from the backend only** — the frontend never touches IAM directly.

### Router Tree

Every leaf is either a `query` (read, GET semantics) or a `mutation` (write, POST semantics). Input/output types are defined in Section 6 and enforced by Zod schemas in `packages/api`.

```
appRouter
├── auth
│   ├── me                      query  → UserInfoPayload
│   └── renewToken              mutation → { accessToken: string }
│
├── lista
│   └── all                     query  → ConfigsList
│
├── security
│   └── myResources             query  → Recurso[]
│
├── modelos
│   ├── list                    query(page, size, sort?, filter?)      → PaginatedResponse<ResponseDashboardDadosDto>
│   ├── getById                 query(id)                              → Modelo
│   ├── getHistory              query(id)                              → ModelCommit[]
│   ├── getFaturamento          query(id, dataInicio, dataFim)         → ModeloFaturamentoDto[]
│   ├── create                  mutation(ModeloDto)                    → Modelo
│   ├── update                  mutation(id, ModeloDto)                → Modelo
│   ├── sync                    mutation(modeloIds: string[])          → { synced: number }
│   ├── syncOne                 mutation(id)                           → Modelo
│   └── dashboard               query(filter?)                        → ModeloDashboardDto[]
│
├── perfis
│   ├── list                    query(page, size, search?)             → PaginatedResponse<Perfil>
│   ├── getById                 query(id)                              → Perfil
│   ├── create                  mutation(PerfilDto)                    → Perfil
│   ├── update                  mutation(id, PerfilDto)                → Perfil
│   └── delete                  mutation(id)                          → { success: boolean }
│
├── recursos
│   ├── list                    query(page, size, search?)             → PaginatedResponse<Recurso>
│   ├── listAll                 query()                                → Recurso[]
│   ├── getById                 query(id)                              → Recurso
│   ├── create                  mutation(RecursoDto)                   → Recurso
│   ├── update                  mutation(id, RecursoDto)               → Recurso
│   └── delete                  mutation(id)                          → { success: boolean }
│
├── clientes
│   ├── list                    query()                                → Cliente[]
│   └── getByCnpj               query(cnpj)                           → Cliente
│
├── faturamentos
│   ├── list                    query(page, size)                      → PaginatedResponse<Faturamento>
│   ├── listAll                 query()                                → Faturamento[]
│   ├── getById                 query(id)                              → Faturamento
│   ├── getByCodigo             query(codigo: number)                  → Faturamento
│   ├── create                  mutation(FaturamentoDto)               → Faturamento
│   └── update                  mutation(id, FaturamentoDto)           → Faturamento
│
├── transacoes
│   ├── list                    query(page, size, filter?)             → PaginatedResponse<Transacao>
│   ├── getById                 query(id)                              → Transacao
│   ├── create                  mutation(TransacaoDto)                 → Transacao
│   └── update                  mutation(id, TransacaoDto)             → Transacao
│
├── processamento
│   └── list                    query(page, size, sort?, filter?)      → PaginatedResponse<DagExecucaoDto>
│
├── historico
│   ├── list                    query(page, size, sort?, filter?)      → PaginatedResponse<HistoricoConsultaItem>
│   └── grafico                 query(filter)                          → HistoricoConsultaGrafico[]
│
├── showroom
│   ├── list                    query(page, size, filter?)             → ShowroomResponse
│   ├── top5                    query()                                → ShowroomTopModelo[]
│   └── relatorios              query(dataInicio, dataFim)             → ShowroomRelatorio[]
│
├── categorias
│   ├── list                    query(page, size)                      → PaginatedResponse<Category>
│   ├── listAll                 query()                                → Category[]
│   ├── getById                 query(id)                              → Category
│   ├── create                  mutation(CategoryDto)                  → Category
│   └── update                  mutation(id, CategoryDto)              → Category
│
├── baldes
│   ├── list                    query(page, size)                      → PaginatedResponse<Bucket>
│   ├── listAll                 query()                                → Bucket[]
│   ├── getById                 query(id)                              → Bucket
│   ├── getEditInfo             query(id)                              → BucketEditInfo
│   ├── create                  mutation(BucketDto)                    → Bucket
│   └── update                  mutation(id, BucketDto)                → Bucket
│
├── dashboard
│   ├── consolidado             query(filter?)                         → ModeloDashboardDto[]
│   ├── macro                   query(dataInicio, dataFim)             → DashboardMacroModelo[]
│   ├── msu                     query(dataInicio, dataFim)             → DashboardMacroTotalMsu[]
│   ├── smm                     query(dataInicio, dataFim)             → DashboardMacroModeloSmm[]
│   ├── scoreBatch              query(dataInicio, dataFim)             → DashboardMacroScoreBatch[]
│   ├── maisConsultas           query(dataInicio, dataFim, limit?)     → DashboardMacroViaBatch[]
│   └── custoAws                query(FiltroCustoAwsDto)               → CustoAwsMensalDto[]
│
└── admin                       (see ADMIN_MODULE.md for full admin sub-router)
    ├── stats                   query()                                → AdminStats
    ├── users.*
    ├── invitations.*
    ├── perfis.*
    ├── recursos.*
    ├── entities.*
    ├── showroom.*
    ├── analytics.*
    └── auditLog.*
```

### File Upload Endpoints (REST — not tRPC)

These two endpoints remain as plain REST because tRPC does not handle multipart file uploads.

| Method | Path | Description |
|---|---|---|
| `POST` | `/upload/template` | Upload a model template file. Multipart form-data. Fields: `file` (File), `modeloId` (string). Returns `{ filename, url, size }`. |
| `POST` | `/upload/validate-variables` | Upload and validate model variable files. Returns `{ valid, errors[], variables[] }`. |

---

## 6. All TypeScript Types & Schemas

### 6.1 Primitive / Reference Lookup Types

All lookup/reference types share the same base shape. They are fetched from the `/lista` endpoint and cached in localStorage.

```typescript
// Base for all reference entities fetched from the API
interface LookupEntity {
  _id: string;
  descricao: string;
}

// Extends LookupEntity with a color field
interface TipoProduto extends LookupEntity {
  _id: string;
  descricao: string;
  color: string;           // CSS color string for chip/badge display
}

// All of the following extend LookupEntity with only _id and descricao:
type StatusModelo        = LookupEntity;  // e.g. { _id: 'ATIVO', descricao: 'Ativo' }
type TipoExecucao        = LookupEntity;  // e.g. { _id: 'BATCH', descricao: 'Batch' }
type TipoCobranca        = LookupEntity;
type FrequenciaExecucao  = LookupEntity;
type AmbienteImplantacao = LookupEntity;
type AreaProprietaria    = LookupEntity;
type Publico             = LookupEntity;
type Bureau              = LookupEntity;
type Plataforma          = LookupEntity;
type Canal               = LookupEntity;
type DetalheCanal        = LookupEntity;
type PmResponsavel       = LookupEntity;  // Product Manager / Responsible person
type PerfilPublico       = LookupEntity;
type UnidadeNegocio      = LookupEntity;
type MeioAcesso          = LookupEntity;
type Meses               = LookupEntity;
type Finalidade          = LookupEntity;

// Book has an extra nome field
interface Book extends LookupEntity {
  _id: string;
  descricao: string;
  nome: string;
}
```

### 6.2 Client

```typescript
interface Cliente {
  _id: string;
  nome: string;
  cnpj: string;          // Brazilian company tax ID (14-digit string)
}
```

### 6.3 Scoring Model (Modelo) — Core Entity

```typescript
interface Modelo {
  _id: string;
  nome: string;
  descricaoModelo: string;

  // Client link
  cliente: Cliente;
  cnpj: string;          // CNPJ stored at model level for searching
  nomeCliente: string;

  // Product characteristics
  gerenteProduto: PmResponsavel;
  grupoEstrategico: string;
  areaProprietaria: AreaProprietaria;
  publico: Publico;
  tipoProduto: TipoProduto;
  tipoCobranca: TipoCobranca;
  status: StatusModelo;

  // Dates (ISO 8601 strings or Date)
  dataInicio: string;      // Start date
  dataTermino: Date;       // End date
  dataDragonizacao: string; // "Dragonization" date (go-live/launch date)
  idadeModelo: number;     // Age of model in months

  // Commercial config
  canais: Canal[];
  flatFee: boolean;

  // Technical characteristics
  frequenciaExecucao: FrequenciaExecucao;
  tipoExecucao: TipoExecucao;
  ambientesImplantacao: AmbienteImplantacao[];
  bureau: Bureau;
  plataformas: Plataforma[];
  books: Book[];

  // Score range
  rangeInicial: number;
  rangeFinal: number;
  retornaFlag: boolean;

  // Access channels (booleans)
  meioAcessoApi: boolean;
  meioAcessoBatch: boolean;
  meioAcessoMenuProdutos: boolean;
  meioAcessoString: boolean;

  // Feature flags
  backtest: boolean;
  showroomBizDev: boolean;
  autoExclusao: boolean;
  disponivelDelivery: boolean;
  recalibragem: boolean;
  variaveisCliente: boolean;
  grandesVolumes: boolean;
  entregasRecorrentes: boolean;

  // Dependencies
  dependenciaModelos: boolean;
  modelos: Modelo[];       // Dependent models

  // Linked data
  transacoes: Transacao[];
  finalidade: Finalidade;
  perfilPublico: PerfilPublico;

  // Free-text fields
  filtrosAplicados: string;
  regrasEspecificas: string;
  observacao: string;
  texto: string;
}
```

### 6.4 Create / Update Model DTO

Used as request body when creating or updating a model.

```typescript
interface ModeloDto {
  status: StatusModelo;
  nome: string;
  descricaoModelo: string;
  cnpj: string;
  nomeCliente: string;
  grupoEstrategico: string;
  areaProprietaria: AreaProprietaria;
  publico: Publico;
  tipoProduto: TipoProduto;
  tipoCobranca: TipoCobranca;
  dataInicio: string;       // Format: YYYY-MM-DD
  dataTermino: Date | null;
  dataDragonizacao: string; // Format: YYYY-MM-DD
  gerenteProduto: PmResponsavel;
  canais: Canal[];
  flatFee: boolean;
  frequenciaExecucao: FrequenciaExecucao;
  tipoExecucao: TipoExecucao;
  ambientesImplantacao: AmbienteImplantacao[];
  bureau: Bureau;
  rangeInicial: number;
  rangeFinal: number;
  retornaFlag: boolean;
  meioAcessoApi: boolean;
  meioAcessoBatch: boolean;
  meioAcessoMenuProdutos: boolean;
  meioAcessoString: boolean;
  plataformas: Plataforma[];
  books: Book[];
  backtest: boolean;
  showroomBizDev: boolean;
  autoExclusao: boolean;
  disponivelDelivery: boolean;
  recalibragem: boolean;
  variaveisCliente: boolean;
  grandesVolumes: boolean;
  entregasRecorrentes: boolean;
  filtrosAplicados: string;
  regrasEspecificas: string;
  dependenciaModelos: boolean;
  modelos: Modelo[];        // Array of dependent model references
  observacao: string;
  texto: string;
}

// Sub-DTO: Product characteristics section
interface CaracteristicaProdutoModeloDto {
  status: StatusModelo;
  nome: string;
  descricaoModelo: string;
  gerenteProduto: PmResponsavel;
  grupoEstrategico: string;
  cnpj: string;
  nomeCliente: string;
  areaProprietaria: AreaProprietaria;
  publico: Publico;
  tipoCobranca: TipoCobranca;
  tipoProduto: TipoProduto;
  dataInicio: string;
  dataDragonizacao: string;
  dataTermino: Date | null;
  idadeModelo: number;
  canais: Canal[];
  flatFee: boolean;
}

// Sub-DTO: Technical characteristics section
interface CaracteristicaTecnicaModeloDto {
  frequenciaExecucao: FrequenciaExecucao;
  tipoExecucao: TipoExecucao;
  ambientesImplantacao: AmbienteImplantacao[];
  meioAcessoApi: boolean;
  meioAcessoBatch: boolean;
  meioAcessoMenuProdutos: boolean;
  meioAcessoString: boolean;
  plataformas: Plataforma[];
  backtest: boolean;
  showroomBizDev: boolean;
  variaveisCliente: boolean;
  grandesVolumes: boolean;
  entregasRecorrentes: boolean;
  recalibragem: boolean;
  autoExclusao: boolean;
  disponivelDelivery: boolean;
  books: Book[];
  modelos: Modelo[];
  rangeInicial: number;
  rangeFinal: number;
  retornaFlag: boolean;
  bureau: Bureau;
  dependenciaModelos: boolean;
  filtrosAplicados: string;
  regrasEspecificas: string;
  texto: string;
  textoTransacoes: string;
}

// Sub-DTO: Observations section
interface ObservacaoModeloDto {
  observacao: string;
}
```

### 6.5 Model Filter DTO (for list/search)

```typescript
interface FiltroModeloDashboardDto {
  nomeModeloCnpjNomeCliente?: string; // Text search across name, CNPJ, client name
  dataInicio?: Date;
  dataFinal?: Date;
  status?: StatusModelo[];
  tiposProduto?: TipoProduto[];
  frequenciasExecucao?: FrequenciaExecucao[];
  areasProprietaria?: AreaProprietaria[];
  tiposCobranca?: TipoCobranca[];
  bureaus?: Bureau[];
  ambientesImplantacao?: AmbienteImplantacao[];
  publicos?: Publico[];
  tiposExecucao?: TipoExecucao[];
  books?: Book[];
}
```

### 6.6 Paginated Response (Generic)

```typescript
interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  size: number;
  number: number;           // current page (0-indexed)
  numberOfElements: number;
  empty: boolean;
  sort: {
    sorted: boolean;
    unsorted: boolean;
    empty: boolean;
  };
}

interface PageParams {
  page: number;             // 0-indexed
  size: number;             // e.g. 20, 50, 100
  sort?: string;            // field,direction e.g. "nome,asc"
}
```

### 6.7 Dashboard Model DTO

```typescript
interface ResponseDashboardDadosDto {
  modelo: string;           // model name
  cliente: Cliente;
  dataCriacao?: Date;
  dataAtualizacao?: Date;
  dataInicio: string;
  tipoProduto: TipoProduto;
  status?: StatusModelo;
  frequenciaExecucao: FrequenciaExecucao;
  gerenteProduto: PmResponsavel;
  dataTermino: string | null;
  dataDragonizacao: string | null;
  backtest?: boolean;
  showroomBizDev?: boolean;
  api?: boolean;
  batch?: boolean;
  monitoramento?: boolean;
  deployProducao?: boolean;
  observacao?: string;
  pessoaFisica?: boolean;
  pessoaJuridica?: boolean;
  books?: Book[];
  tipoExecucao: TipoExecucao;
  ambientesImplantacao: AmbienteImplantacao[];
  publico?: Publico;
  rangeInicial?: number;
  rangeFinal?: number;
  autoExclusao?: boolean;
}

interface TiposProdutoDashboard {
  tipoProduto: TipoProduto;
  dados: ResponseDashboardDadosDto[];
  valor: number;            // count or total
}

interface ModeloDashboardDto {
  referencia: string;       // e.g. "2024-01" (year-month reference)
  tiposProduto: TiposProdutoDashboard[];
}
```

### 6.8 Billing / Faturamento

```typescript
interface Faturamento extends LookupEntity {
  _id: string;
  descricao: string;
  codigo: number;           // numeric billing code
}

interface FaturamentoDto {
  codigo: number;
  descricao: string;
}

interface ModeloFaturamentoDto {
  valorParticipacao: number; // participation value
  valorFaturado: number;     // billed value
  data: Date;
}

interface FiltroModeloFaturamentoDto {
  dataInicio: Date;
  dataFim: Date;
  modelo: string;
}
```

### 6.9 Transaction / Transacao

```typescript
interface Transacao {
  _id: string;
  codigo: string;           // transaction code
  descricao: string;
  detalheCanal: DetalheCanal;
  faturamento: Faturamento;
  modelos: Modelo[];
  unidadeNegocio: UnidadeNegocio;
  areaProprietaria: AreaProprietaria;
  tipoCobranca: TipoCobranca;
  meioAcesso: MeioAcesso;
}

interface TransacaoDto {
  codigo: string;
  descricao: string;
  detalheCanal: DetalheCanal;
  faturamento: Faturamento;
  modelos: Modelo[];
  unidadeNegocio: UnidadeNegocio;
  areaProprietaria: AreaProprietaria;
  tipoCobranca: TipoCobranca;
  meioAcesso: MeioAcesso;
}

interface FiltroTransacaoDto {
  codigoTransacao?: string;
  faturamentos?: Faturamento[];
  unidadesNegocios?: UnidadeNegocio[];
  tiposCobranca?: TipoCobranca[];
  meioAcesso?: MeioAcesso;
  detalhesCanal?: DetalheCanal[];
}
```

### 6.10 Processing / DAG Execution

```typescript
// Apache Airflow DAG execution record
interface DagExecucaoDto {
  dagRunId: string;
  dagId: string;
  startDate: string;        // ISO 8601
  endDate: string;          // ISO 8601
  state: string;            // e.g. "success" | "failed" | "running"
  executionTime: string;    // Human-readable duration
  failedAt: string | null;
  modelo: Modelo[];
}

// Simplified processing model reference
interface ProcessamentoModelo {
  modelo: string;
  startDate: Date;
  endDate: Date;
  executionTime: string;
  state: string;
  failedAt: string | null;
}

interface FiltroDagExecucaoDto {
  modelo?: string;
  dataInicio?: Date;
  dataFinal?: Date;
}
```

### 6.11 Query History / Historico Consulta

```typescript
interface FiltroHistoricoConsultaDto {
  dataInicio?: string;      // ISO date string
  dataFim?: string;         // ISO date string
  modelo?: string;
}

interface FiltroGraficoHistoricoConsultaDto {
  dataInicio?: Date;
  dataFim?: Date;
  modelo?: string;
}

// A single history record (structure inferred from the API)
interface HistoricoConsultaItem {
  _id: string;
  modelo: string;
  dataConsulta: string;
  quantidadeConsultas: number;
}
```

### 6.12 Showroom

```typescript
interface HistoryItem {
  id: number;
  usuario: string;
  documento: string;        // CPF/CNPJ of queried entity
  email: string;
  dataConsulta: string;     // ISO 8601
  modelo: string;
  publico: string;
}

interface HistoryFilter {
  modelo?: string;
  documento?: string;
  usuario?: string;
  publico?: string;
  email?: string;
  dataInicio?: string;      // ISO 8601
  dataFim?: string;         // ISO 8601
}

type ShowroomResponse = PaginatedResponse<HistoryItem>;

interface Sort {
  sorted: boolean;
  unsorted: boolean;
  empty: boolean;
}
```

### 6.13 Profile / Perfil (Role)

```typescript
interface Perfil {
  _id?: string;
  nome: string;
  recursos: Recurso[];
}
```

### 6.14 Resource / Recurso (Permission)

```typescript
interface Recurso extends LookupEntity {
  _id: string;
  descricao: string;
  nome: string;             // Permission code, e.g. "TELA_CONSULTA_MODELO"
}

interface RecursoDto {
  nome: string;
  descricao: string;
}
```

### 6.15 Category (Quota)

```typescript
interface Category {
  _id: string;
  categoryName: string;
  categoryDescription: string;
  percentage: number;       // percentage allocation (0-100)
}

interface CategoryDto {
  categoryName: string;
  categoryDescription: string;
  percentage: number;
}
```

### 6.16 Bucket (Quota)

```typescript
interface Bucket {
  _id: string;
  nome: string;
  descricao: string;
}

interface BucketDto {
  nome: string;
  descricao: string;
}
```

### 6.17 Model History (Commits / Audit Log)

```typescript
interface ModelChange {
  propriedade: string;      // Field name that changed
  tipo: string;             // Change type: "UPDATE" | "ADD" | "REMOVE"
  valorAnterior?: string;   // Previous value (stringified)
  valorAtual?: string | string[]; // New value (stringified or array)
}

interface ModelCommit {
  commitId: string;
  autor: string;            // User ID
  autorNome: string;        // User display name
  commitDate: string;       // ISO 8601
  tipo: string;             // e.g. "CREATE" | "UPDATE"
  mudancas: ModelChange[];
}
```

### 6.18 Dashboard Macro Types

```typescript
// AWS cost per model per month
interface DashboardMacroDto {
  ano: number;
  mes: number;
  modelo: string;
  custo: number;
}

// Same as DashboardMacroDto (used in different contexts)
interface DashboardMacroModelo {
  ano: number;
  mes: number;
  modelo: string;
  custo: number;
}

// SMM (Score Model Monitor) — most-queried models
interface DashboardMacroModeloSmm {
  modelo: string;
  quantidadeConsultas: string; // stringified number
  dataConsulta: string;        // ISO 8601
}

// Total MSU (Message Service Unit) per day
interface DashboardMacroTotalMsu {
  dataConsulta: string;
  quantidadeConsultas: number;
}

// Slowest models
interface DashboardMacroMaisDemorado {
  tempoExecucao: string;   // duration string e.g. "1.234s"
  modelo: string;
  dataConsulta: string;
}

// Most billed models
interface DashboardMacroMaisFaturamento {
  modelo: string;
  faturamento: number;
  dataConsulta: string;
}

// AWS query volumes per day
interface DashboardMacroModeloAws {
  dataConsulta: string;
  quantidade: number;
}

// Score batch volume per day (chargeable vs non-chargeable)
interface DashboardMacroScoreBatch {
  dataConsulta: string;
  quantidadeNaoCobravel: number;
  quantidadeCobravel: number;
  quantidadeTotal: number;
}

// Per-model batch query volumes
interface DashboardMacroViaBatch {
  modelo: string;
  qtdeConsulta: number;
}

// Filter for cost/AWS endpoints
interface FiltroCustoAwsDto {
  dataInicio: Date;
  dataFim: Date;
  modelo: string;
}

// Monthly AWS cost
interface CustoAwsMensalDto {
  ano: number;
  mes: number;
  modelo: string;
  custo: number;
}

// Filter for showroom/SMM record queries
interface FiltroRegistroDto {
  modelo?: string;
  dataConsulta?: Date;
}
```

### 6.19 User Info (from IAM)

```typescript
interface UserInfoPayload {
  id: string;
  email: string;
  fullName: string;
}
```

### 6.20 Reference List Types (from /lista endpoint)

```typescript
// The /lista endpoint returns all lookup lists in one call
interface ConfigsList {
  status: StatusModelo[];
  tiposProduto: TipoProduto[];
  tiposExecucao: TipoExecucao[];
  ambientesImplantacao: AmbienteImplantacao[];
  frequenciasExecucao: FrequenciaExecucao[];
  unidadesNegocio: UnidadeNegocio[];
  publicos: Publico[];
  finalidades: Finalidade[];
  books: Book[];
  areasProprietaria: AreaProprietaria[];
  perfisPublico: PerfilPublico[];
  bureaus: Bureau[];
  plataformas: Plataforma[];
  tiposCobranca: TipoCobranca[];
  gerentesProduto: PmResponsavel[];
  meiosAcesso: MeioAcesso[];
  meses: Meses[];
  detalhesCanal: DetalheCanal[];
  canais: Canal[];
}

// Simplified model reference for dropdown lists
interface ListaModeloDto {
  value: string;    // _id
  content: string;  // nome
}
```

---

## 7. tRPC Procedure Specification

All application data flows through tRPC. The API surface is defined once in `packages/api/src/router.ts` and is imported by both the backend (as the implementation) and the frontend (as the type-only client). There is no codegen, no schema drift, no REST verbs.

### 7.0 Setup

#### Backend — router initialization (`apps/backend/src/trpc.ts`)

```typescript
import { initTRPC, TRPCError } from '@trpc/server'
import { z } from 'zod'
import { verifyJwt } from './auth/jwt'  // validates Okta JWT

// Context is built once per request and injected into every procedure
export interface Context {
  userId: string | null
  userEmail: string | null
  userResources: string[]   // list of permission codes, e.g. ['TELA_CONSULTA_MODELO']
}

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure   = t.procedure
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, userId: ctx.userId } })
})

// Permission-gated procedure factory
export const withPermission = (code: string) =>
  protectedProcedure.use(({ ctx, next }) => {
    if (!ctx.userResources.includes(code))
      throw new TRPCError({ code: 'FORBIDDEN', message: `Missing permission: ${code}` })
    return next()
  })
```

#### Frontend — client initialization (`apps/frontend/src/lib/trpc.ts`)

```typescript
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '@osm/api'   // type-only import from shared package
import { getAccessToken } from './auth'

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_TRPC_URL,
      headers: () => ({
        Authorization: `Bearer ${getAccessToken() ?? ''}`,
      }),
    }),
  ],
})

// Usage examples:
// const models = await trpc.modelos.list.query({ page: 0, size: 20 })
// const model  = await trpc.modelos.getById.query({ id: '...' })
// const saved  = await trpc.modelos.create.mutate(modeloDto)
```

#### With TanStack Query (recommended)

```typescript
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@osm/api'

export const trpc = createTRPCReact<AppRouter>()

// Usage in a component:
// const { data, isLoading } = trpc.modelos.list.useQuery({ page: 0, size: 20 })
// const { mutate } = trpc.modelos.create.useMutation()
```

---

### 7.1 Reference Lists

#### `lista.all` — query

Returns all reference/lookup lists in one call. Cache result in localStorage for at least 30 minutes.

```typescript
// input: none
// output:
ConfigsList
```

---

#### `security.myResources` — query (protected)

Returns the permission codes for the currently authenticated user.

```typescript
// input: none
// output:
Recurso[]
```

---

### 7.2 Models (modelos)

#### `modelos.list` — query (protected)

```typescript
// input:
z.object({
  page:   z.number().int().min(0).default(0),
  size:   z.number().int().min(1).max(100).default(20),
  sort:   z.string().optional(),           // e.g. "nome,asc"
  filter: FiltroModeloDashboardSchema.optional(),
})
// output:
PaginatedResponse<ResponseDashboardDadosDto>
```

---

#### `modelos.getById` — query (protected)

```typescript
// input:
z.object({ id: z.string() })
// output:
Modelo
```

---

#### `modelos.getHistory` — query (protected)

Returns the full commit/audit history for a model.

```typescript
// input:
z.object({ id: z.string() })
// output:
ModelCommit[]
```

---

#### `modelos.getFaturamento` — query (protected)

Billing data for a model over a date range.

```typescript
// input:
z.object({
  id:         z.string(),
  dataInicio: z.string(),   // ISO date "YYYY-MM-DD"
  dataFim:    z.string(),
})
// output:
ModeloFaturamentoDto[]
```

---

#### `modelos.dashboard` — query (protected)

Aggregated model data by product type and time period (used for the Dashboard chart).

```typescript
// input:
FiltroModeloDashboardSchema.optional()
// output:
ModeloDashboardDto[]
```

---

#### `modelos.create` — mutation (protected)

```typescript
// input:
ModeloDtoSchema   // Zod version of ModeloDto (see Section 6.4)
// output:
Modelo
```

---

#### `modelos.update` — mutation (protected)

```typescript
// input:
z.object({ id: z.string(), data: ModeloDtoSchema })
// output:
Modelo
```

---

#### `modelos.sync` — mutation (protected)

Sync a batch of models from an external/upstream data source.

```typescript
// input:
z.object({ modeloIds: z.array(z.string()) })
// output:
z.object({ synced: z.number() })
```

---

#### `modelos.syncOne` — mutation (protected)

```typescript
// input:
z.object({ id: z.string() })
// output:
Modelo
```

---

### 7.3 Profiles / Roles (perfis)

#### `perfis.list` — query

```typescript
// input:
z.object({ page: z.number().default(0), size: z.number().default(20), search: z.string().optional() })
// output:
PaginatedResponse<Perfil>
```

#### `perfis.getById` — query
```typescript
// input: z.object({ id: z.string() })   output: Perfil
```

#### `perfis.create` — mutation
```typescript
// input: z.object({ nome: z.string(), recursos: z.array(z.object({ _id: z.string() })) })
// output: Perfil
```

#### `perfis.update` — mutation
```typescript
// input: z.object({ id: z.string(), data: PerfilDtoSchema })   output: Perfil
```

#### `perfis.delete` — mutation
```typescript
// input: z.object({ id: z.string() })   output: z.object({ success: z.boolean() })
```

---

### 7.4 Resources / Permissions (recursos)

#### `recursos.list` — query
```typescript
// input: z.object({ page, size, search? })   output: PaginatedResponse<Recurso>
```

#### `recursos.listAll` — query
```typescript
// input: none   output: Recurso[]
```

#### `recursos.getById` — query
```typescript
// input: z.object({ id: z.string() })   output: Recurso
```

#### `recursos.create` — mutation
```typescript
// input: z.object({ nome: z.string(), descricao: z.string() })   output: Recurso
```

#### `recursos.update` — mutation
```typescript
// input: z.object({ id: z.string(), data: RecursoDtoSchema })   output: Recurso
```

#### `recursos.delete` — mutation
```typescript
// input: z.object({ id: z.string() })   output: z.object({ success: z.boolean() })
```

---

### 7.5 Clients (clientes)

#### `clientes.list` — query
```typescript
// input: none   output: Cliente[]
```

#### `clientes.getByCnpj` — query
```typescript
// input: z.object({ cnpj: z.string() })   output: Cliente
```

---

### 7.6 Billing Types (faturamentos)

#### `faturamentos.list` — query
```typescript
// input: z.object({ page, size })   output: PaginatedResponse<Faturamento>
```

#### `faturamentos.listAll` — query
```typescript
// output: Faturamento[]
```

#### `faturamentos.getById` — query
```typescript
// input: z.object({ id: z.string() })   output: Faturamento
```

#### `faturamentos.getByCodigo` — query
```typescript
// input: z.object({ codigo: z.number().int() })   output: Faturamento
```

#### `faturamentos.create` — mutation
```typescript
// input: z.object({ codigo: z.number().int(), descricao: z.string() })   output: Faturamento
```

#### `faturamentos.update` — mutation
```typescript
// input: z.object({ id: z.string(), data: FaturamentoDtoSchema })   output: Faturamento
```

---

### 7.7 Transactions (transacoes)

#### `transacoes.list` — query
```typescript
// input: z.object({ page, size, filter?: FiltroTransacaoDtoSchema })
// output: PaginatedResponse<Transacao>
```

#### `transacoes.getById` — query
```typescript
// input: z.object({ id: z.string() })   output: Transacao
```

#### `transacoes.create` — mutation
```typescript
// input: TransacaoDtoSchema   output: Transacao
```

#### `transacoes.update` — mutation
```typescript
// input: z.object({ id: z.string(), data: TransacaoDtoSchema })   output: Transacao
```

---

### 7.8 Processing / DAG Executions (processamento)

#### `processamento.list` — query
```typescript
// input:
z.object({
  page:   z.number().default(0),
  size:   z.number().default(20),
  sort:   z.string().optional(),
  filter: z.object({
    modelo:     z.string().optional(),
    dataInicio: z.string().optional(),
    dataFinal:  z.string().optional(),
  }).optional(),
})
// output:
PaginatedResponse<DagExecucaoDto>
```

---

### 7.9 Query History (historico)

#### `historico.list` — query
```typescript
// input:
z.object({
  page:   z.number().default(0),
  size:   z.number().default(20),
  sort:   z.string().optional(),
  filter: z.object({
    dataInicio: z.string().optional(),
    dataFim:    z.string().optional(),
    modelo:     z.string().optional(),
  }).optional(),
})
// output:
PaginatedResponse<HistoricoConsultaItem>
```

#### `historico.grafico` — query
```typescript
// input:
z.object({
  dataInicio: z.string().optional(),
  dataFim:    z.string().optional(),
  modelo:     z.string().optional(),
})
// output:
z.array(z.object({ data: z.string(), quantidadeConsultas: z.number() }))
```

---

### 7.10 Dashboard

#### `dashboard.consolidado` — query
```typescript
// input: FiltroModeloDashboardSchema.optional()   output: ModeloDashboardDto[]
```

#### `dashboard.macro` — query
```typescript
// input: z.object({ dataInicio: z.string(), dataFim: z.string() })
// output: DashboardMacroModelo[]
```

#### `dashboard.msu` — query
```typescript
// input: z.object({ dataInicio: z.string(), dataFim: z.string() })
// output: DashboardMacroTotalMsu[]
```

#### `dashboard.smm` — query
```typescript
// input: z.object({ dataInicio: z.string(), dataFim: z.string() })
// output: DashboardMacroModeloSmm[]
```

#### `dashboard.scoreBatch` — query
```typescript
// input: z.object({ dataInicio: z.string(), dataFim: z.string() })
// output: DashboardMacroScoreBatch[]
```

#### `dashboard.maisConsultas` — query
```typescript
// input: z.object({ dataInicio: z.string(), dataFim: z.string(), limit: z.number().default(10) })
// output: DashboardMacroViaBatch[]
```

#### `dashboard.custoAws` — query
```typescript
// input: z.object({ dataInicio: z.coerce.date(), dataFim: z.coerce.date(), modelo: z.string() })
// output: CustoAwsMensalDto[]
```

---

### 7.11 Categories (categorias)

#### `categorias.list` — query
```typescript
// input: z.object({ page, size })   output: PaginatedResponse<Category>
```

#### `categorias.listAll` — query
```typescript
// output: Category[]
```

#### `categorias.getById` — query
```typescript
// input: z.object({ id: z.string() })   output: Category
```

#### `categorias.create` — mutation
```typescript
// input: z.object({ categoryName: z.string(), categoryDescription: z.string(), percentage: z.number().min(0).max(100) })
// output: Category
```

#### `categorias.update` — mutation
```typescript
// input: z.object({ id: z.string(), data: CategoryDtoSchema })   output: Category
```

---

### 7.12 Buckets (baldes)

#### `baldes.list` / `listAll` / `getById` / `create` / `update`

Same pattern as categorias. Input/output shapes from `BucketDto` and `Bucket`.

#### `baldes.getEditInfo` — query
```typescript
// input: z.object({ id: z.string() })
// output: BucketEditInfo (Bucket + categories[] + rules[])
```

---

### 7.13 Showroom

#### `showroom.list` — query
```typescript
// input:
z.object({
  page:      z.number().default(0),
  size:      z.number().default(20),
  modelo:    z.string().optional(),
  documento: z.string().optional(),
  usuario:   z.string().optional(),
  publico:   z.string().optional(),
  email:     z.string().optional(),
  dataInicio:z.string().optional(),
  dataFim:   z.string().optional(),
})
// output: ShowroomResponse (PaginatedResponse<HistoryItem>)
```

#### `showroom.top5` — query
```typescript
// output: ShowroomTopModelo[]
```

#### `showroom.relatorios` — query
```typescript
// input: z.object({ dataInicio: z.string(), dataFim: z.string() })
// output: ShowroomRelatorio[]
```

---

### 7.14 Auth

#### `auth.me` — query (protected)
```typescript
// output: UserInfoPayload
// Note: calls external IAM endpoint server-side, returns result to frontend
```

#### `auth.renewToken` — mutation (protected)
```typescript
// output: z.object({ accessToken: z.string() })
// Note: calls IAM renew endpoint server-side using stored clientId/originClientId
```

---

### 7.15 File Uploads (REST — not tRPC)

File uploads stay as plain `multipart/form-data` REST calls. Use native `fetch` or `axios` directly.

```typescript
// Upload model template
const formData = new FormData()
formData.append('file', file)
formData.append('modeloId', modeloId)
const res = await fetch(`${import.meta.env.VITE_UPLOAD_URL}/template`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${getAccessToken()}` },
  body: formData,
})
const result: UploadResult = await res.json()

// Validate model variable files
const formData = new FormData()
formData.append('file', file)
const res = await fetch(`${import.meta.env.VITE_UPLOAD_URL}/validate-variables`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${getAccessToken()}` },
  body: formData,
})
const result: ValidationResult = await res.json()
```

---

### 7.16 Admin Sub-Router

See `ADMIN_MODULE.md` Section 3 for the complete `admin.*` tRPC procedure tree (users, invitations, roles, permissions, support entities, showroom management, analytics, audit log).

---

---

## 8. Application Routes & Pages

### Public Routes (no authentication required)

| Path | Page | Description |
|---|---|---|
| `/login` | `AuthCallbackPage` | Receives Okta SSO redirect with `?token=&userId=`. Extracts and stores token, then redirects to `/modelos/dashboard`. |
| `/sign-in` | `SignInPage` | Manual sign-in fallback / session expired landing page. Displays Okta login button. |
| `/**` | — | Catch-all redirects to `/sign-in`. |

### Private Routes (requires valid JWT + permission)

| Path | Page | Required Permission |
|---|---|---|
| `/home` | — | Redirects to `/modelos/dashboard` |
| `/modelos/dashboard` | `ModelDashboardPage` | `TELA_DASHBOARD` |
| `/modelos/inventario` | `ModelInventoryPage` | `TELA_CONSULTA_MODELO` |
| `/modelos/cadastro` | `ModelCreatePage` | (write permission) |
| `/modelos/editar/:id` | `ModelEditPage` | (write permission) |
| `/modelos/visualizar/:id` | `ModelViewPage` | `TELA_CONSULTA_MODELO` |
| `/modelos/sync` | `ModelSyncPage` | `TELA_SINCRONIZACAO` |
| `/modelos/jobs` | `SyncJobsPage` | `TELA_JOBS` |
| `/historico/consulta` | `QueryHistoryPage` | `TELA_HISTORICO_CONSULTAS` |
| `/historico/:id` | `QueryHistoryDetailPage` | `TELA_HISTORICO_CONSULTAS` |
| `/categorias/consulta` | `CategoryListPage` | `TELA_CATEGORIAS` |
| `/categorias/cadastro` | `CategoryCreatePage` | (write permission) |
| `/categorias/:id` | `CategoryEditPage` | (write permission) |
| `/baldes` | `BucketListPage` | `TELA_CONSULTA_BALDE` |
| `/baldes/novo` | `BucketCreatePage` | (write permission) |
| `/baldes/:id` | `BucketEditPage` | (write permission) |
| `/showroom` | `ShowroomQueryPage` | `SHOWROOM_CONSULTA` |
| `/showroom/relatorios` | `ShowroomReportsPage` | `SHOWROOM_RELATORIOS` |
| `/showroom/modelos` | `ShowroomModelsPage` | `SHOWROOM_MODELOS` |
| `/perfis/consulta` | `ProfileListPage` | `TELA_CONSULTA_PERFIL` |
| `/perfis/cadastro` | `ProfileCreatePage` | (write permission) |
| `/perfis/:id` | `ProfileEditPage` | (write permission) |
| `/recursos/consulta` | `ResourceListPage` | `TELA_CONSULTA_RECURSO` |
| `/recursos/cadastro` | `ResourceCreatePage` | (write permission) |
| `/recursos/:id` | `ResourceEditPage` | (write permission) |

---

## 9. Permission System (RBAC)

### How it works

1. Permissions are called **Recursos** (Resources). Each `Recurso` has a `nome` string (the permission code) and a `descricao`.
2. Users are assigned one or more **Perfis** (Profiles/Roles). Each `Perfil` contains a list of `Recurso[]`.
3. When the user logs in, fetch their user-specific resources from `GET /security/recursos`. This returns the flat list of all `Recurso` objects the current user has access to.
4. Cache this list in `sessionStorage` as base64-encoded JSON.
5. Before rendering any menu item or navigating to any route, check if the required permission code (`recurso.nome`) is in the user's resource list.

### Permission Codes

```typescript
// Menu-level permissions (controls visibility of whole menu sections)
const MENU_PERMISSIONS = {
  MODELOS:            'MENU_MODELOS',
  SOLUCOES_ANALITICAS:'MENU_SOLUCOES_ANALITICAS',
  SHOWROOM:           'SHOWROOM_CONSULTA',
  ADMIN:              'MENU_ADMIN',
} as const;

// Page/screen-level permissions
const PAGE_PERMISSIONS = {
  DASHBOARD:            'TELA_DASHBOARD',
  CONSULTA_MODELO:      'TELA_CONSULTA_MODELO',
  SINCRONIZACAO:        'TELA_SINCRONIZACAO',
  JOBS:                 'TELA_JOBS',
  HISTORICO_CONSULTAS:  'TELA_HISTORICO_CONSULTAS',
  CATEGORIAS:           'TELA_CATEGORIAS',
  CONSULTA_BALDE:       'TELA_CONSULTA_BALDE',
  SHOWROOM_CONSULTA:    'SHOWROOM_CONSULTA',
  SHOWROOM_RELATORIOS:  'SHOWROOM_RELATORIOS',
  SHOWROOM_MODELOS:     'SHOWROOM_MODELOS',
  CONSULTA_PERFIL:      'TELA_CONSULTA_PERFIL',
  CONSULTA_RECURSO:     'TELA_CONSULTA_RECURSO',
} as const;
```

### Navigation Menu Structure

```typescript
interface NavItem {
  id: number;
  nome: string;                // Display label
  recurso: string;             // Permission code required to see this menu
  caminho?: string;            // Route path (for leaf items)
  opcoes: NavItem[];           // Child items
}

const NAV_MENU: NavItem[] = [
  {
    id: 2,
    nome: 'Modelos',
    recurso: 'MENU_MODELOS',
    opcoes: [
      { id: 0, nome: 'Dashboard',              caminho: '/modelos/dashboard',    recurso: 'TELA_DASHBOARD',           opcoes: [] },
      { id: 0, nome: 'Inventário',             caminho: '/modelos/inventario',   recurso: 'TELA_CONSULTA_MODELO',     opcoes: [] },
      { id: 0, nome: 'Sincronização',          caminho: '/modelos/sync',          recurso: 'TELA_SINCRONIZACAO',       opcoes: [] },
      { id: 0, nome: 'Jobs',                   caminho: '/modelos/jobs',          recurso: 'TELA_JOBS',                opcoes: [] },
      { id: 0, nome: 'Histórico de Consultas', caminho: '/historico/consulta',    recurso: 'TELA_HISTORICO_CONSULTAS', opcoes: [] },
    ],
  },
  {
    id: 3,
    nome: 'Soluções Analíticas',
    recurso: 'MENU_SOLUCOES_ANALITICAS',
    opcoes: [
      { id: 0, nome: 'Categorias', caminho: '/categorias/consulta', recurso: 'TELA_CATEGORIAS',     opcoes: [] },
      { id: 0, nome: 'Baldes',     caminho: '/baldes',              recurso: 'TELA_CONSULTA_BALDE', opcoes: [] },
    ],
  },
  {
    id: 5,
    nome: 'Showroom',
    recurso: 'SHOWROOM_CONSULTA',
    opcoes: [
      { id: 0, nome: 'Consulta',      caminho: '/showroom',           recurso: 'SHOWROOM_CONSULTA',   opcoes: [] },
      { id: 0, nome: 'Relatórios',    caminho: '/showroom/relatorios', recurso: 'SHOWROOM_RELATORIOS', opcoes: [] },
      { id: 0, nome: 'Modelos Top5',  caminho: '/showroom/modelos',    recurso: 'SHOWROOM_MODELOS',    opcoes: [] },
    ],
  },
  {
    id: 4,
    nome: 'Admin',
    recurso: 'MENU_ADMIN',
    opcoes: [
      { id: 0, nome: 'Perfis',   caminho: '/perfis/consulta',   recurso: 'TELA_CONSULTA_PERFIL',  opcoes: [] },
      { id: 0, nome: 'Recursos', caminho: '/recursos/consulta', recurso: 'TELA_CONSULTA_RECURSO', opcoes: [] },
    ],
  },
];
```

---

## 10. Frontend Implementation Guide

### 10.1 Project Structure (recommended)

```
src/
├── api/                   # API client functions (one file per resource)
│   ├── modelos.api.ts
│   ├── perfis.api.ts
│   ├── recursos.api.ts
│   ├── categorias.api.ts
│   ├── baldes.api.ts
│   ├── showroom.api.ts
│   ├── historico.api.ts
│   ├── faturamento.api.ts
│   ├── transacoes.api.ts
│   ├── processamento.api.ts
│   ├── dashboard.api.ts
│   ├── lista.api.ts       # Reference lists
│   └── iam.api.ts         # Auth/IAM calls
├── types/                 # All TypeScript types (section 6 above)
│   ├── index.ts
│   ├── modelo.types.ts
│   ├── showroom.types.ts
│   ├── dashboard.types.ts
│   └── ...
├── store/                 # State management (Pinia / Zustand)
│   ├── auth.store.ts
│   ├── config.store.ts    # Reference lists cache
│   └── ui.store.ts        # Loading, modal state
├── router/
│   ├── index.ts           # Route definitions
│   └── guards.ts          # Auth + permission guards
├── pages/                 # One folder per route
│   ├── auth/
│   │   ├── LoginCallbackPage.vue  # /login
│   │   └── SignInPage.vue         # /sign-in
│   ├── modelos/
│   │   ├── DashboardPage.vue
│   │   ├── InventarioPage.vue
│   │   ├── CadastroPage.vue
│   │   ├── EditarPage.vue
│   │   └── VisualizarPage.vue
│   ├── perfis/
│   ├── recursos/
│   ├── categorias/
│   ├── baldes/
│   ├── showroom/
│   └── historico/
├── components/            # Shared/reusable components
│   ├── layout/
│   │   ├── AppHeader.vue
│   │   ├── NavMenu.vue
│   │   ├── PrivateLayout.vue
│   │   └── PublicLayout.vue
│   ├── common/
│   │   ├── DataTable.vue          # Paginated data table
│   │   ├── FilterPanel.vue        # Collapsible filter panel
│   │   ├── ConfirmDialog.vue
│   │   ├── LoadingOverlay.vue
│   │   └── Pagination.vue
│   └── modelo/
│       ├── CaracteristicasProduto.vue
│       ├── CaracteristicasTecnicas.vue
│       ├── ObservacaoForm.vue
│       └── ModelHistoryDrawer.vue
├── composables/ (Vue) / hooks/ (React)
│   ├── useAuth.ts
│   ├── usePagination.ts
│   ├── usePermission.ts
│   └── useToast.ts
├── utils/
│   ├── date.utils.ts
│   ├── string.utils.ts
│   ├── storage.utils.ts
│   └── http.utils.ts
└── config/
    └── env.ts             # Environment variable resolution
```

### 10.2 tRPC Client Setup

There is no HTTP client to configure manually. The tRPC client handles auth headers, batching, and type inference automatically.

```typescript
// apps/frontend/src/lib/trpc.ts
import { createTRPCProxyClient, httpBatchLink, TRPCClientError } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'    // React
// import { createTRPCVue }  from 'trpc-vue-query'     // Vue
import type { AppRouter } from '@osm/api'
import { getAccessToken, logout } from './auth'

// Option A — vanilla (works in both Vue and React)
export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_TRPC_URL,
      headers: () => {
        const token = getAccessToken()
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
      // Handle 401 globally
      fetch: async (url, options) => {
        const res = await fetch(url, options)
        if (res.status === 401) {
          logout()
          window.location.href = '/sign-in?status=expired'
        }
        return res
      },
    }),
  ],
})

// Option B — with TanStack Query (React)
export const trpc = createTRPCReact<AppRouter>()
// Wrap your app in: <trpc.Provider client={trpcClient} queryClient={queryClient}>

// File upload helper (the only REST call from the frontend)
export async function uploadFile(
  path: 'template' | 'validate-variables',
  formData: FormData
): Promise<Response> {
  const token = getAccessToken()
  return fetch(`${import.meta.env.VITE_UPLOAD_URL}/${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
}
```

### 10.3 Auth Store / Composable

```typescript
// auth.store.ts
interface AuthState {
  accessToken: string | null;
  userInfo: UserInfoPayload | null;
  userResources: Recurso[];
  isLoading: boolean;
}

// Required methods:
// setToken(token: string): void
// logout(): void
// isLoggedIn(): boolean  — checks token presence and expiry
// hasPermission(resourceCode: string): boolean
// fetchUserResources(): Promise<void>
```

### 10.4 Pagination Pattern

All list pages follow this exact pattern:

```typescript
interface PaginationState {
  page: number;       // current page, 0-indexed
  size: number;       // items per page: 20 | 50 | 100
  total: number;      // totalElements from API
  sort: string;       // field,direction
}

// On page load: fetch page 0, size 20
// On filter change: reset to page 0, re-fetch
// On size change: reset to page 0, re-fetch
// On sort click: toggle asc/desc, reset to page 0, re-fetch
```

### 10.5 Model Form — Field Details

The model create/edit form is split into three tabs/sections:

**Section 1 — Product Characteristics (`CaracteristicaProdutoModeloDto`)**

| Field | Type | Required | Notes |
|---|---|---|---|
| `status` | `StatusModelo` (dropdown) | Yes | From `/lista` |
| `nome` | `string` (text input) | Yes | |
| `descricaoModelo` | `string` (textarea) | No | |
| `cnpj` | `string` (masked input) | Yes | Mask: `00.000.000/0000-00` |
| `nomeCliente` | `string` (text, read-only after CNPJ lookup) | Yes | |
| `grupoEstrategico` | `string` | No | |
| `gerenteProduto` | `PmResponsavel` (dropdown) | No | From `/lista` |
| `areaProprietaria` | `AreaProprietaria` (dropdown) | No | From `/lista` |
| `publico` | `Publico` (dropdown) | No | From `/lista` |
| `tipoProduto` | `TipoProduto` (dropdown) | Yes | From `/lista` |
| `tipoCobranca` | `TipoCobranca` (dropdown) | No | From `/lista` |
| `dataInicio` | `Date` (date picker) | No | |
| `dataTermino` | `Date` (date picker) | No | |
| `dataDragonizacao` | `Date` (date picker) | No | |
| `canais` | `Canal[]` (multi-select chips) | No | From `/lista` |
| `flatFee` | `boolean` (checkbox/toggle) | No | |

**Section 2 — Technical Characteristics (`CaracteristicaTecnicaModeloDto`)**

| Field | Type | Required | Notes |
|---|---|---|---|
| `frequenciaExecucao` | `FrequenciaExecucao` (dropdown) | No | From `/lista` |
| `tipoExecucao` | `TipoExecucao` (dropdown) | No | From `/lista` |
| `ambientesImplantacao` | `AmbienteImplantacao[]` (multi-checkbox) | No | From `/lista` |
| `meioAcessoApi` | `boolean` (checkbox) | No | |
| `meioAcessoBatch` | `boolean` (checkbox) | No | |
| `meioAcessoMenuProdutos` | `boolean` (checkbox) | No | |
| `meioAcessoString` | `boolean` (checkbox) | No | |
| `plataformas` | `Plataforma[]` (multi-select chips) | No | From `/lista` |
| `bureau` | `Bureau` (dropdown) | No | From `/lista` |
| `books` | `Book[]` (multi-select chips) | No | From `/lista` |
| `modelos` | `Modelo[]` (multi-select search) | No | From model list |
| `rangeInicial` | `number` (number input) | No | Min: 0 |
| `rangeFinal` | `number` (number input) | No | Max: 1000 |
| `retornaFlag` | `boolean` (toggle) | No | |
| `backtest` | `boolean` (toggle) | No | |
| `showroomBizDev` | `boolean` (toggle) | No | |
| `autoExclusao` | `boolean` (toggle) | No | |
| `disponivelDelivery` | `boolean` (toggle) | No | |
| `recalibragem` | `boolean` (toggle) | No | |
| `variaveisCliente` | `boolean` (toggle) | No | |
| `grandesVolumes` | `boolean` (toggle) | No | |
| `entregasRecorrentes` | `boolean` (toggle) | No | |
| `dependenciaModelos` | `boolean` (toggle) | No | |
| `filtrosAplicados` | `string` (textarea) | No | |
| `regrasEspecificas` | `string` (textarea) | No | |
| `texto` | `string` (textarea) | No | Free-text about transactions |

**Section 3 — Observations (`ObservacaoModeloDto`)**

| Field | Type | Required | Notes |
|---|---|---|---|
| `observacao` | `string` (rich textarea) | No | |

### 10.6 Inventory / List Page Features

The model inventory page (`/modelos/inventario`) must implement:

1. **Filter panel** with fields from `FiltroModeloDashboardDto`
2. **Data table** with columns:
   - Nome (Name) — sortable
   - Data Implantação (Start Date) — sortable
   - Data Desativação (End Date)
   - Data Dragonização
   - Produto (TipoProduto) — color badge
   - Tipo (TipoExecucao)
   - Ambientes (AmbienteImplantacao[]) — chips
   - Status — color badge
   - Cliente
   - Frequência (FrequenciaExecucao)
   - Idade (idadeModelo)
   - Descrição
   - Actions: Edit, View (permission-gated)
3. **Page size selector**: 20 / 50 / 100
4. **Export to CSV** button (calls same endpoint with export param)
5. **Pagination** controls

### 10.7 Storage Strategy

```typescript
// localStorage — persists across sessions
// Used for: JWT tokens, reference lists cache
const LOCAL_STORAGE_KEYS = {
  ACCESS_TOKEN:          'access_token',
  REFRESH_TOKEN:         'refresh_token',
  USER_LOGIN:            'user_login',
  CONFIGS:               'configs',              // ConfigsList
  TIPOS_PRODUTO:         'tiposProduto',
  TIPOS_EXECUCAO:        'tiposExecucao',
  STATUS:                'status',
  AMBIENTES_IMPLANTACAO: 'ambientesImplantacao',
  FREQUENCIAS_EXECUCAO:  'frequenciasExecucao',
  UNIDADES_NEGOCIO:      'unidadesNegocio',
  PUBLICOS:              'publicos',
  FINALIDADES:           'finalidades',
  BOOKS:                 'books',
  MODELOS:               'modelos',
  CACHE_FILTER:          'cacheFilter',
  AREAS_PROPRIETARIA:    'areasProprietaria',
  PERFIS_PUBLICO:        'perfisPublico',
  BUREAUS:               'bureaus',
  PLATAFORMAS:           'plataformas',
  TIPOS_COBRANCA:        'tiposCobranca',
  PM_RESPONSAVEIS:       'gerentesProduto',
  MEIOS_ACESSO:          'meiosAcesso',
  MESES:                 'meses',
  DETALHES_CANAL:        'detalhesCanal',
  FATURAMENTOS:          'faturamentos',
  CANAIS:                'canais',
  CATEGORIES:            'categories',
  BUCKETS:               'buckets',
  SHOWROOM:              'showroom',
} as const;

// sessionStorage — cleared on tab close
// Used for: user resources (permissions), one-time auth data
const SESSION_STORAGE_KEYS = {
  USER_RESOURCES: 'recursos',   // base64-encoded JSON of Recurso[]
  USER_ID:        'userId',
} as const;
```

---

## 11. State & Caching Strategy

### Reference Lists Caching

On app startup (after auth), fetch `GET /lista` and cache the response in localStorage. Apply a 30-minute expiry. Before any dropdown renders, load from cache; if expired or absent, re-fetch.

### User Resources Caching

After login, fetch `GET /security/recursos`. Encode the result as `btoa(JSON.stringify(recursos))` and store in sessionStorage. Apply a 4-hour TTL check (based on fetch time, stored alongside the data).

### Filter State Caching

The last-used filter on the model inventory page should be saved in localStorage under `cacheFilter`. When the user returns to the page, pre-populate the filter form with the cached values.

### Loading State

Maintain a global loading state (boolean + optional blur-screen flag). Show a fullscreen loading overlay while any HTTP request is pending. The original app had this disabled (interceptor commented out), but the infrastructure is present.

---

## 12. Docker & Deployment

### Dockerfile Structure (multi-stage)

```dockerfile
# Stage 1: Build
FROM node:18-alpine3.18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build           # Output to /app/dist (or /app/build for React)

# Stage 2: Serve with Nginx
FROM nginx:1.29-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY config/nginx.conf /etc/nginx/conf.d/default.conf
COPY config/run.sh /docker-entrypoint.d/40-env-substitution.sh
RUN chmod +x /docker-entrypoint.d/40-env-substitution.sh
EXPOSE 80
```

### Runtime Environment Variable Substitution

The build output contains placeholder strings (e.g., `{API_HOST}`). A startup shell script (`run.sh`) uses `envsubst` or `sed` to replace these placeholders with actual environment variable values before Nginx serves the files.

```bash
#!/bin/sh
# run.sh — runs before Nginx starts
# For each placeholder in the built JS/HTML, substitute with env var value
for f in /usr/share/nginx/html/assets/*.js; do
  sed -i "s|{API_HOST}|${ENV_API_HOST}|g" "$f"
  sed -i "s|{IAM_ACCOUNT}|${ENV_IAM_ACCOUNT}|g" "$f"
  sed -i "s|{IAM_ROOT}|${ENV_IAM_ROOT}|g" "$f"
  sed -i "s|{AUTH_ORIGIN_CLIENT_ID}|${ENV_AUTH_ORIGIN_CLIENT_ID}|g" "$f"
  sed -i "s|{URL_SAML_OKTA}|${ENV_URL_SAML_OKTA}|g" "$f"
  sed -i "s|{SERVICE_PROVIDER_ID}|${ENV_SERVICE_PROVIDER_ID}|g" "$f"
  sed -i "s|{API_COTAS_HOST}|${ENV_API_COTAS_HOST}|g" "$f"
  sed -i "s|{API_SHOWROOM_HOST}|${ENV_API_SHOWROOM_HOST}|g" "$f"
  sed -i "s|{CLIENT_ID}|${ENV_CLIENT_ID}|g" "$f"
done
```

### Kubernetes (Helm)

```yaml
# values.yaml key settings
replicaCount: 1

autoscaling:
  enabled: true
  minReplicas: 1
  maxReplicas: 3
  targetCPUUtilizationPercentage: 80
  targetMemoryUtilizationPercentage: 80

resources:
  limits:
    cpu: "1"
    memory: 1Gi
  requests:
    cpu: 800m
    memory: 512Mi

# Deployment strategy: Canary via Argo Rollouts
# Traffic shifts: 0% → 100% canary progressively
```

### Nginx Configuration

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing — all paths fall back to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|gif|ico|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
}
```

### docker-compose.yaml (local development)

```yaml
version: '3.8'
services:
  app-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"    # Vite dev server (or 4200 for Angular)
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - VITE_API_HOST=https://experian-score-manager-model-api.scoreci-dev.br.experian.eeca
      # ... other env vars

  nginx-dev:
    build:
      context: .
      dockerfile: Dockerfile.nginx
    ports:
      - "8080:80"
    depends_on:
      - app-dev
```

---

## Appendix A: Business Context

- **Scoring Models** are statistical/ML models that produce a credit score for a given person or company.
- **Bureau** refers to a credit bureau (e.g., Serasa, SPC) that provides data inputs.
- **Dragonização** (Dragonization) is an internal term for the production go-live of a model.
- **Backtest** is a model validation technique where the model is tested against historical data.
- **MSU (Message Service Units)** is a billing metric used to count API calls.
- **SMM (Score Model Monitor)** is an internal monitoring system.
- **DAG (Directed Acyclic Graph)** refers to Apache Airflow pipeline executions.
- **Showroom** is the analytics portal showing who queried which model and when.
- **Baldes (Buckets)** and **Categorias (Categories)** are quota-management entities that control how many API calls a client can make.
- **CNPJ** is the Brazilian company tax identification number (14 digits, format: `XX.XXX.XXX/XXXX-XX`).

---

## Appendix B: Key Business Rules

1. A model's `status` determines whether it is active and can be queried through the score API.
2. A model's `rangeInicial` and `rangeFinal` define the valid score output range (e.g., 0–1000).
3. `flatFee` models have a fixed billing cost regardless of usage volume.
4. `dependenciaModelos = true` means this model requires other models to run first (listed in `modelos[]`).
5. `meioAcessoApi`, `meioAcessoBatch`, `meioAcessoMenuProdutos`, `meioAcessoString` are mutually-includable (multiple can be true simultaneously) access channels.
6. A `Perfil` is a role that contains multiple `Recurso` permissions. Users have profiles that determine what they can see and do in the application.
7. The `/security/recursos` endpoint returns the **merged, deduplicated** list of resources from all profiles assigned to the authenticated user.
8. Menu items are hidden (not just disabled) when the user lacks the required `recurso` permission.
9. The `dataDragonizacao` field only makes sense when `status` is active/deployed.
10. Categories have a `percentage` that represents their quota allocation (all categories' percentages should sum to ≤ 100%).

---

---

## 13. Backend Architecture

> This section covers the new TypeScript backend introduced in the tRPC decision (see `ARCHITECTURE_DECISIONS.md`). The backend is built from scratch — it does not wrap the original Angular app's REST API.

---

### 13.1 Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| HTTP server | Hono | 4.x |
| tRPC adapter | `@trpc/server` + `hono-trpc` | 11.x |
| ORM | Prisma | 5.x |
| Database | PostgreSQL | 16 |
| Validation | Zod | 3.x |
| Auth (JWT verify) | `jose` | 5.x |
| Email | Nodemailer (SMTP) or Resend SDK | — |
| Monorepo | pnpm workspaces | 9.x |
| Container | Docker + Docker Compose | — |

---

### 13.2 Monorepo Directory Layout

```
osm/
├── apps/
│   ├── frontend/                 # Vue 3 or React 18 app (Vite)
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── trpc.ts       # tRPC client (createTRPCProxyClient)
│   │   │   │   └── auth.ts       # Token storage, logout helper
│   │   │   ├── features/         # Route-level feature modules
│   │   │   └── main.ts
│   │   └── vite.config.ts
│   └── backend/                  # Hono + tRPC server
│       ├── src/
│       │   ├── index.ts          # Hono entry point
│       │   ├── trpc.ts           # initTRPC, router, procedures, middleware
│       │   ├── context.ts        # Context builder (JWT → ctx)
│       │   ├── routers/
│       │   │   ├── index.ts      # Root AppRouter (merges all sub-routers)
│       │   │   ├── modelo.ts
│       │   │   ├── perfil.ts
│       │   │   ├── recurso.ts
│       │   │   ├── category.ts
│       │   │   ├── bucket.ts
│       │   │   ├── showroom.ts
│       │   │   ├── historico.ts
│       │   │   ├── jobs.ts
│       │   │   └── admin/
│       │   │       ├── index.ts  # Merges all admin sub-routers
│       │   │       ├── users.ts
│       │   │       ├── invitations.ts
│       │   │       ├── perfis.ts
│       │   │       ├── recursos.ts
│       │   │       ├── entities.ts
│       │   │       ├── showroom.ts
│       │   │       ├── analytics.ts
│       │   │       └── auditLog.ts
│       │   └── lib/
│       │       ├── prisma.ts     # Prisma client singleton
│       │       ├── email.ts      # Email sender (Nodemailer/Resend)
│       │       └── audit.ts      # Audit log writer middleware
│       ├── prisma/
│       │   └── schema.prisma
│       └── Dockerfile
└── packages/
    └── api/                      # Shared package — exported AppRouter type + Zod schemas
        ├── src/
        │   ├── index.ts          # Re-exports AppRouter type + all Zod schemas
        │   └── schemas/          # All Zod schemas (one file per domain)
        └── package.json
```

---

### 13.3 Backend Entry Point

```typescript
// apps/backend/src/index.ts
import { Hono } from 'hono'
import { trpcServer } from '@hono/trpc-server'
import { cors } from 'hono/cors'
import { appRouter } from './routers/index'
import { createContext } from './context'

const app = new Hono()

app.use('*', cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}))

// tRPC — all domain procedures
app.use('/trpc/*', trpcServer({
  router: appRouter,
  createContext,
}))

// REST — file uploads only
app.post('/upload/template', async (c) => {
  // ... handle multipart/form-data template upload
})
app.post('/upload/validate-variables', async (c) => {
  // ... handle multipart/form-data variable validation
})

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
}
```

---

### 13.4 tRPC Setup & Middleware

```typescript
// apps/backend/src/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server'
import type { Context } from './context'

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

// Requires a valid JWT
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, userId: ctx.userId } })
})

// Requires a valid JWT AND a specific permission code
export const withPermission = (code: string) =>
  protectedProcedure.use(({ ctx, next }) => {
    if (!ctx.userResources.includes(code))
      throw new TRPCError({ code: 'FORBIDDEN', message: `Missing permission: ${code}` })
    return next()
  })
```

---

### 13.5 Context Builder

```typescript
// apps/backend/src/context.ts
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { jwtVerify, createRemoteJWKSet } from 'jose'

const JWKS = createRemoteJWKSet(new URL(process.env.IAM_JWKS_URL!))

export interface Context {
  userId: string | null
  userEmail: string | null
  userResources: string[]         // Flat list of permission codes from JWT claims
}

export async function createContext({ req }: FetchCreateContextFnOptions): Promise<Context> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, userEmail: null, userResources: [] }
  }
  try {
    const token = authHeader.slice(7)
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: process.env.IAM_ISSUER,
      audience: process.env.IAM_AUDIENCE,
    })
    return {
      userId: payload.sub ?? null,
      userEmail: (payload['email'] as string) ?? null,
      userResources: (payload['resources'] as string[]) ?? [],
    }
  } catch {
    return { userId: null, userEmail: null, userResources: [] }
  }
}
```

---

### 13.6 Prisma Schema

```prisma
// apps/backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Auth & Users ────────────────────────────────────────────────────────────

model User {
  id           String   @id @default(cuid())
  oktaId       String   @unique
  email        String   @unique
  nome         String
  isActive     Boolean  @default(true)
  lastLoginAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  perfis       UserPerfil[]
  auditLogs    AuditLog[]
  analyticsEvents AnalyticsEvent[]
}

model UserPerfil {
  userId    String
  perfilId  String
  assignedAt DateTime @default(now())
  assignedBy String
  user      User   @relation(fields: [userId], references: [id])
  perfil    Perfil @relation(fields: [perfilId], references: [id])
  @@id([userId, perfilId])
}

model UserInvitation {
  id         String   @id @default(cuid())
  email      String
  nome       String
  token      String   @unique
  perfilIds  String[]                      // JSON array of Perfil IDs to assign on accept
  status     InvitationStatus @default(PENDING)
  message    String?
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  createdBy  String
  acceptedAt DateTime?
  acceptedBy String?
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  CANCELLED
}

// ─── RBAC ────────────────────────────────────────────────────────────────────

model Perfil {
  id        String   @id @default(cuid())
  nome      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  recursos  PerfilRecurso[]
  users     UserPerfil[]
}

model Recurso {
  id        String   @id @default(cuid())
  nome      String   @unique             // e.g. "TELA_CONSULTA_MODELO"
  descricao String
  module    String                       // e.g. "MODELOS", "ADMIN", "SHOWROOM"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  perfis    PerfilRecurso[]
}

model PerfilRecurso {
  perfilId  String
  recursoId String
  perfil    Perfil   @relation(fields: [perfilId], references: [id])
  recurso   Recurso  @relation(fields: [recursoId], references: [id])
  @@id([perfilId, recursoId])
}

// ─── Modelo (Scoring Model) ───────────────────────────────────────────────────

model Modelo {
  id                    String   @id @default(cuid())
  externalId            String?  @unique     // _id from legacy system
  nome                  String
  nomeExibicao          String?
  versao                String?
  descricao             String?
  statusId              String
  tipoProdutoId         String?
  tipoCobrancaId        String?
  tipoExecucaoId        String?
  frequenciaExecucaoId  String?
  ambienteImplantacaoId String?
  areaProprietariaId    String?
  publicoId             String?
  clienteId             String?
  finalidadeId          String?
  unidadeNegocioId      String?
  pmResponsavelId       String?
  perfilPublicoId       String?
  rangeInicial          Int?
  rangeFinal            Int?
  flatFee               Boolean  @default(false)
  showroomBizDev        Boolean  @default(false)
  dependenciaModelos    Boolean  @default(false)
  meioAcessoApi         Boolean  @default(false)
  meioAcessoBatch       Boolean  @default(false)
  meioAcessoMenuProdutos Boolean @default(false)
  meioAcessoString      String?
  dataDragonizacao      DateTime?
  dataDesativacao       DateTime?
  sincronizacao         Boolean  @default(false)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  status                StatusModelo         @relation(fields: [statusId], references: [id])
  tipoProduto           TipoProduto?         @relation(fields: [tipoProdutoId], references: [id])
  tipoCobranca          TipoCobranca?        @relation(fields: [tipoCobrancaId], references: [id])
  tipoExecucao          TipoExecucao?        @relation(fields: [tipoExecucaoId], references: [id])
  frequenciaExecucao    FrequenciaExecucao?  @relation(fields: [frequenciaExecucaoId], references: [id])
  ambienteImplantacao   AmbienteImplantacao? @relation(fields: [ambienteImplantacaoId], references: [id])
  areaProprietaria      AreaProprietaria?    @relation(fields: [areaProprietariaId], references: [id])
  publico               Publico?             @relation(fields: [publicoId], references: [id])
  cliente               Cliente?             @relation(fields: [clienteId], references: [id])
  finalidade            Finalidade?          @relation(fields: [finalidadeId], references: [id])
  unidadeNegocio        UnidadeNegocio?      @relation(fields: [unidadeNegocioId], references: [id])
  pmResponsavel         PmResponsavel?       @relation(fields: [pmResponsavelId], references: [id])
  perfilPublico         PerfilPublico?       @relation(fields: [perfilPublicoId], references: [id])

  bureaus               ModeloBureau[]
  plataformas           ModeloPlataforma[]
  books                 ModeloBook[]
  canais                ModeloCanal[]
  meses                 ModeloMeses[]
  meiosAcesso           ModeloMeioAcesso[]
  dependencias          ModeloDependencia[]  @relation("DependsOn")
  dependentes           ModeloDependencia[]  @relation("DependedBy")
  historico             ModeloHistorico[]
  showroomEntry         ShowroomEntry?
}

model ModeloHistorico {
  id         String   @id @default(cuid())
  modeloId   String
  userId     String
  userNome   String
  action     String
  snapshot   Json                       // Full Modelo snapshot at time of change
  createdAt  DateTime @default(now())
  modelo     Modelo   @relation(fields: [modeloId], references: [id])
}

model ModeloDependencia {
  modeloId      String
  dependsOnId   String
  modelo        Modelo @relation("DependsOn",  fields: [modeloId],    references: [id])
  dependsOn     Modelo @relation("DependedBy", fields: [dependsOnId], references: [id])
  @@id([modeloId, dependsOnId])
}

// Junction tables for Modelo many-to-many relations
model ModeloBureau     { modeloId String; bureauId    String; @@id([modeloId, bureauId]) }
model ModeloPlataforma { modeloId String; plataformaId String; @@id([modeloId, plataformaId]) }
model ModeloBook       { modeloId String; bookId      String; @@id([modeloId, bookId]) }
model ModeloCanal      { modeloId String; canalId     String; @@id([modeloId, canalId]) }
model ModeloMeses      { modeloId String; mesesId     String; @@id([modeloId, mesesId]) }
model ModeloMeioAcesso { modeloId String; meioAcessoId String; @@id([modeloId, meioAcessoId]) }

// ─── Reference / Support Entities ────────────────────────────────────────────
// All follow the same shape: id, descricao, isActive, createdAt, updatedAt

model StatusModelo        { id String @id @default(cuid()); descricao String @unique; isActive Boolean @default(true); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; modelos Modelo[] }
model TipoExecucao        { id String @id @default(cuid()); descricao String @unique; isActive Boolean @default(true); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; modelos Modelo[] }
model TipoCobranca        { id String @id @default(cuid()); descricao String @unique; isActive Boolean @default(true); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; modelos Modelo[] }
model FrequenciaExecucao  { id String @id @default(cuid()); descricao String @unique; isActive Boolean @default(true); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; modelos Modelo[] }
model AmbienteImplantacao { id String @id @default(cuid()); descricao String @unique; isActive Boolean @default(true); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; modelos Modelo[] }
model AreaProprietaria    { id String @id @default(cuid()); descricao String @unique; isActive Boolean @default(true); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; modelos Modelo[] }
model Publico             { id String @id @default(cuid()); descricao String @unique; isActive Boolean @default(true); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; modelos Modelo[] }
model Bureau              { id String @id @default(cuid()); descricao String @unique; isActive Boolean @default(true); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; modelos ModeloBureau[] }
model Plataforma          { id String @id @default(cuid()); descricao String @unique; isActive Boolean @default(true); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; modelos ModeloPlataforma[] }
model Canal               { id String @id @default(cuid()); descricao String @unique; isActive Boolean @default(true); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; modelos ModeloCanal[] }
model DetalheCanal        { id String @id @default(cuid()); descricao String @unique; isActive Boolean @default(true); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt }
model PmResponsavel       { id String @id @default(cuid()); descricao String @unique; isActive Boolean @default(true); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; modelos Modelo[] }
model PerfilPublico       { id String @id @default(cuid()); descricao String @unique; isActive Boolean @default(true); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; modelos Modelo[] }
model UnidadeNegocio      { id String @id @default(cuid()); descricao String @unique; isActive Boolean @default(true); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; modelos Modelo[] }
model MeioAcesso          { id String @id @default(cuid()); descricao String @unique; isActive Boolean @default(true); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; modelos ModeloMeioAcesso[] }
model Meses               { id String @id @default(cuid()); descricao String @unique; isActive Boolean @default(true); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; modelos ModeloMeses[] }
model Finalidade          { id String @id @default(cuid()); descricao String @unique; isActive Boolean @default(true); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; modelos Modelo[] }

// TipoProduto has extra fields
model TipoProduto {
  id              String   @id @default(cuid())
  descricao       String   @unique
  codigoSap       String?
  codigoLegado    String?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  modelos         Modelo[]
  books           Book[]
}

// Book has extra fields
model Book {
  id            String      @id @default(cuid())
  descricao     String
  tipoProdutoId String?
  isActive      Boolean     @default(true)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  tipoProduto   TipoProduto? @relation(fields: [tipoProdutoId], references: [id])
  modelos       ModeloBook[]
}

// Cliente has extra fields
model Cliente {
  id        String   @id @default(cuid())
  descricao String   @unique
  cnpj      String?  @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  modelos   Modelo[]
}

// ─── Analytical Solutions ─────────────────────────────────────────────────────

model Category {
  id          String   @id @default(cuid())
  nome        String   @unique
  descricao   String?
  percentage  Float                        // Quota allocation percentage (0–100)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  buckets     Bucket[]
}

model Bucket {
  id          String   @id @default(cuid())
  nome        String
  descricao   String?
  categoryId  String
  minValue    Float
  maxValue    Float
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  category    Category @relation(fields: [categoryId], references: [id])
}

// ─── Showroom ─────────────────────────────────────────────────────────────────

model ShowroomEntry {
  id           String   @id @default(cuid())
  modeloId     String   @unique
  modeloNome   String                       // Denormalized for display
  modeloStatus String                       // Denormalized
  addedAt      DateTime @default(now())
  addedBy      String
  addedByName  String
  modelo       Modelo   @relation(fields: [modeloId], references: [id])
  featured     ShowroomFeatured?
}

model ShowroomFeatured {
  id           String        @id @default(cuid())
  entryId      String        @unique
  modeloId     String        @unique
  modeloNome   String
  modeloStatus String
  position     Int                          // 1-based display order
  addedAt      DateTime      @default(now())
  addedBy      String
  addedByName  String
  pinnedUntil  DateTime?
  entry        ShowroomEntry @relation(fields: [entryId], references: [id])
}

model ShowroomConfig {
  id               String   @id @default("singleton")
  maxFeatured      Int      @default(5)
  autoSyncFromFlag Boolean  @default(true)
  poolTitle        String   @default("Showroom Pool")
  featuredTitle    String   @default("Modelos em Destaque")
  updatedAt        DateTime @updatedAt
  updatedBy        String   @default("system")
}

// ─── Analytics ───────────────────────────────────────────────────────────────

model AnalyticsEvent {
  id              String   @id @default(cuid())
  sessionId       String
  userId          String
  eventType       String                   // "page_view", "feature_used", etc.
  page            String?
  feature         String?
  metadata        Json?                    // Non-PII extra context
  clientTimestamp DateTime
  serverTimestamp DateTime @default(now())
  user            User     @relation(fields: [userId], references: [id])
  @@index([userId])
  @@index([eventType])
  @@index([clientTimestamp])
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

model AuditLog {
  id         String   @id @default(cuid())
  userId     String
  userEmail  String
  action     String                        // e.g. "UPDATE_USER_STATUS"
  entityType String                        // e.g. "User", "Modelo", "ShowroomFeatured"
  entityId   String
  changes    Json                          // Array of { field, oldValue, newValue }
  ip         String?
  userAgent  String?
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id])
  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

---

### 13.7 Docker Compose

```yaml
# docker-compose.yml (development)
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: osm
      POSTGRES_USER: osm
      POSTGRES_PASSWORD: osm_dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build:
      context: ./apps/backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://osm:osm_dev_password@postgres:5432/osm
      PORT: 3000
      FRONTEND_URL: http://localhost:5173
      IAM_JWKS_URL: ${IAM_JWKS_URL}
      IAM_ISSUER: ${IAM_ISSUER}
      IAM_AUDIENCE: ${IAM_AUDIENCE}
      OKTA_DOMAIN: ${OKTA_DOMAIN}
      OKTA_CLIENT_ID: ${OKTA_CLIENT_ID}
      OKTA_CLIENT_SECRET: ${OKTA_CLIENT_SECRET}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      APP_URL: http://localhost:5173
    depends_on:
      - postgres

  frontend:
    build:
      context: ./apps/frontend
      dockerfile: Dockerfile
    ports:
      - "5173:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

### 13.8 Backend Dockerfile

```dockerfile
# apps/backend/Dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/api/package.json ./packages/api/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @osm/backend build
RUN pnpm --filter @osm/backend exec prisma generate

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/node_modules ./node_modules
COPY --from=build /app/apps/backend/prisma ./prisma

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

---

### 13.9 Shared Types Package

```typescript
// packages/api/src/index.ts
// This file is the single source of truth for the tRPC router type.
// Both frontend and backend import from "@osm/api".

export type { AppRouter } from '../../apps/backend/src/routers/index'
export * from './schemas'         // All Zod schemas (Modelo, Perfil, etc.)
```

```json
// packages/api/package.json
{
  "name": "@osm/api",
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {},
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

---

*End of PROJECT_INSTRUCTIONS.md — Generated from source code analysis of the original Angular 16 implementation.*
