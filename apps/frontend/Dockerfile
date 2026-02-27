# stage 1: build (run from monorepo root: docker build -f apps/frontend/Dockerfile .)
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/frontend ./apps/frontend

RUN pnpm install --frozen-lockfile
RUN pnpm --filter frontend build

# stage 2: serve with nginx
FROM nginx:1.29-alpine
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
