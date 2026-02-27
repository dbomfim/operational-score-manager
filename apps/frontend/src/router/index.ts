import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/store/auth.store";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/modelos",
    },
    {
      path: "/sign-in",
      name: "sign-in",
      component: () => import("@/pages/auth/SignInPage.vue"),
      meta: { public: true },
    },
    {
      path: "/login",
      name: "login-callback",
      component: () => import("@/pages/auth/LoginCallbackPage.vue"),
      meta: { public: true },
    },
    {
      path: "/modelos",
      name: "modelos",
      component: () => import("@/pages/ModelosPage.vue"),
    },
    {
      path: "/health",
      name: "health",
      component: () => import("@/pages/HealthPage.vue"),
      meta: { public: true },
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.public) return true;
  if (!auth.isLoggedIn) {
    return { name: "sign-in", query: { redirect: to.fullPath } };
  }
  return true;
});

export default router;
