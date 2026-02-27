# Phase 4: Frontend

> **Branch:** `feat/phase-4/frontend`
> **Status:** Planned
> **Depends on:** Phase 1 (infrastructure & auth), Phase 2 (core domain modules), Phase 3 (admin module)
> **Reference:** `PROJECT_INSTRUCTIONS.md` §8–11, `ADMIN_MODULE.md` §4–6

---

## Overview

Phase 4 builds the complete Vue 3 SPA (`apps/frontend`). It consumes the tRPC API from Phase 1–3 via a type-safe client and implements all pages, route guards, state management, and the client-side analytics service.

**No new backend code is written in this phase.** Every data call goes through the tRPC client (except file uploads, which use native `fetch`).

---

## Confirmed Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Vue 3 + Vite | 3.x / 5.x |
| Language | TypeScript | 5.x |
| Routing | Vue Router | 4.x |
| State management | Pinia | 2.x |
| API client | `@trpc/client` + `@tanstack/vue-query` | 11.x / 5.x |
| Forms + validation | vee-validate + Zod | 4.x / 3.x |
| UI components | shadcn/vue | latest |
| Charts | Vue-chartjs | latest |
| Date handling | date-fns | 3.x |
| Drag and drop | vue-draggable-plus | latest |
| File export | FileSaver.js + Papa Parse | latest |
| Testing | Vitest + Vue Testing Library | 1.x |
| Container | Docker + Nginx 1.29-alpine | — |

---

## Dependency Order

```
packages/shared → apps/api → apps/frontend
```

`@osm/shared` exports all Zod schemas and the `AppRouter` type. The frontend imports the `AppRouter` type **only** — never the router implementation from `apps/api`.

---

## Deliverables

| # | Deliverable | Description | Status |
|---|-------------|-------------|--------|
| 1 | App scaffold | `apps/frontend` Vite project, tsconfig, pnpm workspace registration | ⬜ |
| 2 | tRPC client | Type-safe client with auth header injection and 401 handler | ⬜ |
| 3 | Auth store | Pinia store: token storage, `isLoggedIn`, `hasPermission`, `fetchUserResources` | ⬜ |
| 4 | Config store | Reference lists (from `lista.all`) cached in localStorage with 30-min TTL | ⬜ |
| 5 | Router + guards | All route definitions, auth guard, permission guard | ⬜ |
| 6 | Layouts | `PrivateLayout.vue`, `PublicLayout.vue`, `AdminLayout.vue` | ⬜ |
| 7 | Shared components | `DataTable`, `FilterPanel`, `ConfirmDialog`, `LoadingOverlay`, `Pagination`, `AppHeader`, `NavMenu` | ⬜ |
| 8 | Auth pages | `SignInPage`, `LoginCallbackPage` | ⬜ |
| 9 | Modelos pages | Dashboard, Inventário, Cadastro, Editar, Visualizar, Sync, Jobs | ⬜ |
| 10 | Histórico pages | Query history list + detail | ⬜ |
| 11 | Soluções Analíticas pages | Categorias (list/create/edit), Baldes (list/create/edit) | ⬜ |
| 12 | Showroom pages | Consulta, Relatórios, Modelos Top5 | ⬜ |
| 13 | Perfis pages | List, Create, Edit | ⬜ |
| 14 | Recursos pages | List, Create, Edit | ⬜ |
| 15 | Admin pages | All pages from `ADMIN_MODULE.md` §4 | ⬜ |
| 16 | Analytics service | Client-side event queue with 5-second flush | ⬜ |
| 17 | Docker + Nginx | Multi-stage build with SPA fallback, static asset caching, security headers | ⬜ |
| 18 | Tests | Component tests for shared components + page smoke tests | ⬜ |

---

## File Structure (Target)

