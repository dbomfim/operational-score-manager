/**
 * Dev fallback - production overwrites this at container start via run.sh + envsubst
 */
window.__ENV__ = {
  VITE_TRPC_URL: "/trpc",
  VITE_APP_URL: "http://localhost:5173"
};
