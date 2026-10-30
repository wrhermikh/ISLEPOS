import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const configuredPoolMax = Number(process.env.PG_POOL_MAX ?? "2");

if (!Number.isInteger(configuredPoolMax) || configuredPoolMax < 1 || configuredPoolMax > 20) {
  throw new Error("PG_POOL_MAX must be an integer between 1 and 20.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: configuredPoolMax,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