```
apps/frontend/
├── src/
│   ├── main.ts                        # App entry point — mounts Vue, Pinia, Router, VueQuery
│   ├── App.vue                        # Root component
│   │
│   ├── lib/
│   │   ├── trpc.ts                    # tRPC client (createTRPCProxyClient + vue-query integration)
│   │   ├── query-client.ts            # TanStack QueryClient instance
│   │   └── auth.ts                    # Token helpers: getAccessToken, logout
│   │
│   ├── config/
│   │   └── env.ts                     # Typed env var resolution (VITE_TRPC_URL, etc.)
│   │
│   ├── store/
│   │   ├── auth.store.ts              # AuthState, setToken, logout, hasPermission, fetchUserResources
│   │   ├── config.store.ts            # ConfigsList cache (from lista.all) — localStorage, 30-min TTL
│   │   └── ui.store.ts                # Global loading, modal, toast state
│   │
│   ├── router/
│   │   ├── index.ts                   # createRouter + all route definitions
│   │   └── guards.ts                  # authGuard, permissionGuard
│   │
│   ├── composables/
│   │   ├── useAuth.ts                 # Wraps auth.store; exposes isLoggedIn, hasPermission
│   │   ├── usePagination.ts           # PaginationState factory; reset helpers
│   │   ├── usePermission.ts           # Single-check: const can = usePermission('TELA_XYZ')
│   │   └── useToast.ts                # Wraps UI store toast queue
│   │
│   ├── utils/
│   │   ├── date.utils.ts              # format helpers using date-fns (PT-BR locale)
│   │   ├── string.utils.ts            # truncate, capitalise, CNPJ mask
│   │   ├── storage.utils.ts           # typesafe localStorage/sessionStorage wrappers + TTL
│   │   └── csv.utils.ts               # Export to CSV using Papa Parse + FileSaver
│   │
│   ├── constants/
│   │   ├── permissions.ts             # MENU_PERMISSIONS + PAGE_PERMISSIONS const maps
│   │   ├── storage-keys.ts            # LOCAL_STORAGE_KEYS + SESSION_STORAGE_KEYS
│   │   └── nav-menu.ts                # NAV_MENU constant (NavItem[])
│   │
│   ├── types/
│   │   ├── index.ts                   # Re-exports all types
│   │   ├── modelo.types.ts
│   │   ├── showroom.types.ts
│   │   ├── dashboard.types.ts
│   │   ├── analytics.types.ts
│   │   └── pagination.types.ts        # PaginationState, PaginatedResponse
│   │
│   ├── services/
│   │   └── analytics.service.ts       # AnalyticsService class: event queue, 5-sec flush
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── PrivateLayout.vue      # Sidebar nav + main content area
│   │   │   ├── PublicLayout.vue       # Centered card layout for login pages
│   │   │   ├── AdminLayout.vue        # Admin sidebar + breadcrumb
│   │   │   ├── AppHeader.vue          # Top bar: logo, user menu, logout
│   │   │   └── NavMenu.vue            # Sidebar menu — renders NAV_MENU, hides items by permission
│   │   │
│   │   ├── common/
│   │   │   ├── DataTable.vue          # Paginated table — columns prop, sort emit, row click
│   │   │   ├── FilterPanel.vue        # Collapsible filter form wrapper
│   │   │   ├── ConfirmDialog.vue      # Modal: title, message, confirm/cancel callbacks
│   │   │   ├── LoadingOverlay.vue     # Full-page spinner overlay
│   │   │   ├── Pagination.vue         # Page controls + size selector (20/50/100)
│   │   │   ├── StatusBadge.vue        # Coloured badge for StatusModelo
│   │   │   └── ChipList.vue           # Renders string[] as chips/tags
│   │   │
│   │   └── modelo/
│   │       ├── CaracteristicasProduto.vue   # Form section 1 (product fields)
│   │       ├── CaracteristicasTecnicas.vue  # Form section 2 (technical fields)
│   │       ├── ObservacaoForm.vue            # Form section 3 (observations)
│   │       └── ModelHistoryDrawer.vue        # Commit history side-panel
│   │
│   └── pages/
│       ├── auth/
│       │   ├── SignInPage.vue          # /sign-in — Okta login button
│       │   └── LoginCallbackPage.vue   # /login — extracts ?token, stores, redirects
│       │
│       ├── modelos/
│       │   ├── DashboardPage.vue       # /modelos/dashboard   — TELA_DASHBOARD
│       │   ├── InventarioPage.vue      # /modelos/inventario  — TELA_CONSULTA_MODELO
│       │   ├── CadastroPage.vue        # /modelos/cadastro    — write permission
│       │   ├── EditarPage.vue          # /modelos/editar/:id  — write permission
│       │   ├── VisualizarPage.vue      # /modelos/visualizar/:id — TELA_CONSULTA_MODELO
│       │   ├── SyncPage.vue            # /modelos/sync        — TELA_SINCRONIZACAO
│       │   └── JobsPage.vue            # /modelos/jobs        — TELA_JOBS
│       │
│       ├── historico/
│       │   ├── ConsultaPage.vue        # /historico/consulta  — TELA_HISTORICO_CONSULTAS
│       │   └── DetailPage.vue          # /historico/:id       — TELA_HISTORICO_CONSULTAS
│       │
│       ├── categorias/
│       │   ├── ConsultaPage.vue        # /categorias/consulta — TELA_CATEGORIAS
│       │   ├── CadastroPage.vue        # /categorias/cadastro
│       │   └── EditarPage.vue          # /categorias/:id
│       │
│       ├── baldes/
│       │   ├── ListPage.vue            # /baldes              — TELA_CONSULTA_BALDE
│       │   ├── NovoPage.vue            # /baldes/novo
│       │   └── EditarPage.vue          # /baldes/:id
│       │
│       ├── showroom/
│       │   ├── ConsultaPage.vue        # /showroom            — SHOWROOM_CONSULTA
│       │   ├── RelatoriosPage.vue      # /showroom/relatorios — SHOWROOM_RELATORIOS
│       │   └── ModelosPage.vue         # /showroom/modelos    — SHOWROOM_MODELOS
│       │
│       ├── perfis/
│       │   ├── ConsultaPage.vue        # /perfis/consulta     — TELA_CONSULTA_PERFIL
│       │   ├── CadastroPage.vue        # /perfis/cadastro
│       │   └── EditarPage.vue          # /perfis/:id
│       │
│       ├── recursos/
│       │   ├── ConsultaPage.vue        # /recursos/consulta   — TELA_CONSULTA_RECURSO
│       │   ├── CadastroPage.vue        # /recursos/cadastro
│       │   └── EditarPage.vue          # /recursos/:id
│       │
│       └── admin/
│           ├── DashboardPage.vue       # /admin               — ADMIN_DASHBOARD
│           ├── users/
│           │   ├── ListPage.vue        # /admin/users
│           │   └── DetailPage.vue      # /admin/users/:id
│           ├── invitations/
│           │   ├── ListPage.vue        # /admin/invitations
│           │   └── AcceptPage.vue      # /accept-invite?token= (public)
│           ├── perfis/
│           │   ├── ListPage.vue        # /admin/perfis
│           │   └── EditPage.vue        # /admin/perfis/:id
│           ├── recursos/
│           │   ├── ListPage.vue        # /admin/recursos
│           │   └── EditPage.vue        # /admin/recursos/:id
│           ├── entities/
│           │   └── EntityPage.vue      # /admin/entidades/:type — generic CRUD for 20 types
│           ├── showroom/
│           │   ├── PoolPage.vue        # /admin/showroom/pool
│           │   └── FeaturedPage.vue    # /admin/showroom/featured (drag-and-drop reorder)
│           ├── analytics/
│           │   └── ReportsPage.vue     # /admin/analytics
│           └── audit-log/
│               ├── ListPage.vue        # /admin/audit-log
│               └── DetailPage.vue      # /admin/audit-log/:id
│
├── public/
│   └── favicon.ico
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── .env.example
├── Dockerfile
└── package.json
```

