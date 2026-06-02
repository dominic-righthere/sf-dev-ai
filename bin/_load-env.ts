/**
 * Side-effect-only module: load .env.local before any other imports that
 * read process.env at module load (e.g. src/lib/db/client.ts throws on
 * missing DATABASE_URL at import time).
 *
 * MUST be the first import in any bin entry that wires the MCP server.
 * ESM processes imports in document order, so any module imported after
 * this one already sees process.env populated.
 *
 * Uses Node 22's built-in process.loadEnvFile() — no dotenv runtime dep.
 */

import { existsSync } from "node:fs";

const candidates = [".env.local", ".env"];
for (const path of candidates) {
  if (existsSync(path)) {
    try {
      process.loadEnvFile(path);
      break;
    } catch {
      // ignore — file unreadable or malformed; carry on
    }
  }
}
