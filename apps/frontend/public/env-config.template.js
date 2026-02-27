/**
 * Runtime config - replaced by envsubst at container start.
 * Env vars: VITE_TRPC_URL, VITE_APP_URL
 */
window.__ENV__ = {
  VITE_TRPC_URL: "$VITE_TRPC_URL",
  VITE_APP_URL: "$VITE_APP_URL"
};
