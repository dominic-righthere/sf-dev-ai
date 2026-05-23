#!/usr/bin/env node
/**
 * sf-dev-ai-mcp — stdio Model Context Protocol server for Salesforce.
 *
 * Exposes the same tool surface as the SF Dev AI web app: data, schema,
 * metadata, field_ops, permissions. Designed to coexist with Salesforce's
 * own DX MCP Server (@salesforce/mcp) — its lane is build/deploy/migrate;
 * sf-dev-ai-mcp's lane is whole-org governance, audit, and introspection.
 *
 * Auth reuses ~/.sfdx (same as `sf` CLI). Flag conventions match DX MCP
 * (`--orgs`, `--toolsets`) so a developer registers both servers with the
 * same muscle memory.
 *
 *   npx sf-dev-ai-mcp --orgs DEFAULT_TARGET_ORG
 *   npx sf-dev-ai-mcp --orgs my-prod --toolsets data,schema,permissions
 */

import { parseArgs } from "node:util";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createSalesforceMcpServer, type ToolSet } from "../src/lib/mcp/server";
import { resolveAuth, buildConnection } from "../src/lib/mcp/sf-cli-auth";

const DEFAULT_TOOLSETS: ToolSet[] = [
  "data",
  "schema",
  "metadata",
  "field_ops",
  "permissions",
];

function usage(exitCode = 0): never {
  process.stderr.write(
    [
      "sf-dev-ai-mcp — Salesforce governance MCP server (stdio)",
      "",
      "Usage:",
      "  sf-dev-ai-mcp --orgs <username|alias|DEFAULT_TARGET_ORG> [options]",
      "",
      "Options:",
      "  --orgs <value>        Salesforce org to connect to (required).",
      "                        Accepts username, alias, DEFAULT_TARGET_ORG, or",
      "                        DEFAULT_TARGET_DEV_HUB.",
      "  --toolsets <list>     Comma-separated toolsets to enable.",
      `                        Default: ${DEFAULT_TOOLSETS.join(",")}`,
      "  --help                Show this help.",
      "",
      "Available toolsets: data, schema, metadata, field_ops, permissions",
      "",
      "Auth: reuses ~/.sfdx — run `sf org login web` first.",
      "",
    ].join("\n"),
  );
  process.exit(exitCode);
}

function parseToolsets(raw: string | undefined): ToolSet[] {
  if (!raw) return DEFAULT_TOOLSETS;
  const valid: ToolSet[] = ["data", "schema", "metadata", "field_ops", "permissions"];
  const requested = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const out: ToolSet[] = [];
  for (const t of requested) {
    if (!valid.includes(t as ToolSet)) {
      process.stderr.write(`unknown toolset: ${t}. valid: ${valid.join(", ")}\n`);
      process.exit(2);
    }
    out.push(t as ToolSet);
  }
  return out;
}

async function main() {
  const { values } = parseArgs({
    options: {
      orgs: { type: "string" },
      toolsets: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    strict: false,
  });

  if (values.help) usage();
  if (!values.orgs) {
    process.stderr.write("--orgs is required.\n\n");
    usage(2);
  }

  // For MVP, accept a single org. Multi-org parity with DX MCP's comma list is
  // a future enhancement; in practice most agent interactions are scoped to
  // one org at a time.
  const firstOrg = String(values.orgs).split(",")[0].trim();
  if (!firstOrg) usage(2);

  const auth = resolveAuth(firstOrg);
  const conn = buildConnection(auth);

  // Surface the resolved org to stderr (stdio MCP keeps stdout for JSON-RPC).
  process.stderr.write(
    `[sf-dev-ai-mcp] connected as ${auth.username} on ${auth.instanceUrl} (${
      auth.isSandbox ? "sandbox" : auth.isScratch ? "scratch" : "production"
    })\n`,
  );

  const toolsets = parseToolsets(values.toolsets as string | undefined);
  const server = createSalesforceMcpServer({
    getConnection: () => conn,
    toolsets,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(
    `[sf-dev-ai-mcp] ready · toolsets: ${toolsets.join(", ")}\n`,
  );

  // The StdioServerTransport handles lifecycle: when the client closes stdin,
  // the transport closes and the event loop empties naturally. Don't add a
  // hard process.exit on stdin close — that races with in-flight tool calls.
}

main().catch((err) => {
  process.stderr.write(`[sf-dev-ai-mcp] fatal: ${err?.message ?? err}\n`);
  process.exit(1);
});