---

## Route Definitions

### Public Routes

| Path | Component | Notes |
|---|---|---|
| `/sign-in` | `SignInPage` | Okta login button; redirects to Okta SAML URL |
| `/login` | `LoginCallbackPage` | Okta SSO callback; extracts `?token=&userId=`, stores in localStorage, redirects to `/modelos/dashboard` |
| `/accept-invite` | `AcceptInvitePage` | Validates `?token=` invite token; guides user through Okta onboarding |
| `/**` (catch-all) | — | Redirects to `/sign-in` |

### Private Routes

| Path | Page | Required Permission |
|---|---|---|
| `/home` | — | Redirects to `/modelos/dashboard` |
| `/modelos/dashboard` | `DashboardPage` | `TELA_DASHBOARD` |
| `/modelos/inventario` | `InventarioPage` | `TELA_CONSULTA_MODELO` |
| `/modelos/cadastro` | `CadastroPage` | `TELA_CONSULTA_MODELO` (write) |
| `/modelos/editar/:id` | `EditarPage` | `TELA_CONSULTA_MODELO` (write) |
| `/modelos/visualizar/:id` | `VisualizarPage` | `TELA_CONSULTA_MODELO` |
| `/modelos/sync` | `SyncPage` | `TELA_SINCRONIZACAO` |
| `/modelos/jobs` | `JobsPage` | `TELA_JOBS` |
| `/historico/consulta` | `ConsultaPage` | `TELA_HISTORICO_CONSULTAS` |
| `/historico/:id` | `DetailPage` | `TELA_HISTORICO_CONSULTAS` |
| `/categorias/consulta` | `ConsultaPage` | `TELA_CATEGORIAS` |
| `/categorias/cadastro` | `CadastroPage` | `TELA_CATEGORIAS` (write) |
| `/categorias/:id` | `EditarPage` | `TELA_CATEGORIAS` (write) |
| `/baldes` | `ListPage` | `TELA_CONSULTA_BALDE` |
| `/baldes/novo` | `NovoPage` | `TELA_CONSULTA_BALDE` (write) |
| `/baldes/:id` | `EditarPage` | `TELA_CONSULTA_BALDE` (write) |
| `/showroom` | `ConsultaPage` | `SHOWROOM_CONSULTA` |
| `/showroom/relatorios` | `RelatoriosPage` | `SHOWROOM_RELATORIOS` |
| `/showroom/modelos` | `ModelosPage` | `SHOWROOM_MODELOS` |
| `/perfis/consulta` | `ConsultaPage` | `TELA_CONSULTA_PERFIL` |
| `/perfis/cadastro` | `CadastroPage` | `TELA_CONSULTA_PERFIL` (write) |
| `/perfis/:id` | `EditarPage` | `TELA_CONSULTA_PERFIL` (write) |
| `/recursos/consulta` | `ConsultaPage` | `TELA_CONSULTA_RECURSO` |
| `/recursos/cadastro` | `CadastroPage` | `TELA_CONSULTA_RECURSO` (write) |
| `/recursos/:id` | `EditarPage` | `TELA_CONSULTA_RECURSO` (write) |

