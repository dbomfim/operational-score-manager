import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/store/auth.store";
import { track } from "@/services/analytics.service";
import PrivateLayout from "@/components/layout/PrivateLayout.vue";
import PublicLayout from "@/components/layout/PublicLayout.vue";

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
          name: "admin",
          component: () => import("@/pages/admin/DashboardPage.vue"),
        },
        {
          path: "admin/users",
          name: "admin-users",
          component: () => import("@/pages/admin/UsersListPage.vue"),
        },
        {
          path: "admin/invitations",
          name: "admin-invitations",
          component: () => import("@/pages/admin/InvitationsListPage.vue"),
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
          path: "baldes",
          name: "baldes",
          component: () => import("@/pages/BaldesPage.vue"),
        },
        {
          path: "admin/roles",
          name: "admin-roles",
          component: () => import("@/pages/admin/RolesListPage.vue"),
        },
        {
          path: "admin/permissions",
          name: "admin-permissions",
          component: () => import("@/pages/admin/PermissionsListPage.vue"),
        },
        {
          path: "admin/audit-log",
          name: "admin-audit-log",
          component: () => import("@/pages/admin/AuditLogPage.vue"),
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
