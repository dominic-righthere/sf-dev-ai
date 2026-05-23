import * as pgSchema from "./schema";
import * as sqliteSchema from "./schema.sqlite";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set. See .env.example.");
}

export const isSqlite =
  url.startsWith("file:") ||
  url.startsWith("sqlite:") ||
  url.endsWith(".db") ||
  url.endsWith(".sqlite");

async function makeDb() {
  if (isSqlite) {
    const { default: Database } = await import("better-sqlite3");
    const { drizzle } = await import("drizzle-orm/better-sqlite3");
    const path = url!.replace(/^(file:|sqlite:)/, "");
    const sqlite = new Database(path);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    return drizzle(sqlite, { schema: sqliteSchema });
  }
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  return drizzle(postgres(url!), { schema: pgSchema });
}

// Top-level await: the dialect-specific driver is the only one loaded.
// Postgres deployments never pull in better-sqlite3, and SQLite deployments
// never need the postgres driver.
//
// Cross-dialect db handle. Consumers import types from `./schema` (pg-typed);
// at runtime the SQLite path returns structurally identical rows because the
// schemas are mirrors and JSON columns are stored as text in both dialects.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = (await makeDb()) as any;