### Admin Routes (all require `MENU_ADMIN`)

| Path | Page | Required Permission |
|---|---|---|
| `/admin` | `DashboardPage` | `ADMIN_DASHBOARD` |
| `/admin/users` | `users/ListPage` | `ADMIN_USERS_LIST` |
| `/admin/users/:id` | `users/DetailPage` | `ADMIN_USERS_LIST` |
| `/admin/invitations` | `invitations/ListPage` | `ADMIN_INVITATIONS_LIST` |
| `/admin/perfis` | `perfis/ListPage` | `ADMIN_PERFIS_LIST` |
| `/admin/perfis/:id` | `perfis/EditPage` | `ADMIN_PERFIS_EDIT` |
| `/admin/recursos` | `recursos/ListPage` | `ADMIN_RECURSOS_LIST` |
| `/admin/recursos/:id` | `recursos/EditPage` | `ADMIN_RECURSOS_EDIT` |
| `/admin/entidades/:type` | `entities/EntityPage` | `ADMIN_ENTITIES_EDIT` |
| `/admin/showroom/pool` | `showroom/PoolPage` | `ADMIN_SHOWROOM_POOL` |
| `/admin/showroom/featured` | `showroom/FeaturedPage` | `ADMIN_SHOWROOM_FEATURED` |
| `/admin/analytics` | `analytics/ReportsPage` | `ADMIN_ANALYTICS` |
| `/admin/audit-log` | `audit-log/ListPage` | `ADMIN_AUDIT_LOG` |
| `/admin/audit-log/:id` | `audit-log/DetailPage` | `ADMIN_AUDIT_LOG` |

---

## Route Guard Logic

