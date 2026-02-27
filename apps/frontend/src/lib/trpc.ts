import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { getAccessToken, logout } from "./auth";
import { env } from "@/config/env";

/**
 * AppRouter type - for full type safety, nestjs-trpc can generate this.
 * Using `any` as placeholder until schema generation is configured.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppRouter = any;

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: env.VITE_TRPC_URL,
      headers: () => {
        const token = getAccessToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          credentials: "include",
        }).then((res) => {
          if (res.status === 401) {
            logout();
          }
          return res;
        });
      },
    }),
  ],
});
