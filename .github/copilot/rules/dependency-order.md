# Rule: Dependency Order

## Principle

`packages/api` is the single source of truth for all shared types and Zod schemas. The backend implements the procedures. The frontend consumes them type-only. This one-directional flow prevents circular imports, guarantees that the API contract is defined before it is implemented, and ensures the frontend can never silently drift from the backend.

```
packages/api  →  apps/backend  →  apps/frontend
     1                2                 3
```

Never import from a downstream package. Never create circular dependencies.

---

## Correct Pattern

### packages/api — defines the contract

```typescript
// packages/api/src/schemas/modelo.schema.ts
import { z } from 'zod'

export const ModeloDtoSchema = z.object({
  nome: z.string().min(1),
  status: z.object({ _id: z.string(), descricao: z.string() }),
  tipoProduto: z.object({ _id: z.string(), descricao: z.string(), color: z.string() }),
  rangeInicial: z.number().int().min(0),
  rangeFinal: z.number().int().max(1000),
  // ... all fields from PROJECT_INSTRUCTIONS.md §6.4
})

export type ModeloDto = z.infer<typeof ModeloDtoSchema>
```

```typescript
// packages/api/src/index.ts
// Re-exports the AppRouter type from the backend (type-only — no runtime coupling)
export type { AppRouter } from '../../apps/backend/src/routers/index'
export * from './schemas/modelo.schema'
export * from './schemas/perfil.schema'
export * from './schemas/recurso.schema'
// ... all schema exports
```

### apps/backend — imports from @osm/api, never from apps/frontend

```typescript
// apps/backend/src/routers/modelo.ts
import { z } from 'zod'
import { ModeloDtoSchema } from '@osm/api'   // ✅ from shared package
import { router, withPermission } from '../trpc'
import { prisma } from '../lib/prisma'

export const modeloRouter = router({
  create: withPermission('TELA_CONSULTA_MODELO').input(ModeloDtoSchema).mutation(
    async ({ ctx, input }) => {
      return await prisma.modelo.create({ data: input })
    }
  ),
})
```

### apps/frontend — imports from @osm/api (type-only), never from apps/backend

```typescript
// apps/frontend/src/lib/trpc.ts
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '@osm/api'   // ✅ type-only import from shared package

export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_TRPC_URL,
      headers: () => ({ Authorization: `Bearer ${getAccessToken() ?? ''}` }),
    }),
  ],
})
```

```typescript
// apps/frontend/src/pages/modelos/CadastroPage.vue
import type { ModeloDto } from '@osm/api'   // ✅ type from shared package
// import type { ModeloDto } from '../../../backend/src/...'  ← NEVER
```

---

## Incorrect Pattern — NEVER DO THIS

```typescript
// ❌ WRONG — backend importing from frontend
// apps/backend/src/routers/modelo.ts
import type { ModeloDto } from '../../frontend/src/types/modelo'

// ❌ WRONG — frontend importing runtime code from backend
// apps/frontend/src/lib/trpc.ts
import { modeloRouter } from '../../../apps/backend/src/routers/modelo'  // breaks build

// ❌ WRONG — defining types locally in the frontend instead of @osm/api
// apps/frontend/src/types/modelo.ts
interface ModeloDto { nome: string; status: any }  // drift risk — not the real schema

// ❌ WRONG — circular: @osm/api importing from apps/backend at runtime
// packages/api/src/index.ts
import { prisma } from '../../apps/backend/src/lib/prisma'  // runtime dep on backend
```

---

## Build Order Enforcement

When running CI or a full build, always follow this order:

```bash
# Step 1: build shared package first
pnpm --filter @osm/api build

# Step 2: build backend (depends on @osm/api)
pnpm --filter @osm/backend build
pnpm --filter @osm/backend exec prisma generate

# Step 3: build frontend (depends on @osm/api type re-export)
pnpm --filter @osm/frontend build
```

In `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

In `apps/backend/package.json` and `apps/frontend/package.json`:

```json
{
  "dependencies": {
    "@osm/api": "workspace:*"
  }
}
```

---

## Exceptions

There are no runtime exceptions to this rule. The only allowed cross-package import is:

- `packages/api/src/index.ts` re-exports `type { AppRouter }` from `apps/backend/src/routers/index` — this is a **type-only** re-export. It creates no runtime dependency.

---

## Verification Checklist

- [ ] `packages/api/package.json` has no dependencies on `apps/backend` or `apps/frontend`
- [ ] `apps/backend` only imports from `@osm/api`, `zod`, and its own `src/` — never from `apps/frontend`
- [ ] `apps/frontend` only imports from `@osm/api` (types), `@trpc/client`, and its own `src/` — never from `apps/backend`
- [ ] All Zod schemas are in `packages/api/src/schemas/` — none defined locally in the backend or frontend
- [ ] CI runs build in order: `@osm/api` → `@osm/backend` → `@osm/frontend`
- [ ] `pnpm run build` succeeds without circular import warnings
