# Maldives Shop Manager

Core shop operations for retailers in the Maldives: product catalog and opening stock, MVR point-of-sale checkout, split or partial payments, customer credit, invoices, stock movement, and owner/cashier access. Money is stored as integer laari and checkout records are committed atomically.

## Stack

- React, TypeScript, Tailwind CSS, and Vite
- Express API server
- Supabase Auth
- Supabase PostgreSQL
- Vercel for the frontend and Express API
- Plain PostgreSQL SQL migrations, with Drizzle for typed application queries

## Setup

1. Install workspace packages with `pnpm install`.
2. Create a Supabase project and configure the values in `.env.example`.
3. Set `SHOP_OWNER_EMAIL` to the email that should receive the first Owner role. Keep Supabase email verification enabled so the owner email is proven before the role is granted.
4. Apply the database migrations:

   ```sh
   pnpm --filter @workspace/db run migrate
   ```

5. Start the API server and web app workflows.
6. Create an account using the configured Owner email, confirm it through Supabase Auth, and sign in. Owners can grant cashier access to an email; that user signs in with the same verified address.

## Vercel and Supabase

- Set `DATABASE_URL`, `PG_POOL_MAX=2`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SHOP_OWNER_EMAIL` as server-side Vercel environment variables.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Vercel build variables. The anon key is public; never place a service-role key or database URL in a `VITE_` variable.
- For Vercel's serverless API, use the Supabase transaction-pooler connection string with SSL enabled. Keep the pool small; `PG_POOL_MAX` defaults to 2.
- Add the deployed Vercel domain and local development URL to Supabase Auth's allowed redirect URLs, including the `/home` callback.
- Supabase email confirmation is handled by Supabase Auth. The app does not send sales receipts or other custom email.
- Migration `0007_private_api_only.sql` enables RLS without public policies; shop data is read and written through the authenticated Express API.
- `vercel.json` contains the app/API service rewrites. Set the variables for both Preview and Production before testing each environment.

## Database migrations

Migration files live in `lib/db/migrations/` and are plain PostgreSQL SQL. The runner applies each file once, records its SHA-256 checksum in `app_schema_migrations`, and rejects changes to an already-applied migration. Add a new numbered SQL file for future schema changes; do not edit an applied migration.

All currency amounts use integer laari (100 laari = 1 MVR). Product stock is derived from append-only stock movements. The costing method is weighted-average cost; invoice lines retain the unit cost and cost of goods sold at sale time. Journal, payment, refund, transfer, closing, stock-movement, and audit records reject updates and deletes; corrections must be represented by reversals or new entries with a reason.

The initial migration seeds a demo shop, MVR cash and bank accounts, sample products, opening inventory, a supplier, and a customer. Re-running the migration does not duplicate the seed records.

## Backup and restore

Use a Supabase database connection string for the intended environment. Keep backups in a secure location outside the repository:

```sh
mkdir -p "$HOME/shop-backups"
pg_dump "$DATABASE_URL" --no-owner --no-privileges > "$HOME/shop-backups/shop-$(date +%Y%m%d-%H%M%S).sql"
```

Restore only after confirming the destination database and taking a fresh backup:

```sh
psql "$DATABASE_URL" --single-transaction < "$HOME/shop-backups/shop-backup.sql"
```

Never commit database dumps; they may contain personal or financial data.

## Checks

```sh
pnpm run typecheck
pnpm --filter @workspace/api-server run test
pnpm run build
pnpm --filter @workspace/db run migrate
```

## Not implemented yet

Refund workflows, supplier purchasing, cash closing, and reports are not part of the current usable POS slice.
