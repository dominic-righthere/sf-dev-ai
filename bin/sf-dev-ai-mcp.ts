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

// MUST be first: loads .env.local so DATABASE_URL is populated before any
// import that touches db/client (governance tools transitively need it).
import "./_load-env";

import { parseArgs } from "node:util";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createSalesforceMcpServer, type ToolSet } from "../src/lib/mcp/server";
import {
  resolveAuth,
  buildConnection,
  tryGetFreshAccessToken,
} from "../src/lib/mcp/sf-cli-auth";
import { registerDxProxyTools, type DxProxyHandle } from "../src/lib/mcp/dx-proxy";

const DEFAULT_TOOLSETS: ToolSet[] = [
  "data",
  "schema",
  "metadata",
  "field_ops",
  "permissions",
  "governance",
  "apex",
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
      "  --with-dx-mcp         Spawn @salesforce/mcp as a child process and",
      "                        re-export a curated subset of its tools through",
      "                        this server with sf-dev-ai's tier annotations.",
      "                        Adds 4 dx_* tools (run_apex_test, run_code_analyzer,",
      "                        query_code_analyzer_results, assign_permission_set).",
      "  --help                Show this help.",
      "",
      "Available toolsets: data, schema, metadata, field_ops, permissions,",
      "                    governance, apex",
      "",
      "Auth: reuses ~/.sfdx — run `sf org login web` first.",
      "",
    ].join("\n"),
  );
  process.exit(exitCode);
}

function parseToolsets(raw: string | undefined): ToolSet[] {
  if (!raw) return DEFAULT_TOOLSETS;
  const valid: ToolSet[] = [
    "data",
    "schema",
    "metadata",
    "field_ops",
    "permissions",
    "governance",
    "apex",
  ];
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
      "with-dx-mcp": { type: "boolean" },
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

  // Refresh the access token via the sf CLI before constructing the jsforce
  // connection — the token on disk is frequently stale, and jsforce's own
  // refresh flow doesn't work against the PlatformCLI connected app.
  const fresh = tryGetFreshAccessToken(firstOrg);
  if (fresh) {
    auth.accessToken = fresh;
  } else {
    process.stderr.write(
      "[sf-dev-ai-mcp] WARN: could not refresh access token via sf CLI; using token from ~/.sfdx (may be expired).\n",
    );
  }

  const conn = buildConnection(auth);

  // Surface the resolved org to stderr (stdio MCP keeps stdout for JSON-RPC).
  process.stderr.write(
    `[sf-dev-ai-mcp] connected as ${auth.username} on ${auth.instanceUrl} (${
      auth.isSandbox ? "sandbox" : auth.isScratch ? "scratch" : "production"
    })\n`,
  );

  const orgType: "production" | "sandbox" = auth.isSandbox ? "sandbox" : "production";
  const toolsets = parseToolsets(values.toolsets as string | undefined);
  const server = createSalesforceMcpServer({
    getConnection: () => conn,
    toolsets,
    getOrgContext: () => ({ orgId: auth.orgId, orgType }),
  });

  // Optional: spawn @salesforce/mcp as a child stdio process and re-export
  // its curated tools through this server with our tier annotations.
  let dxHandle: DxProxyHandle | undefined;
  if (values["with-dx-mcp"]) {
    try {
      dxHandle = await registerDxProxyTools(server, { orgArg: firstOrg });
    } catch (err) {
      process.stderr.write(
        `[sf-dev-ai-mcp] WARN: --with-dx-mcp failed to initialise: ${
          (err as Error).message
        }\n[sf-dev-ai-mcp] continuing without DX MCP tools.\n`,
      );
    }
  }

  const transport = new StdioServerTransport();

  // Graceful shutdown plumbing — call dxHandle.shutdown() exactly once and
  // exit. Idempotent so multiple signals/EOFs don't race.
  let shuttingDown = false;
  const shutdown = async (reason: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    process.stderr.write(`[sf-dev-ai-mcp] shutting down (${reason})\n`);
    if (dxHandle) {
      try {
        await dxHandle.shutdown();
      } catch (err) {
        process.stderr.write(
          `[sf-dev-ai-mcp] dx-proxy shutdown error: ${(err as Error).message}\n`,
        );
      }
    }
    process.exit(0);
  };

  // When the client (Claude Code, Cursor, etc.) disconnects, our stdin
  // receives EOF. StdioServerTransport does not auto-detect this (its
  // onclose only fires when WE call close()) so we listen directly and
  // trigger shutdown ourselves. In-flight tool calls are dropped — the
  // client that requested them is gone.
  process.stdin.on("end", () => shutdown("stdin EOF"));
  transport.onclose = () => shutdown("transport closed");

  // Signals: SIGTERM (clean kill), SIGINT (^C), SIGPIPE (broken stdout pipe).
  for (const sig of ["SIGTERM", "SIGINT", "SIGPIPE"] as const) {
    process.on(sig, () => {
      void shutdown(`signal ${sig}`);
    });
  }

  await server.connect(transport);

  process.stderr.write(
    `[sf-dev-ai-mcp] ready · toolsets: ${toolsets.join(", ")}${
      dxHandle ? ` · dx-proxy: ${dxHandle.registeredCount} tools` : ""
    }\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`[sf-dev-ai-mcp] fatal: ${err?.message ?? err}\n`);
  process.exit(1);
});
