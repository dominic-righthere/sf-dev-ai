/**
 * DX MCP proxy — spawns Salesforce's official `@salesforce/mcp` server as a
 * child stdio process and re-exports a curated subset of its tools through
 * our own MCP server, with our tier annotations overlaid on top.
 *
 * Architecture: one MCP endpoint a developer registers (sf-dev-ai-mcp),
 * one unified safety model across two lanes — governance (native to
 * sf-dev-ai) + build/deploy/migrate (proxied from DX MCP). The official
 * DX MCP server ships no tier annotations on any of its tools; this proxy
 * adds them as part of the registration.
 *
 * Lifecycle: 3-retry connect with backoff, single-shot reconnect on
 * transport close, clean shutdown on parent server stop. A crashed child
 * never panics the parent — failures are surfaced as MCP tool errors.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { ANNOTATIONS } from "./annotations";
import { DX_TOOL_MAP, UPSTREAM_TOOLSETS } from "./dx-tool-map";

export interface DxProxyOptions {
  orgArg: string;
  log?: (msg: string) => void;
}

export interface DxProxyHandle {
  registeredCount: number;
  shutdown: () => Promise<void>;
}

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2_500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function resolveDxMcpBin(): string {
  const require_ = createRequire(import.meta.url);
  const pkgPath = require_.resolve("@salesforce/mcp/package.json");
  return join(dirname(pkgPath), "bin", "run.js");
}

function buildSpawnArgs(binPath: string, orgArg: string): string[] {
  const upstreamTools = DX_TOOL_MAP.map((m) => m.upstreamName).join(",");
  return [
    binPath,
    "--orgs",
    orgArg,
    "--toolsets",
    UPSTREAM_TOOLSETS.join(","),
    "--tools",
    upstreamTools,
    "--no-telemetry",
  ];
}

async function connectWithRetry(
  client: Client,
  makeTransport: () => StdioClientTransport,
  log: (s: string) => void,
): Promise<StdioClientTransport> {
  let lastErr: unknown;
  for (let i = 1; i <= RETRY_ATTEMPTS; i++) {
    const transport = makeTransport();
    try {
      await client.connect(transport);
      return transport;
    } catch (err) {
      lastErr = err;
      log(
        `[dx-proxy] connect attempt ${i}/${RETRY_ATTEMPTS} failed: ${(err as Error).message}`,
      );
      if (i < RETRY_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }
  }
  throw lastErr;
}

export async function registerDxProxyTools(
  server: McpServer,
  options: DxProxyOptions,
): Promise<DxProxyHandle> {
  const log = options.log ?? ((msg) => process.stderr.write(msg + "\n"));
  const binPath = resolveDxMcpBin();

  const makeTransport = () =>
    new StdioClientTransport({
      command: process.execPath,
      args: buildSpawnArgs(binPath, options.orgArg),
      env: { ...getDefaultEnvironment() },
    });

  const client = new Client(
    { name: "sf-dev-ai-proxy", version: "1.0.0" },
    { capabilities: {} },
  );

  let transport = await connectWithRetry(client, makeTransport, log);
  log(`[dx-proxy] connected to @salesforce/mcp (org=${options.orgArg})`);

  // Track shutdown state so the auto-reconnect handler doesn't fire while
  // we're tearing down (transport.onclose triggers as part of close()).
  let closing = false;

  // Enumerate upstream tools and register the curated subset through our server.
  const { tools: upstreamList } = await client.listTools();
  const upstreamByName = new Map(upstreamList.map((t) => [t.name, t]));

  let registered = 0;
  for (const mapping of DX_TOOL_MAP) {
    const upstream = upstreamByName.get(mapping.upstreamName);
    if (!upstream) {
      log(`[dx-proxy] WARN: upstream tool not available: ${mapping.upstreamName}`);
      continue;
    }

    const prefixedName = `dx_${mapping.upstreamName}`;
    const annotations = ANNOTATIONS[mapping.tier];
    const description = `[proxied from @salesforce/mcp] ${
      upstream.description ?? mapping.rationale
    }`;

    // registerTool accepts a raw JSON Schema for inputSchema, which is
    // exactly what the MCP wire protocol gives us back from listTools.
    server.registerTool(
      prefixedName,
      {
        description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputSchema: upstream.inputSchema as any,
        annotations,
      },
      async (args: unknown) => {
        try {
          const result = await client.callTool({
            name: mapping.upstreamName,
            arguments: (args ?? {}) as Record<string, unknown>,
          });
          // The MCP CallToolResult shape matches what server.tool callbacks
          // return — pass through directly.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return result as any;
        } catch (err) {
          // Translate child-server errors into MCP tool errors so a crashed
          // or auth-rejected child never panics the parent.
          return {
            content: [
              {
                type: "text" as const,
                text: `[dx-proxy] ${mapping.upstreamName} failed: ${(err as Error).message}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    registered++;
  }

  log(`[dx-proxy] registered ${registered} proxied tools (dx_*)`);

  // Single auto-reconnect on transport close — handles a child that died
  // mid-session. After one reconnect attempt we leave it broken; tool calls
  // will then return the structured error above. Suppressed during graceful
  // shutdown.
  let reconnecting = false;
  const wireReconnect = (t: StdioClientTransport) => {
    t.onclose = async () => {
      if (closing || reconnecting) return;
      reconnecting = true;
      log("[dx-proxy] transport closed unexpectedly; attempting one reconnect…");
      try {
        transport = await connectWithRetry(client, makeTransport, log);
        wireReconnect(transport);
        log("[dx-proxy] reconnected.");
      } catch (err) {
        log(`[dx-proxy] reconnect failed: ${(err as Error).message}`);
      } finally {
        reconnecting = false;
      }
    };
  };
  wireReconnect(transport);

  const shutdown = async () => {
    closing = true;
    try {
      await client.close();
    } catch {
      // best-effort
    }
  };

  return { registeredCount: registered, shutdown };
}
