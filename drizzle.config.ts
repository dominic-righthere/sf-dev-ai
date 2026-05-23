import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set. See .env.example.");
}

const isSqlite =
  url.startsWith("file:") ||
  url.startsWith("sqlite:") ||
  url.endsWith(".db") ||
  url.endsWith(".sqlite");

const sqlitePath = url.replace(/^(file:|sqlite:)/, "");

export default isSqlite
  ? defineConfig({
      schema: "./src/lib/db/schema.sqlite.ts",
      out: "./drizzle-sqlite",
      dialect: "sqlite",
      dbCredentials: { url: sqlitePath },
    })
  : defineConfig({
      schema: "./src/lib/db/schema.ts",
      out: "./drizzle",
      dialect: "postgresql",
      dbCredentials: { url },
    });