```
Router.beforeEach:
  1. If route is public → proceed
  2. Decode JWT from localStorage.
     - If absent or expired → redirect to /sign-in?status=expired
  3. If userResources not in sessionStorage → call security.myResources, store base64-encoded JSON (4h TTL)
  4. Check route.meta.permission against userResources
     - If absent → redirect to /sign-in?status=forbidden
  5. Proceed
```

---

## Key Implementation Patterns

### tRPC Client (`src/lib/trpc.ts`)

```typescript
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '@osm/shared'
import { getAccessToken, logout } from './auth'

export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_TRPC_URL,
      headers: () => {
        const token = getAccessToken()
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
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
```

### Auth Store (`src/store/auth.store.ts`)

```typescript
interface AuthState {
  accessToken: string | null
  userInfo: UserInfoPayload | null
  userResources: Recurso[]
  isLoading: boolean
}

// Methods:
// setToken(token: string): void        — stores to localStorage
// logout(): void                       — clears localStorage + sessionStorage
// isLoggedIn(): boolean                — checks token presence + exp
// hasPermission(code: string): boolean — checks userResources list
// fetchUserResources(): Promise<void>  — calls security.myResources, caches in sessionStorage
```

### Permission Guard Pattern

```vue
<!-- CORRECT: use v-if (hides element — no DOM node) -->
<Button v-if="hasPermission('TELA_CONSULTA_MODELO')">Editar</Button>

<!-- WRONG: never use v-show or :disabled for permission gating -->
```

### Pagination Pattern

```typescript
// usePagination.ts
interface PaginationState {
  page: number   // 0-indexed
  size: number   // 20 | 50 | 100
  total: number  // totalElements from API
  sort: string   // "campo,asc" | "campo,desc"
}
// On filter/sort/size change → reset page to 0 before fetching
```

### Config Store (Reference Lists)

```typescript
// On app startup (after auth), call lista.all once.
// Cache full ConfigsList in localStorage key "configs" with 30-min TTL.
// All dropdowns read from the store — never call lista.all in page components.
```

---

## Page-by-Page Spec

### Auth Pages

**`SignInPage.vue`** (`/sign-in`)
- Shows the OSM logo and an "Entrar com SSO" button.
- Button redirects to `${VITE_OKTA_SAML_URL}${VITE_OKTA_SERVICE_PROVIDER_ID}`.
- Displays a message when `?status=expired` or `?status=forbidden` is in the query string.

**`LoginCallbackPage.vue`** (`/login`)
- Extracts `token` and `userId` from query params.
- Calls `authStore.setToken(token)`.
- Calls `trpcClient.auth.me.query()` to fetch user profile.
- Calls `authStore.fetchUserResources()`.
- Redirects to `/modelos/dashboard`.

---

### Modelos Pages

**`DashboardPage.vue`** (`/modelos/dashboard`) — `TELA_DASHBOARD`
- Calls `dashboard.consolidado` with optional filter.
- Renders a card grid of `ModeloDashboardDto[]` — each card shows: nome, status badge, tipoProduto chip, cliente, idadeModelo.
- Links to `/modelos/visualizar/:id`.

**`InventarioPage.vue`** (`/modelos/inventario`) — `TELA_CONSULTA_MODELO`
- `<FilterPanel>` with fields: status, tipoProduto, tipoExecucao, ambiente, dataInicio, dataFim, nomeModelo.
- `<DataTable>` columns: Nome, Data Implantação, Data Desativação, Data Dragonização, Produto (badge), Tipo, Ambientes (chips), Status (badge), Cliente, Frequência, Idade, Descrição, Ações.
- Page size: 20 / 50 / 100. Export to CSV button. `<Pagination>` controls.
- Row actions: Visualizar (always visible), Editar (v-if write permission).

**`CadastroPage.vue`** / **`EditarPage.vue`** (`/modelos/cadastro`, `/modelos/editar/:id`)
- Three-tab form using `CaracteristicasProduto`, `CaracteristicasTecnicas`, `ObservacaoForm`.
- All dropdowns populated from `configStore`.
- CNPJ field uses mask (`00.000.000/0000-00`); on blur, calls `clientes.getByCnpj` to auto-fill `nomeCliente`.
- File upload section uses native `fetch` to `VITE_UPLOAD_URL/template`.
- `EditarPage` also shows `<ModelHistoryDrawer>` side-panel (calls `modelos.getHistory`).

