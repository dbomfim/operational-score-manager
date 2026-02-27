# stage 1: build (run from monorepo root: docker build -f apps/frontend/Dockerfile .)
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/frontend ./apps/frontend

ARG VITE_TRPC_URL=/trpc
ARG VITE_APP_URL=http://localhost:5173
ENV VITE_TRPC_URL=$VITE_TRPC_URL
ENV VITE_APP_URL=$VITE_APP_URL

RUN pnpm install --frozen-lockfile
RUN pnpm --filter frontend build

# stage 2: serve with nginx + runtime env injection
FROM nginx:1.29-alpine
RUN apk add --no-cache gettext
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/frontend/run.sh /run.sh
RUN chmod +x /run.sh
EXPOSE 80
ENTRYPOINT ["/run.sh"]
