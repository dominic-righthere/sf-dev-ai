import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "sf-dev-ai.db");

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function initDb() {
  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  // Auto-create tables on first run (static SQL, no user input)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      tool_calls TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS flow_drafts (
      id TEXT PRIMARY KEY,
      conversation_id TEXT REFERENCES conversations(id),
      org_id TEXT NOT NULL,
      api_name TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT,
      flow_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'deployed')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS schema_cache (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      object_name TEXT NOT NULL,
      describe_json TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );
  `);

  return drizzle(sqlite, { schema });
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    if (!_db) {
      _db = initDb();
    }
    return Reflect.get(_db, prop, receiver);
  },
});
