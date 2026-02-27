import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/store/auth.store";
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

export default router;
