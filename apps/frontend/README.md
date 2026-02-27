# OSM Frontend

Vue 3 + Vite + TypeScript SPA for the Operational Score Manager.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (http://localhost:5173) |
| `pnpm build` | Production build → `dist/` |
| `pnpm test` | Run Vitest (single run) |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm preview` | Preview production build |

## Mock auth

1. Open `/sign-in`
2. Click **Sign in** → redirects to `/login?token=mock-token`
3. Stored in localStorage; API accepts `mock-token` in development
