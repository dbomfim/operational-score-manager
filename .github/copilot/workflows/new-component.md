# new-component — Shared UI Component

## When to Use

Use when adding a reusable UI component to `apps/frontend/src/components/`. Components here are used across multiple pages.

**Invoke:** "Follow the new-component workflow for [component-name]"

---

## Input Requirements

- Component name (PascalCase, e.g., `DataTable`, `FilterPanel`, `ModelStatusBadge`)
- Props it accepts (name, type, required/optional, default)
- Events it emits (name, payload type)
- Slots (if any)
- Which directory: `common/`, `layout/`, or domain-specific (e.g., `modelo/`)

---

## Workflow Steps

**Step 1 — Determine placement**
- `components/common/` — used across 3+ different domain pages
- `components/layout/` — part of the app shell (header, nav, sidebars)
- `components/<domain>/` — used only within one domain (e.g., `components/modelo/`)

**Step 2 — Create the component**

```bash
# File to create:
apps/frontend/src/components/<directory>/<ComponentName>.vue
```

```vue
<script setup lang="ts">
import type { <Type> } from '@osm/api'   // use shared types where applicable

// Props
interface Props {
  rows: <Type>[]
  total: number
  loading?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

// Emits
const emit = defineEmits<{
  sort:   [field: string]
  page:   [page: number]
  select: [item: <Type>]
}>()
</script>

<template>
  <div class="data-table">
    <slot name="header" />
    <!-- table content -->
    <slot name="footer" />
  </div>
</template>
```

**Step 3 — Export from barrel (if component directory has an index)**

```typescript
// apps/frontend/src/components/common/index.ts
export { default as DataTable } from './DataTable.vue'
export { default as FilterPanel } from './FilterPanel.vue'
export { default as ConfirmDialog } from './ConfirmDialog.vue'
```

**Step 4 — Write component test**

```typescript
// apps/frontend/src/components/common/DataTable.spec.ts
import { render, screen } from '@testing-library/vue'
import DataTable from './DataTable.vue'

describe('DataTable', () => {
  it('renders rows', () => {
    render(DataTable, { props: { rows: [{ id: '1', nome: 'Teste' }], total: 1 } })
    expect(screen.getByText('Teste')).toBeInTheDocument()
  })

  it('emits sort event on header click', async () => {
    // ...
  })
})
```

---

## Verification Checklist

- [ ] Component uses `defineProps<Props>()` with TypeScript generic — no `PropType` casts
- [ ] Emits are typed with `defineEmits<{...}>()`
- [ ] Types come from `@osm/api` where applicable — no duplicate local interfaces
- [ ] Component has no direct tRPC calls (data is passed via props — pages own data fetching)
- [ ] Exported from barrel `index.ts` if one exists in that directory
- [ ] Vitest + Testing Library test covers at least: renders correctly, emits events

---

## Success Criteria

"Component [name] is complete when it accepts typed props, emits typed events, renders correctly in a Vitest test, and is exported from the component barrel."
