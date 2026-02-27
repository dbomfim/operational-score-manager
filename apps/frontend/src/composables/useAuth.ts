import { storeToRefs } from "pinia";
import { useAuthStore } from "@/store/auth.store";

export function useAuth() {
  const auth = useAuthStore();
  const { isLoggedIn, permissions } = storeToRefs(auth);
  return {
    isLoggedIn,
    permissions,
    hasPermission: auth.hasPermission,
    setToken: auth.setToken,
    clearToken: auth.clearToken,
    setPermissions: auth.setPermissions,
  };
}
