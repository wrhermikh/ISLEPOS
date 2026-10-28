import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const migrationsDir = fileURLToPath(new URL("../migrations/", import.meta.url));

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set before running migrations.");
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_schema_migrations (
      name text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const name of files) {
    const migration = await readFile(path.join(migrationsDir, name), "utf8");
    const checksum = createHash("sha256").update(migration).digest("hex");
    const applied = await client.query(
      "SELECT checksum FROM app_schema_migrations WHERE name = $1",
      [name],
    );

    if (applied.rowCount) {
      if (applied.rows[0].checksum !== checksum) {
        throw new Error(`Applied migration was changed: ${name}`);
      }
      continue;
    }

    await client.query("BEGIN");
    try {
      await client.query(migration);
      await client.query(
        "INSERT INTO app_schema_migrations (name, checksum) VALUES ($1, $2)",
        [name, checksum],
      );
      await client.query("COMMIT");
      process.stdout.write(`Applied ${name}\n`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  process.stdout.write("Database migrations are up to date.\n");
} finally {
  await client.end();
}
