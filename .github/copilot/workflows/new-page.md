# new-page — Frontend Page + tRPC Data Layer

## When to Use

Use when adding a new page to the frontend: a route-level page component with server data fetching via tRPC, a route registration, and a permission guard.

**Invoke:** "Follow the new-page workflow for [page-path] in [app]"

---

## Input Requirements

- Page route path (e.g., `/modelos/inventario`, `/admin/usuarios`)
- Backend tRPC procedure(s) the page calls
- Required permission code (from `PROJECT_INSTRUCTIONS.md §8` or `ADMIN_MODULE.md §4`)
- Layout: `PrivateLayout` (main app) or `AdminLayout` (`/admin` pages)

---

## Workflow Steps

**Step 1 — Read the spec**
- Find the route in `PROJECT_INSTRUCTIONS.md §8` (main app) or `ADMIN_MODULE.md §4` (admin).
- Identify the tRPC procedures called, required permission, and UI description.

**Step 2 — Confirm the backend procedure exists**
If the procedure is not yet implemented, follow the `new-module` workflow first.

**Step 3 — Create the page component**

```bash
# File to create (Vue 3):
apps/frontend/src/pages/<domain>/<PageName>Page.vue
```

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { trpcClient } from '@/lib/trpc'
import { usePagination } from '@/composables/usePagination'
import type { <Type> } from '@osm/api'

const { state: pagination, reset, setSort } = usePagination()

// Data fetching with TanStack Query
const { data, isLoading, error } = trpc.<domain>.list.useQuery(
  computed(() => ({ page: pagination.page, size: pagination.size }))
)
</script>

<template>
  <PrivateLayout>
    <LoadingOverlay v-if="isLoading" />
    <DataTable
      v-if="data"
      :rows="data.content"
      :total="data.totalElements"
      :pagination="pagination"
      @sort="setSort"
      @page="pagination.page = $event"
      @size="pagination.size = $event; reset()"
    />
  </PrivateLayout>
</template>
```

**Step 4 — Register the route**

```typescript
// apps/frontend/src/router/index.ts
{
  path: '/modelos/inventario',
  component: () => import('@/pages/modelos/InventarioPage.vue'),
  meta: {
    permission: 'TELA_CONSULTA_MODELO',
    layout: 'private',
  },
},
```

**Step 5 — Add nav item (if applicable)**

```vue
<!-- apps/frontend/src/components/layout/NavMenu.vue -->
<NavItem
  v-if="hasPermission('TELA_CONSULTA_MODELO')"
  to="/modelos/inventario"
>
  Inventário
</NavItem>
```

**Step 6 — Write component test**

```typescript
// apps/frontend/src/pages/modelos/InventarioPage.spec.ts
import { render, screen } from '@testing-library/vue'
import { describe, it, expect, vi } from 'vitest'
import InventarioPage from './InventarioPage.vue'

vi.mock('@/lib/trpc', () => ({ trpcClient: { modelos: { list: { query: vi.fn() } } } }))

describe('InventarioPage', () => {
  it('renders table when data is loaded', async () => {
    // ...
  })
})
```

---

## Verification Checklist

- [ ] Page component created at correct path
- [ ] Route registered with correct `meta.permission` code
- [ ] Nav item (if applicable) uses `v-if="hasPermission('...')"` — not `v-show` or `:disabled`
- [ ] Page uses `@osm/api` types — no local interface definitions
- [ ] Pagination resets on filter/sort change
- [ ] Loading state handled (show `LoadingOverlay` or skeleton)
- [ ] Error state handled (show toast or inline error)
- [ ] Component test file created

---

## Success Criteria

"Page [path] is complete when it loads data via tRPC, respects the permission guard (hidden if permission absent), handles loading/error states, and has at least one passing Vitest component test."
