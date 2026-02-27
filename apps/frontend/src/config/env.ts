/**
 * Typed env var resolution for Vite (import.meta.env)
 */
export const env = {
  VITE_TRPC_URL: import.meta.env.VITE_TRPC_URL ?? "/trpc",
  VITE_APP_URL: import.meta.env.VITE_APP_URL ?? "http://localhost:5173",
} as const;