**`VisualizarPage.vue`** (`/modelos/visualizar/:id`)
- Read-only display of all model fields.
- Shows billing section (calls `modelos.getFaturamento`).
- Shows history drawer.

**`SyncPage.vue`** (`/modelos/sync`) — `TELA_SINCRONIZACAO`
- Multi-select table of models.
- "Sincronizar Selecionados" button → calls `modelos.sync(modeloIds[])`.
- "Sincronizar Um" per-row action → calls `modelos.syncOne(id)`.

**`JobsPage.vue`** (`/modelos/jobs`) — `TELA_JOBS`
- Paginated table calling `processamento.list`.
- Filter: modelo, dataInicio, dataFinal.
- Columns: dagRunId, dagId, startDate, endDate, state (badge), executionTime, failedAt.

---

### Histórico Pages

**`ConsultaPage.vue`** (`/historico/consulta`) — `TELA_HISTORICO_CONSULTAS`
- Filter: dataInicio, dataFim, modelo.
- Chart from `historico.grafico` (line chart: date × quantidadeConsultas).
- Table from `historico.list` (paginated).

**`DetailPage.vue`** (`/historico/:id`)
- Single record detail view.

---

### Soluções Analíticas Pages

**`categorias/ConsultaPage.vue`** — `TELA_CATEGORIAS`
- Paginated table: categoryName, categoryDescription, percentage.
- Create + Edit links.

**`categorias/CadastroPage.vue`** / **`EditarPage.vue`**
- Form: categoryName (text), categoryDescription (text), percentage (number 0–100).

**`baldes/ListPage.vue`** — `TELA_CONSULTA_BALDE`
- Paginated table: nome, descricao.

**`baldes/NovoPage.vue`** / **`EditarPage.vue`**
- Form: nome, descricao.
- Edit page uses `baldes.getEditInfo` (includes categories[] and rules[]).

---

### Showroom Pages

**`ConsultaPage.vue`** (`/showroom`) — `SHOWROOM_CONSULTA`
- Filter: modelo, documento, usuario, publico, email, dataInicio, dataFim.
- Paginated table calling `showroom.list`.

**`RelatoriosPage.vue`** (`/showroom/relatorios`) — `SHOWROOM_RELATORIOS`
- Date range picker (dataInicio, dataFim).
- Calls `showroom.relatorios`, displays downloadable report table.

**`ModelosPage.vue`** (`/showroom/modelos`) — `SHOWROOM_MODELOS`
- Calls `showroom.top5`.
- Displays top-5 most queried models as ranked cards or bar chart.

---

### Perfis Pages

**`ConsultaPage.vue`** — `TELA_CONSULTA_PERFIL`
- Paginated table: nome, number of recursos.
- Filter: search.

**`CadastroPage.vue`** / **`EditarPage.vue`**
- Form: nome (text), recursos (multi-select from `recursos.listAll`).

---

### Recursos Pages

**`ConsultaPage.vue`** — `TELA_CONSULTA_RECURSO`
- Paginated table: nome (permission code), descricao.

**`CadastroPage.vue`** / **`EditarPage.vue`**
- Form: nome (text), descricao (text).

---

### Admin Pages

Follows `ADMIN_MODULE.md` §4. All admin pages use `AdminLayout`.

**`DashboardPage.vue`** (`/admin`)
- Calls `admin.stats` — shows KPI cards: total users, active users, pending invitations, total perfis, total recursos.

**`users/ListPage.vue`** (`/admin/users`)
- Filter: search, isActive, perfilId, hasNoPerfil, invitedOnly, dataInicio, dataFim.
- Table: email, fullName, isActive badge, lastLoginAt, perfis.
- Row actions: View detail, Toggle active, Assign perfil.

**`users/DetailPage.vue`** (`/admin/users/:id`)
- Full user profile. Assign / remove perfis. Shows invite history.

**`invitations/ListPage.vue`** (`/admin/invitations`)
- Table: email, status, invitedBy, invitedAt, expiresAt.
- Actions: Resend, Cancel.
- "Convidar Usuário" button → form modal with email + defaultPerfilId.

