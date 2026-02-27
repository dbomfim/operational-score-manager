# new-module — Backend tRPC Module Scaffold

## When to Use

Use when adding a new domain module to the backend: a new tRPC sub-router with its own Prisma model, Zod schema, and test file.

**Invoke:** "Follow the new-module workflow to create [module-name]"

---

## Input Requirements

- Module name (e.g., `modelo`, `categoria`, `admin/users`)
- Procedures to implement (list, getById, create, update, delete — or subset)
- Required permission codes (from `PROJECT_INSTRUCTIONS.md §9` or `ADMIN_MODULE.md §5`)
- Prisma model needed? (yes/no)

---

## Workflow Steps

**Step 1 — Read the spec**
Find the procedure specification in `PROJECT_INSTRUCTIONS.md §7` or `ADMIN_MODULE.md §3`.
Note all input/output shapes, permission codes, and business rules.

**Step 2 — Create the Zod schema (packages/api first)**

```bash
# File to create:
packages/api/src/schemas/<module>.schema.ts
```

```typescript
import { z } from 'zod'

export const <Module>DtoSchema = z.object({
  // fields from PROJECT_INSTRUCTIONS.md §6
})
export type <Module>Dto = z.infer<typeof <Module>DtoSchema>

export const <Module>Schema = <Module>DtoSchema.extend({
  _id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type <Module> = z.infer<typeof <Module>Schema>
```

Export from `packages/api/src/index.ts`:
```typescript
export * from './schemas/<module>.schema'
```

**Step 3 — Add Prisma model (if new entity)**

```prisma
// apps/backend/prisma/schema.prisma
model <Model> {
  id        String   @id @default(cuid())
  descricao String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Run `pnpm --filter @osm/backend exec prisma migrate dev --name add-<model>`.

**Step 4 — Create the router**

```bash
# File to create:
apps/backend/src/routers/<module>.ts
```

```typescript
import { z } from 'zod'
import { router, withPermission, protectedProcedure } from '../trpc'
import { <Module>DtoSchema } from '@osm/api'
import { prisma } from '../lib/prisma'
import { TRPCError } from '@trpc/server'

export const <module>Router = router({
  list: withPermission('<PERMISSION_CODE>')
    .input(z.object({
      page: z.number().int().min(0).default(0),
      size: z.number().int().min(1).max(100).default(20),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const { page, size, search } = input
      const where = search ? { descricao: { contains: search, mode: 'insensitive' as const } } : {}
      const [content, totalElements] = await Promise.all([
        prisma.<model>.findMany({ where, skip: page * size, take: size }),
        prisma.<model>.count({ where }),
      ])
      return {
        content, totalElements,
        totalPages: Math.ceil(totalElements / size),
        size, number: page,
        numberOfElements: content.length,
        first: page === 0,
        last: (page + 1) * size >= totalElements,
        empty: content.length === 0,
      }
    }),

  getById: withPermission('<PERMISSION_CODE>')
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const item = await prisma.<model>.findUnique({ where: { id: input.id } })
      if (!item) throw new TRPCError({ code: 'NOT_FOUND' })
      return item
    }),

  create: withPermission('<PERMISSION_CODE>')
    .input(<Module>DtoSchema)
    .mutation(async ({ input }) => {
      return await prisma.<model>.create({ data: input })
    }),

  update: withPermission('<PERMISSION_CODE>')
    .input(z.object({ id: z.string(), data: <Module>DtoSchema }))
    .mutation(async ({ input }) => {
      return await prisma.<model>.update({ where: { id: input.id }, data: input.data })
    }),
})
```

**Step 5 — Register in root router**

```typescript
// apps/backend/src/routers/index.ts
import { <module>Router } from './<module>'

export const appRouter = router({
  // existing routers...
  <module>: <module>Router,
})
```

**Step 6 — Write Vitest tests**

```bash
# File to create:
apps/backend/src/routers/<module>.spec.ts
```

Cover: happy path list, getById returns NOT_FOUND for unknown ID, FORBIDDEN when permission missing.

---

## Verification Checklist

- [ ] Schema in `packages/api/src/schemas/<module>.schema.ts` and exported from `index.ts`
- [ ] Router file at `apps/backend/src/routers/<module>.ts`
- [ ] Router registered in `apps/backend/src/routers/index.ts`
- [ ] Prisma migration run (if new model added)
- [ ] Every procedure uses `withPermission()` with a code from the spec
- [ ] Vitest spec file created and passes
- [ ] `pnpm --filter @osm/api build && pnpm --filter @osm/backend build` succeeds

---

## Success Criteria

"Module [name] is complete when all specified procedures are callable, permission-gated, Zod-validated, and covered by at least one passing Vitest test each."
