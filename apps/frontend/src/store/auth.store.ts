import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { getAccessToken, setAccessToken, clearAccessToken } from "@/lib/auth";

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(getAccessToken());
  const permissions = ref<string[]>([]);

  const isLoggedIn = computed(() => !!token.value);

  function setToken(newToken: string) {
    token.value = newToken;
    setAccessToken(newToken);
  }

  function clearToken() {
    token.value = null;
    permissions.value = [];
    clearAccessToken();
  }

  function setPermissions(perms: string[]) {
    permissions.value = perms;
  }

  function hasPermission(required: string): boolean {
    if (permissions.value.includes("admin:super")) return true;
    if (permissions.value.includes(required)) return true;
    const [resource, action] = required.split(":");
    const wildcard = `${resource}:*`;
    return permissions.value.includes(wildcard);
  }

  return {
    token,
    permissions,
    isLoggedIn,
    setToken,
    clearToken,
    setPermissions,
    hasPermission,
  };
});
