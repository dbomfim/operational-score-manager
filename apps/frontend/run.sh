#!/bin/sh
set -e
# Replace placeholders with env vars at container start (same image, different envs)
envsubst '$VITE_TRPC_URL $VITE_APP_URL' \
  < /usr/share/nginx/html/env-config.template.js \
  > /usr/share/nginx/html/env-config.js
exec nginx -g "daemon off;"
