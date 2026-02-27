/**
 * Typed env var resolution.
 * Prefers window.__ENV__ (runtime-injected) over import.meta.env (build-time).
 */
declare global {
  interface Window {
    __ENV__?: { VITE_TRPC_URL?: string; VITE_APP_URL?: string };
  }
}

const runtime = typeof window !== "undefined" ? window.__ENV__ : undefined;

export const env = {
  VITE_TRPC_URL:
    runtime?.VITE_TRPC_URL ?? import.meta.env.VITE_TRPC_URL ?? "/trpc",
  VITE_APP_URL:
    runtime?.VITE_APP_URL ?? import.meta.env.VITE_APP_URL ?? "http://localhost:5173",
} as const;
