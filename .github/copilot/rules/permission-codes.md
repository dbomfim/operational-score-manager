# Rule: Permission Codes

## Principle

Menu items and UI elements are **hidden** (removed from the DOM) when the user lacks the required permission — never just visually disabled. A disabled button still reveals that a feature exists and may confuse users. Hidden elements improve UX and reduce information leakage. The permission system is RBAC-based: users have **Perfis** (roles), each Perfil contains **Recursos** (permissions identified by a `nome` code string).

---

## Correct Pattern

### Frontend permission check

```typescript
// composables/usePermission.ts
export function usePermission() {
  const authStore = useAuthStore()
  const hasPermission = (code: string): boolean =>
    authStore.userResources.some(r => r.nome === code)
  return { hasPermission }
}
```

### Hiding elements (Vue 3)

```vue
<!-- ✅ CORRECT — hidden with v-if when permission absent -->
<template>
  <NavItem v-if="hasPermission('MENU_MODELOS')" to="/modelos/dashboard">
    Modelos
  </NavItem>

  <Button v-if="hasPermission('TELA_CONSULTA_MODELO')" @click="openCreateForm">
    Novo Modelo
  </Button>

  <RouterLink v-if="hasPermission('ADMIN_USUARIOS_VIEW')" to="/admin/usuarios">
    Usuários
  </RouterLink>
</template>
```

### Hiding elements (React)

```tsx
// ✅ CORRECT — conditional render when permission absent
const { hasPermission } = usePermission()

return (
  <>
    {hasPermission('MENU_MODELOS') && <NavItem to="/modelos/dashboard">Modelos</NavItem>}
    {hasPermission('TELA_CONSULTA_MODELO') && (
      <Button onClick={openCreateForm}>Novo Modelo</Button>
    )}
  </>
)
```

### Route guard (frontend)

```typescript
// router/guards.ts
router.beforeEach(async (to) => {
  const { hasPermission } = usePermission()
  const requiredPermission = to.meta.permission as string | undefined

  if (!requiredPermission) return true                 // public route
  if (!isLoggedIn()) return { path: '/sign-in' }      // not authenticated
  if (!hasPermission(requiredPermission)) {
    showUnauthorizedModal()
    return false                                        // block navigation
  }
  return true
})
```

---

## Incorrect Pattern — NEVER DO THIS

```vue
<!-- ❌ WRONG — v-show hides visually but element remains in DOM -->
<Button v-show="hasPermission('TELA_CONSULTA_MODELO')">Novo Modelo</Button>

<!-- ❌ WRONG — disabled attribute reveals that feature exists -->
<Button :disabled="!hasPermission('TELA_CONSULTA_MODELO')">Novo Modelo</Button>

<!-- ❌ WRONG — CSS visibility, same problem as v-show -->
<Button :style="{ visibility: hasPermission('X') ? 'visible' : 'hidden' }">
  Novo Modelo
</Button>
```

---

## All Permission Codes

### Menu-level permissions (controls visibility of entire nav sections)

| Code | Controls |
|---|---|
| `MENU_MODELOS` | Entire "Modelos" nav group |
| `MENU_SOLUCOES_ANALITICAS` | "Soluções Analíticas" nav group (Categorias + Baldes) |
| `SHOWROOM_CONSULTA` | "Showroom" nav group |
| `MENU_ADMIN` | Legacy admin nav group (Perfis + Recursos) |

### Page-level permissions (main application)

| Code | Page |
|---|---|
| `TELA_DASHBOARD` | `/modelos/dashboard` |
| `TELA_CONSULTA_MODELO` | `/modelos/inventario`, `/modelos/visualizar/:id`, `/modelos/editar/:id` |
| `TELA_SINCRONIZACAO` | `/modelos/sync` |
| `TELA_JOBS` | `/modelos/jobs` |
| `TELA_HISTORICO_CONSULTAS` | `/historico/consulta`, `/historico/:id` |
| `TELA_CATEGORIAS` | `/categorias/consulta`, `/categorias/cadastro`, `/categorias/:id` |
| `TELA_CONSULTA_BALDE` | `/baldes`, `/baldes/novo`, `/baldes/:id` |
| `SHOWROOM_CONSULTA` | `/showroom` |
| `SHOWROOM_RELATORIOS` | `/showroom/relatorios` |
| `SHOWROOM_MODELOS` | `/showroom/modelos` |
| `TELA_CONSULTA_PERFIL` | `/perfis/consulta`, `/perfis/cadastro`, `/perfis/:id` |
| `TELA_CONSULTA_RECURSO` | `/recursos/consulta`, `/recursos/cadastro`, `/recursos/:id` |

### Admin permission codes (all routes under `/admin`)

| Code | Scope |
|---|---|
| `SUPER_ADMIN` | Gate to entire `/admin` section |
| `ADMIN_DASHBOARD` | `/admin` dashboard page |
| `ADMIN_USUARIOS_VIEW` | Read user list and user detail |
| `ADMIN_USUARIOS_MANAGE` | Assign roles, activate/deactivate users, send invitations |
| `ADMIN_PERFIS_VIEW` | Read role list and detail |
| `ADMIN_PERFIS_MANAGE` | Create, edit, clone, delete roles |
| `ADMIN_RECURSOS_VIEW` | Read permission list and detail |
| `ADMIN_RECURSOS_MANAGE` | Create, edit, delete permissions |
| `ADMIN_ENTIDADES_VIEW` | Read all 20 reference entity types |
| `ADMIN_ENTIDADES_MANAGE` | Create, update, activate/deactivate reference entities |
| `ADMIN_SHOWROOM_VIEW` | View showroom pool and featured list |
| `ADMIN_SHOWROOM_MANAGE` | Add/remove/reorder showroom entries |
| `ADMIN_ANALYTICS_VIEW` | View all analytics reports |
| `ADMIN_AUDITORIA_VIEW` | Read-only audit log access + export |

### Suggested role presets (seed data)

| Role | Permissions |
|---|---|
| `SUPER_ADMIN` | All `ADMIN_*` permissions |
| `ADMIN_READONLY` | All `*_VIEW` permissions |
| `USER_MANAGER` | `ADMIN_DASHBOARD`, `ADMIN_USUARIOS_VIEW`, `ADMIN_USUARIOS_MANAGE`, `ADMIN_PERFIS_VIEW` |
| `CONTENT_MANAGER` | `ADMIN_DASHBOARD`, `ADMIN_ENTIDADES_VIEW`, `ADMIN_ENTIDADES_MANAGE`, `ADMIN_SHOWROOM_VIEW`, `ADMIN_SHOWROOM_MANAGE` |
| `ANALYST` | `ADMIN_DASHBOARD`, `ADMIN_ANALYTICS_VIEW`, `ADMIN_AUDITORIA_VIEW` |

---

## Verification Checklist

- [ ] Every route in the router definition has a `meta.permission` field with the correct code
- [ ] Route guard blocks navigation and shows unauthorised modal when permission is missing
- [ ] Nav menu items use `v-if` / conditional render — not `v-show` or `:disabled`
- [ ] Action buttons (create, edit, sync, clone, delete) use `v-if` — not `:disabled`
- [ ] The admin layout root guard checks for `SUPER_ADMIN` before rendering any admin sub-page
- [ ] Individual admin sub-pages check their own granular `ADMIN_*` permission
- [ ] `userResources` is cached in `sessionStorage` as base64 JSON with a 4-hour TTL
