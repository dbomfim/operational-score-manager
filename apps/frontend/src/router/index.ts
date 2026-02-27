import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/store/auth.store";
import { track } from "@/services/analytics.service";
import PrivateLayout from "@/components/layout/PrivateLayout.vue";
import PublicLayout from "@/components/layout/PublicLayout.vue";
import AdminLayout from "@/components/layout/AdminLayout.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/modelos",
    },
    {
      path: "/",
      component: PublicLayout,
      meta: { public: true },
      children: [
        {
          path: "sign-in",
          name: "sign-in",
          component: () => import("@/pages/auth/SignInPage.vue"),
        },
        {
          path: "login",
          name: "login-callback",
          component: () => import("@/pages/auth/LoginCallbackPage.vue"),
        },
        {
          path: "health",
          name: "health",
          component: () => import("@/pages/HealthPage.vue"),
        },
        {
          path: "aceitar-convite",
          name: "accept-invite",
          component: () => import("@/pages/auth/AcceptInvitePage.vue"),
        },
      ],
    },
    {
      path: "/",
      component: PrivateLayout,
      children: [
        {
          path: "modelos",
          name: "modelos",
          component: () => import("@/pages/ModelosPage.vue"),
        },
        {
          path: "admin",
          component: AdminLayout,
          children: [
            { path: "", name: "admin", component: () => import("@/pages/admin/DashboardPage.vue") },
            { path: "users", name: "admin-users", component: () => import("@/pages/admin/UsersListPage.vue") },
            { path: "invitations", name: "admin-invitations", component: () => import("@/pages/admin/InvitationsListPage.vue") },
            { path: "roles", name: "admin-roles", component: () => import("@/pages/admin/RolesListPage.vue") },
            { path: "permissions", name: "admin-permissions", component: () => import("@/pages/admin/PermissionsListPage.vue") },
            { path: "audit-log", name: "admin-audit-log", component: () => import("@/pages/admin/AuditLogPage.vue") },
          ],
        },
        {
          path: "clientes",
          name: "clientes",
          component: () => import("@/pages/ClientesPage.vue"),
        },
        {
          path: "showroom",
          name: "showroom",
          component: () => import("@/pages/ShowroomPage.vue"),
        },
        {
          path: "categorias",
          name: "categorias",
          component: () => import("@/pages/CategoriasPage.vue"),
        },
        {
          path: "categorias/nova",
          name: "categorias-cadastro",
          component: () => import("@/pages/CategoriasCadastroPage.vue"),
        },
        {
          path: "categorias/:id",
          name: "categorias-editar",
          component: () => import("@/pages/CategoriasEditarPage.vue"),
        },
        {
          path: "historico/consulta",
          name: "historico-consulta",
          component: () => import("@/pages/HistoricoConsultaPage.vue"),
        },
        {
          path: "historico/:id",
          name: "historico-detail",
          component: () => import("@/pages/HistoricoDetailPage.vue"),
        },
        {
          path: "baldes",
          name: "baldes",
          component: () => import("@/pages/BaldesPage.vue"),
        },
        {
          path: "baldes/novo",
          name: "baldes-novo",
          component: () => import("@/pages/BaldesNovoPage.vue"),
        },
        {
          path: "baldes/:id",
          name: "baldes-editar",
          component: () => import("@/pages/BaldesEditarPage.vue"),
        },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  const isPublic = to.matched.some((r) => r.meta.public);
  if (isPublic) return true;
  if (!auth.isLoggedIn) {
    return { path: "/sign-in", query: { redirect: to.fullPath } };
  }
  return true;
});

router.afterEach((to) => {
  track({
    eventType: "page_view",
    page: to.path,
    referrer: document.referrer || undefined,
  });
});

export default router;