**`perfis/ListPage.vue`** (`/admin/perfis`)
- Extended perfis list with userCount, clone action.

**`perfis/EditPage.vue`** (`/admin/perfis/:id`)
- Edit nome + recurso assignments. Shows user list for this perfil.

**`recursos/ListPage.vue`** (`/admin/recursos`)
- Recursos grouped by module. Shows perfilCount.

**`recursos/EditPage.vue`** (`/admin/recursos/:id`)
- Edit nome, descricao, module field.

**`entities/EntityPage.vue`** (`/admin/entidades/:type`)
- Generic CRUD page driven by `type` route param (one of the 20 reference entity types).
- Calls `admin.entities.list(type)`, `admin.entities.create(type, data)`, `admin.entities.update(type, id, data)`, `admin.entities.delete(type, id)`.

**`showroom/PoolPage.vue`** (`/admin/showroom/pool`)
- Lists all models with `showroomBizDev: true`.
- Toggle `showroomBizDev` flag per model.

**`showroom/FeaturedPage.vue`** (`/admin/showroom/featured`)
- Drag-and-drop reorder of featured models using `vue-draggable-plus`.
- Calls `admin.showroom.reorder(ids[])` on drop.

**`analytics/ReportsPage.vue`** (`/admin/analytics`)
- Date range + report type selector.
- Calls `admin.analytics.report(type, filter)`.
- Renders chart + table.

**`audit-log/ListPage.vue`** (`/admin/audit-log`)
- Paginated log table: action, entity, entityId, performedBy, performedAt.
- Export to CSV button.

**`audit-log/DetailPage.vue`** (`/admin/audit-log/:id`)
- Full audit entry: before/after payload diff.

---

## Analytics Service

```typescript
// src/services/analytics.service.ts
class AnalyticsService {
  private queue: AnalyticsEvent[] = []
  private timer: ReturnType<typeof setInterval> | null = null

  track(event: AnalyticsEvent): void {
    this.queue.push(event)
    if (!this.timer) {
      this.timer = setInterval(() => this.flush(), 5000)
    }
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return
    const events = [...this.queue]
    this.queue = []
    try {
      await trpcClient.admin.analytics.track.mutate({ events })
    } catch {
      // fire-and-forget — silently ignore failures
    }
  }
}

export const analytics = new AnalyticsService()
```

Track events on: page views, model create/edit/sync, filter applications, CSV exports, showroom queries.

---

## Environment Variables

```bash
# apps/frontend/.env.example
VITE_TRPC_URL=http://localhost:3000/trpc
VITE_UPLOAD_URL=http://localhost:3000/upload
VITE_OKTA_SAML_URL=https://digital-sso-saml-nonprod.serasaexperian.com.br/saml2/authenticate/
VITE_OKTA_SERVICE_PROVIDER_ID=experian-score-manager-model-local
```

---

## Docker / Nginx

Multi-stage `Dockerfile`:
1. **Build stage** (`node:22-alpine`): `pnpm install && pnpm build` → outputs to `dist/`.
2. **Serve stage** (`nginx:1.29-alpine`): copies `dist/` to `/usr/share/nginx/html`.

Nginx config must include:
- SPA fallback: `try_files $uri $uri/ /index.html;`
- Static asset caching: `Cache-Control: max-age=31536000, immutable` for `/assets/**`.
- Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy`.
- Runtime env var injection via `envsubst` in `run.sh` to replace `VITE_*` placeholders (for Docker runtime config without rebuild).

---

## Completion Criteria

- [ ] `pnpm --filter frontend dev` starts dev server on `http://localhost:5173`
- [ ] `pnpm --filter frontend build` produces a valid `dist/`
- [ ] Unauthenticated visit to `/modelos/dashboard` redirects to `/sign-in`
- [ ] `/login?token=<valid_jwt>` stores token and redirects to `/modelos/dashboard`
- [ ] `NavMenu` hides items where `hasPermission(recurso)` returns false
- [ ] All pages render without TypeScript errors
- [ ] `DataTable`, `FilterPanel`, `Pagination` have passing component tests
- [ ] `docker build apps/frontend` succeeds and container serves the SPA
- [ ] Nginx SPA fallback works: direct navigation to `/modelos/inventario` returns 200
