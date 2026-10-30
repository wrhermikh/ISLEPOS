# Maldives Shop Manager

A shop-management app for small retailers in the Maldives. The core usable workflow is product setup, MVR point-of-sale checkout, stock movement, and owner/cashier access.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/maldives-shop-manager run dev` — run the web app
- `pnpm --filter @workspace/db run migrate` — apply pending SQL migrations
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Server env: `DATABASE_URL`, `PG_POOL_MAX`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SHOP_OWNER_EMAIL`.
- Frontend env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Only the public anon key belongs in the browser.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/maldives-shop-manager/` — React/Vite app, Supabase Auth browser flow, POS and catalog.
- `artifacts/api-server/` — shared Express API, Supabase token verification, POS and staff access.
- `lib/api-spec/openapi.yaml` — API contract source of truth.
- `lib/db/migrations/` — plain SQL schema migrations and initial demo data.
- `lib/db/src/schema/` — typed Drizzle models used by current API routes.

## Architecture decisions

- Money columns are `BIGINT` laari; 100 laari equals 1 MVR.
- Inventory uses weighted-average cost, with sale-time cost snapshots in invoice lines.
- Shop time zone is `Indian/Maldives`.
- Supabase Auth verifies identity; Owner/Cashier roles are stored and checked server-side in `staff_users`.
- The first Owner is bootstrapped only when a verified Supabase email matches `SHOP_OWNER_EMAIL`; users cannot self-select a role.
- SQL migrations are deployment history; use a new numbered migration rather than editing one already applied.

## Product

The implemented core includes Supabase email/password sign-in, a role-aware home screen, product creation and opening stock, checkout with cash/bank/split/partial payments, customer records, sale invoices, stock movement, and balanced journal entries. Refunds, purchasing, cash closing, and reports are not yet implemented.

## User preferences
Use MVR, store all money as integer laari, and use the Maldives time zone. Only build the current requested stage before proceeding.

## Gotchas
- The app uses Supabase Auth bearer tokens. Never expose a database URL or service-role key to frontend code.
- Cashier access is stored as pending; no email is sent. The cashier signs up or signs in with that verified email.
- Do not use `drizzle-kit push`; plain SQL migrations are authoritative.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
