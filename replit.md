# Maldives Shop Manager

A staged shop-management app for small retailers in the Maldives. Stage 1 establishes Clerk sign-in, Owner/Cashier access, the PostgreSQL schema, and demo data.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/maldives-shop-manager run dev` — run the web app
- `pnpm --filter @workspace/db run migrate` — apply pending SQL migrations
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `DATABASE_URL` — Postgres connection string
- Required for Clerk: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`; `SHOP_OWNER_EMAIL` identifies the first verified Owner.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/maldives-shop-manager/` — Stage 1 React/Vite app and Clerk routes.
- `artifacts/api-server/` — shared Express API, Clerk middleware, auth and staff access.
- `lib/api-spec/openapi.yaml` — API contract source of truth.
- `lib/db/migrations/` — plain SQL schema migrations and initial demo data.
- `lib/db/src/schema/` — typed Drizzle models used by current API routes.

## Architecture decisions

- Money columns are `BIGINT` laari; 100 laari equals 1 MVR.
- Inventory uses weighted-average cost, with sale-time cost snapshots in invoice lines.
- Shop time zone is `Indian/Maldives`.
- Clerk verifies identity; Owner/Cashier roles are stored and checked server-side in `staff_users`.
- The first Owner is bootstrapped only when a verified Clerk email matches `SHOP_OWNER_EMAIL`; users cannot self-select a role.
- SQL migrations are deployment history; use a new numbered migration rather than editing one already applied.

## Product

Stage 1 includes public landing and Clerk sign-in, a role-aware home screen, Owner-only cashier access management, MVR shop defaults, and seeded demo records. Stage 2 and later features are not implemented yet.

## User preferences
Use MVR, store all money as integer laari, and use the Maldives time zone. Only build the current requested stage before proceeding.

## Gotchas
- The app uses Replit-managed Clerk; preserve the canonical cookie-based auth flow and Clerk proxy middleware.
- Cashier access is stored as pending; no email is sent. The cashier signs up or signs in with that verified email.
- Do not use `drizzle-kit push`; plain SQL migrations are authoritative.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
