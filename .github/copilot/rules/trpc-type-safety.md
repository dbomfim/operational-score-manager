# Rule: tRPC Type Safety

## Principle

The entire API surface for domain data is defined once in `packages/api` and exposed through tRPC. There are **no hand-written REST endpoints** for domain data. This eliminates schema drift, removes the need for API clients, and gives the frontend compile-time type safety on every call. If the frontend compiles, the API contract is correct.

---

## Correct Pattern

### Defining a procedure (backend)

```typescript
// apps/backend/src/routers/modelo.ts
import { z } from 'zod'
import { router, withPermission } from '../trpc'
import { ModeloDtoSchema } from '@osm/api'   // Zod schema from shared package

export const modeloRouter = router({
  list: withPermission('TELA_CONSULTA_MODELO').query(async ({ ctx, input }) => {
    const { page, size, sort, filter } = input
    return await ctx.prisma.modelo.findMany({ skip: page * size, take: size })
  }),

  create: withPermission('TELA_CONSULTA_MODELO').mutation(async ({ ctx, input }) => {
    return await ctx.prisma.modelo.create({ data: input })
  }),
})
```

### Consuming a procedure (frontend)

```typescript
// apps/frontend/src/pages/modelos/InventarioPage.vue
import { trpc } from '@/lib/trpc'        // tRPC client
import type { AppRouter } from '@osm/api' // type-only import — no runtime coupling

// With TanStack Query
const { data, isLoading } = trpc.modelos.list.useQuery({ page: 0, size: 20 })

// Mutation
const { mutate: createModelo } = trpc.modelos.create.useMutation({
  onSuccess: () => queryClient.invalidateQueries(['modelos.list']),
})
```

### Adding a Zod schema (shared package)

```typescript
// packages/api/src/schemas/modelo.schema.ts
import { z } from 'zod'

export const ModeloDtoSchema = z.object({
  nome: z.string().min(1),
  status: z.object({ _id: z.string(), descricao: z.string() }),
  tipoProduto: z.object({ _id: z.string(), descricao: z.string(), color: z.string() }),
  // ... all fields from PROJECT_INSTRUCTIONS.md §6.4
})

export type ModeloDto = z.infer<typeof ModeloDtoSchema>
```

---

## Incorrect Pattern — NEVER DO THIS

```typescript
// ❌ WRONG — raw fetch from frontend for domain data
const res = await fetch('/api/modelos?page=0&size=20', {
  headers: { Authorization: `Bearer ${token}` },
})
const data = await res.json()  // No type safety — any type

// ❌ WRONG — axios call for domain data
const { data } = await axios.get('/api/modelos/123')

// ❌ WRONG — local type definition duplicating @osm/api
interface Modelo { nome: string; status: any }  // drift-prone

// ❌ WRONG — untyped Hono REST route for domain data
app.get('/api/modelos', async (c) => {
  const modelos = await prisma.modelo.findMany()
  return c.json(modelos)  // No tRPC; no type contract
})
```

---

## Exceptions

| Endpoint | Method | Reason |
|---|---|---|
| `/upload/template` | `POST` multipart | tRPC cannot handle multipart/form-data file uploads |
| `/upload/validate-variables` | `POST` multipart | Same reason |
| `/health` | `GET` | Infrastructure health check, not a domain endpoint |

For file uploads, use native `fetch` with `FormData`:

```typescript
// ✅ Acceptable — file upload REST call
const formData = new FormData()
formData.append('file', file)
formData.append('modeloId', modeloId)
await fetch(`${import.meta.env.VITE_UPLOAD_URL}/template`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${getAccessToken()}` },
  body: formData,
})
```

---

## Verification Checklist

- [ ] All new data procedures are defined in `apps/backend/src/routers/`
- [ ] All new Zod schemas are in `packages/api/src/schemas/` and exported from `packages/api/src/index.ts`
- [ ] Frontend imports types from `@osm/api` — no local interface duplication
- [ ] No `fetch('/api/...')` or `axios.get('/api/...')` calls for domain data
- [ ] New procedures are registered in `apps/backend/src/routers/index.ts`
- [ ] TypeScript compiles without errors after changes (`pnpm --filter @osm/api build && pnpm --filter @osm/backend build && pnpm --filter @osm/frontend build`)
