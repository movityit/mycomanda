# mysagra-main

## Key facts
- **mycomanda** (`./mycomanda/`) is a Next.js clone of `mynumeri` specialized for vassoi/cucina/manager/tavoli.
- `mynumeri` (`./mynumeri/`) is the reference implementation. When in doubt about behavior, copy what `mynumeri` does.
- Git lives **inside `mycomanda/`**, not the root. Commit there.
- Backend is `ghcr.io/mysagra/mysagra-backend` (not built locally).

## Commands
- Build & deploy a single service:
  ```
  docker compose build <service>
  docker compose up -d --no-deps <service>
  docker exec -u root <service> chown -R nextjs:nodejs /app/data
  ```
- Run from the repo root (`/Users/binco/Downloads/mysagra-main`).
- **Never run `npm run build` locally** — build happens inside the Docker container.

## Architecture notes
- Each service is a Next.js app that proxies API calls to the backend via its own API routes (`app/api/*/route.ts`).
- Auth uses a cookie passed through via `getAuthToken()`.
- `NO_TABLE` is the backend value for asporto/banco — must be excluded from tables display.
- Orders API returns paginated results; `fetchAllOrderPages` handles pagination.
- `dateFrom`/`dateTo` params are required by the backend; use `1970-01-01` for "all open orders".
- Display pages use SSE (`/api/events/display`) for live updates and polling every 30s.
- Item progress (marking dishes as done) is per-order per-food via PATCH `/api/orders/[id]/progress`.

## Gotchas
- Stations API may return `{ data: [...] }` instead of a bare array — handle both.

- After each `docker compose build`, the user must hard-refresh the browser (Cmd+Shift+R) to clear cached JS chunks.
