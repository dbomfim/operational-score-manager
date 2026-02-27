# Rule: Auth Guard

## Principle

Every backend procedure that reads or writes domain data must be gated behind authentication and, where applicable, a specific permission code. No data must ever be accessible via `publicProcedure` unless it is explicitly designed to be public. Accidental public exposure of scoring model data or user data is a security violation.

---

## Correct Pattern

### Protected procedure (authentication only)

Use `protectedProcedure` when any authenticated user can access the data — no specific permission required.

```typescript
// apps/backend/src/trpc.ts
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, userId: ctx.userId } })
})
```

### Permission-gated procedure (authentication + specific recurso)

Use `withPermission(code)` for any procedure that requires a specific `Recurso` code.

```typescript
// apps/backend/src/trpc.ts
export const withPermission = (code: string) =>
  protectedProcedure.use(({ ctx, next }) => {
    if (!ctx.userResources.includes(code))
      throw new TRPCError({ code: 'FORBIDDEN', message: `Missing permission: ${code}` })
    return next()
  })

// Usage in a router
export const modeloRouter = router({
  list:    withPermission('TELA_CONSULTA_MODELO').query(...),
  create:  withPermission('TELA_CONSULTA_MODELO').mutation(...),
  getById: withPermission('TELA_CONSULTA_MODELO').query(...),
})

// Admin procedures — use ADMIN_* codes from ADMIN_MODULE.md §5
export const adminUserRouter = router({
  list:         withPermission('ADMIN_USUARIOS_VIEW').query(...),
  updateStatus: withPermission('ADMIN_USUARIOS_MANAGE').mutation(...),
  assignPerfis: withPermission('ADMIN_USUARIOS_MANAGE').mutation(...),
})
```

### Context builder (JWT verification)

```typescript
// apps/backend/src/context.ts
import { jwtVerify, createRemoteJWKSet } from 'jose'

const JWKS = createRemoteJWKSet(new URL(process.env.IAM_JWKS_URL!))

export async function createContext({ req }: FetchCreateContextFnOptions): Promise<Context> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, userEmail: null, userResources: [] }
  }
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: process.env.IAM_ISSUER,
      audience: process.env.IAM_AUDIENCE,
    })
    return {
      userId: payload.sub ?? null,
      userEmail: payload['email'] as string ?? null,
      userResources: payload['resources'] as string[] ?? [],
    }
  } catch {
    return { userId: null, userEmail: null, userResources: [] }
  }
}
```

---

## Incorrect Pattern — NEVER DO THIS

```typescript
// ❌ WRONG — publicProcedure for domain data
export const modeloRouter = router({
  list: publicProcedure.query(async () => {         // No auth check!
    return await prisma.modelo.findMany()
  }),
})

// ❌ WRONG — protectedProcedure for admin data (needs specific permission)
export const adminRouter = router({
  users: protectedProcedure.query(async () => {     // Any user can see admin data!
    return await prisma.user.findMany()
  }),
})

// ❌ WRONG — manual permission check (bypasses withPermission factory)
export const modeloRouter = router({
  delete: protectedProcedure.mutation(async ({ ctx, input }) => {
    if (ctx.userId !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' }) // ad-hoc, not RBAC
    return await prisma.modelo.delete({ where: { id: input.id } })
  }),
})
```

---

## Exceptions

The following procedures are **intentionally public** — they must remain `publicProcedure`:

| Procedure | Reason |
|---|---|
| `admin.invitations.validate` | Called by `/aceitar-convite` page before Okta redirect; user is not yet authenticated |
| `admin.invitations.accept` | Called by auth callback after Okta login; token not yet stored |

The following procedures use `protectedProcedure` (authenticated but no specific recurso required):

| Procedure | Reason |
|---|---|
| `auth.me` | Any authenticated user can fetch their own profile |
| `auth.renewToken` | Any authenticated user can renew their own token |
| `lista.all` | Reference lists needed by all authenticated users |
| `security.myResources` | Each user fetches their own permissions |
| `admin.analytics.ingestEvents` | Any authenticated user sends analytics events |

---

## Verification Checklist

- [ ] No domain data procedure uses `publicProcedure`
- [ ] Every admin procedure uses `withPermission('ADMIN_*')` with the code from `ADMIN_MODULE.md §5`
- [ ] Every non-admin domain procedure uses `withPermission('TELA_*')` or `withPermission('SHOWROOM_*')` with codes from `PROJECT_INSTRUCTIONS.md §9`
- [ ] Context builder (`context.ts`) returns `{ userId: null, userResources: [] }` on invalid/missing JWT — never throws
- [ ] `protectedProcedure` middleware throws `UNAUTHORIZED` (not `FORBIDDEN`) when `ctx.userId` is null
- [ ] `withPermission` throws `FORBIDDEN` (not `UNAUTHORIZED`) when permission code is missing
