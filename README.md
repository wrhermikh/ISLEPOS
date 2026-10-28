# Maldives Shop Manager

Stage 1 of a small-shop management app for retailers in the Maldives. It establishes the PostgreSQL schema, MVR/laari conventions, demo records, Clerk sign-in, and Owner/Cashier access. Sales, inventory workflows, cashbook, reports, and the later modules are intentionally not part of this stage.

## Stack

- React, TypeScript, Tailwind CSS, and Vite
- Express API server
- Replit-managed Clerk authentication
- Replit PostgreSQL
- Plain PostgreSQL SQL migrations, with Drizzle for typed application queries

## Setup

1. Install workspace packages with `pnpm install`.
2. Provision Clerk through the Replit Auth setup. Do not put Clerk keys in frontend source or commit them.
3. Set `SHOP_OWNER_EMAIL` to the verified email that should receive the first Owner role.
4. Apply the development database migrations:

   ```sh
   pnpm --filter @workspace/db run migrate
   ```

5. Start the `artifacts/api-server: API Server` and `artifacts/maldives-shop-manager: web` workflows.
6. Create an account using the configured Owner email. The server verifies the Clerk account and grants the Owner role. Owners can add a cashier email; the cashier must then sign up or sign in with that verified email. Adding access does not send an email.

## Database migrations

Migration files live in `lib/db/migrations/` and are plain PostgreSQL SQL. The runner applies each file once, records its SHA-256 checksum in `app_schema_migrations`, and rejects changes to an already-applied migration. Add a new numbered SQL file for future schema changes; do not edit an applied migration.

All currency amounts use integer laari (100 laari = 1 MVR). Product stock is derived from append-only stock movements. The costing method is weighted-average cost; invoice lines retain the unit cost and cost of goods sold at sale time. Journal, payment, refund, transfer, closing, stock-movement, and audit records reject updates and deletes; corrections must be represented by reversals or new entries with a reason.

The initial migration seeds a demo shop, MVR cash and bank accounts, sample products, opening inventory, a supplier, and a customer. Re-running the migration does not duplicate the seed records.

## Backup and restore

Use the Replit database's development or production connection string for the intended environment. Keep backups in a secure location outside the repository:

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
pnpm --filter @workspace/db run migrate
```
