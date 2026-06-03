# SF Dev AI — Architecture

This document explains the load-bearing design decisions in SF Dev AI: the MCP tier model, how the in-app agent loop is structured, the static-analysis-plus-agent pattern used in the governance modules, and what would need to change to take this from MVP to a production multi-tenant deployment.

## The MCP tier model

Every tool exposed by the SF Dev AI MCP server declares a **tier** that gates its execution:

| Tier | Examples | Behaviour |
|------|----------|-----------|
| 0 | `run_soql_query`, `describe_object`, `list_objects`, `list_permission_sets` | Read-only, low-impact. Runs automatically. |
| 1 | `read_apex_class`, `read_metadata`, `read_permission_set`, `read_profile` | Read, potentially sensitive (full code bodies, raw permission XML). Runs automatically but treated as sensitive in logs. |
| 2 | `create_record`, `update_record`, `create_custom_field`, `update_field_permissions`, `create_validation_rule` | Mutating. Requires confirmation. Confirmation message templated per-tool. |
| 3 | `delete_record`, `delete_custom_field` | Destructive. Requires confirmation with "cannot be undone" warning. Lower rate limit. |

Tiers are declared at the protocol layer in two places — `/.well-known/mcp.json` for the discovery manifest, and as **MCP `ToolAnnotations`** (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) on every individual tool registration. Annotations are the load-bearing form: they ride in every `tools/list` response, so a client never has to parse the manifest to render a confirmation gate. The mapping lives in `src/lib/mcp/annotations.ts`. Salesforce's own `@salesforce/mcp` ships zero annotations on any of its ~60 tools, which is the gap this work closes.

The discovery manifest additionally declares:

- `treat_page_content_as_untrusted: true` — text retrieved from Salesforce (record content, picklist labels, description fields) must not be interpreted as agent instructions. A defense against prompt-injection-through-data.
- `tool_descriptions_authoritative: true` — tool descriptions are versioned with the code, not loaded dynamically.
- `require_user_presence: true` — tier 2/3 tools require an authenticated user session, not a background daemon.
- `pages.<route>.tools` — per-page tool scoping. The `/query` page only exposes read-only data and schema tools; the `/permissions` page only exposes permission tools. The principle: don't give the agent tools it has no reason to use in the current context.

The same model is enforced in code via `TOOL_PRESETS` in `src/lib/mcp/server.ts`:

```ts
export const TOOL_PRESETS = {
  external: ["data", "schema", "metadata", "field_ops", "permissions",
             "governance", "apex"],
  flow:     ["schema", "flow", "interaction"],
  agent:    ["data", "schema", "metadata", "field_ops", "permissions",
             "governance", "apex", "interaction"],
  query:    ["data", "schema", "interaction"],
};
```

When the in-app agent boots for a given page, it requests only the preset that page declares. The agent is unable to call a tool that wasn't loaded into its toolset for that context — the principle of least authority, enforced at construction time rather than at runtime via "is this allowed?" checks.

## The agent loop

Implemented in `src/app/api/ai/agent/route.ts`. A request shape: `{ messages, mode, toolset }`. Mode is one of `agent`, `flow_generate`, `flow_refine`.

The loop is structurally simple:

```
while (continueLoop && !shouldStop) {
  response = await anthropic.messages.create({ ... });
  emit SSE events (thinking, assistant_message);
  if response.stop_reason === "tool_use":
    for each tool_use block:
      result = await mcpClient.callTool(name, args);
      emit SSE event (tool_result);
    currentMessages.append(assistant content, tool_results);
  else:
    continueLoop = false;
}
```

Three things make this more interesting than the textbook tool-use loop:

**1. `ask_clarification` is a first-class tool, not a side channel.**

When the agent doesn't have enough information to proceed, it calls `ask_clarification` with options. The tool emits an SSE event to the UI, the loop stops cleanly, and the user's next message resumes the conversation with the agent's prior tool calls intact. The agent doesn't try to fabricate intent; it asks.

The argument for this design: clarification is a *capability* of the agent in the same sense as a query or a deploy. Modeling it as a tool means it appears in the same trace, gets the same logging treatment, and doesn't require a parallel control plane. If the next iteration wants to add a *vote* tool for tier-2 confirmation, it slots in the same way.

**2. The MCP client is in-memory, request-scoped.**

Each `/api/ai/agent` request spawns a new MCP client connected to a freshly-constructed server with the right toolset for the calling page. No persistent connection, no shared state between users, no cross-request leakage of org credentials. The jsforce `Connection` is captured by closure in `getConnection()` and dies with the request.

This is wasteful by some measures (no connection pooling), but it's the right default for a tool that handles credentials for multiple Salesforce orgs. Optimization is a later problem.

**3. Token usage is tracked end-to-end and surfaced in the UI.**

Every tool call increments input/output token counters. At the end of the loop, an SSE event reports total cost. The user sees what their last query cost in dollars. This is the kind of UX detail that matters for an enterprise tool — and that an FDE deploying agentic systems for a customer needs as a teaching artifact.

## Composition with `@salesforce/mcp` (the proxy mode)

The stdio server takes an opt-in `--with-dx-mcp` flag. When set, `src/lib/mcp/dx-proxy.ts` spawns Salesforce's official `@salesforce/mcp` (Apache-2.0, bundled as a regular dependency) as a child stdio process and connects an MCP `Client` to it. On startup, the proxy reads the upstream `tools/list`, looks each tool up in the curated whitelist at `src/lib/mcp/dx-tool-map.ts`, and registers it through *our* server with a `dx_` prefix and our tier annotations overlaid.

Two design choices matter here:

1. **Whitelist, not pass-through.** Only four tools are proxied: `dx_run_apex_test` (tier `update`), `dx_run_code_analyzer` (`read`), `dx_query_code_analyzer_results` (`read`), `dx_assign_permission_set` (`create`). DX MCP's ~60 LWC/Aura/mobile/DevOps tools are deliberately excluded — they're either the wrong lane (LWC creation) or unsafe to surface without an annotated approval gate (`deploy_metadata` against production). The whitelist is the safety boundary.

2. **Annotation overlay, not pass-through.** DX MCP ships `readOnlyHint` on some tools and nothing on the rest. The proxy ignores upstream annotations and writes its own from the tier map. That's the *safety layer on top of Salesforce's own server* — one MCP endpoint, one tier model, two lanes (governance native + build/deploy/migrate proxied).

Lifecycle: 3-retry connect with 2.5s backoff. Single-shot reconnect on unexpected `transport.onclose`, suppressed during graceful shutdown. `client.close()` propagates to a synchronous child kill via the SDK's `StdioClientTransport.close()`. Stdin EOF on the parent triggers shutdown; SIGTERM/SIGINT/SIGPIPE do the same. No orphan child processes after parent exit.

## Static analysis + agent (the governance modules)

Health Hub (16 rules across profiles, permission sets, user access, object security), Technical Debt (8 rules), and RBAC use the same architectural pattern:

1. A deterministic engine in `src/lib/{health,debt}/engine.ts` runs a set of checks (`checks.ts`) and returns structured findings.
2. Each finding has a severity, category, explanation, affected items, and remediation steps.
3. The findings are persisted to `metadata_cache` with a TTL (30 minutes for health/debt scans).
4. The UI renders findings deterministically.
5. The agent reads findings through MCP tools — `get_health_findings`, `get_debt_findings`, `get_rbac_audit` in `src/lib/mcp/tools/governance.ts` — and can chain into mutation tools (tier 2/3, confirmation-gated) to remediate.

What this isn't: an agent that "scans your org for security issues" by asking an LLM to look at metadata. That would be slow, expensive, non-reproducible, and impossible to audit. The static analysis is the analysis; the LLM is the explanation layer and the action layer.

A specific Phase 5 example: when the Health Hub queries Setup-level security (`SecuritySettings`, EntityDefinition sharing models, etc.), each upstream call is wrapped in `try/catch` inside `collectSetupSecurityData` — a single failed Metadata API read leaves the dependent rule returning `[]` rather than failing the whole scan. Optional data; mandatory robustness.

The pattern is generalizable. If you add a new governance dimension (say, change-set readiness or release health) the recipe is: write the checks, return structured findings, expose findings as a tool the agent can read, and add a workspace page that renders the findings. The agent gets the new capability for free.

## Data model

Drizzle ORM with a runtime dialect dispatcher: SQLite (`file:` / `sqlite:` URLs) for zero-setup dev and demos, PostgreSQL 17 for production. The schema is mirrored across `src/lib/db/schema.ts` (Postgres) and `src/lib/db/schema.sqlite.ts` (SQLite); `client.ts` lazy-loads only the driver matching `DATABASE_URL`, so a Postgres deployment never pulls in `better-sqlite3` and vice versa. Key tables:

- `org_connections` — one row per (user, Salesforce org) pair. Stores instance URL, OAuth refresh token, org metadata. Multi-org switching via `/api/orgs/switch`.
- `conversations` and `messages` — multi-turn chat history per org, including tool call JSON.
- `flow_drafts` — agent-generated flow definitions; status `draft` or `deployed`.
- `schema_cache` — object describe results with TTL.
- `metadata_cache` — health scans, debt scans, RBAC snapshots, generated docs.
- `org_documents` — versioned AI-generated architecture documentation per org.

The cache layer in `src/lib/db/cache.ts` enforces TTLs per data type: object describes 1 hour, health scans 30 minutes, technical debt scans 30 minutes. The agent reads from cache by default; UI buttons force refresh.

## What's deliberately out of scope (today)

- **Durable workflows.** Long-running deploys, retries on failure, resumption after process restart. Today the agent is request-scoped; a production deployment would move long-running operations to a workflow engine (Vercel Workflow, Temporal, Inngest).
- **Apex test execution natively.** Anonymous Apex via the Tooling API ships as `execute_anonymous_apex`; full test class execution is proxied through `dx_run_apex_test` from `@salesforce/mcp` rather than reimplemented here.
- **Multi-tenant SaaS hardening.** Per-org isolation in the database, per-tenant rate limiting, audit log persistence (the manifest currently has `audit_logging: false` — known gap, called out in `SECURITY.md`).
- **RAG over org docs / org-specific examples.** Current knowledge is org metadata + static prompts. Adding embedding-based retrieval is feasible but not currently load-bearing.
- **Org-to-org compare / migration orchestration.** Useful, separate product.
- **Forking @salesforce/mcp source.** The proxy mode composes via the MCP protocol rather than borrowing code, so the upstream's weekly release cadence flows through without coordination on our side.

## What I'd build next if shipping this at Salesforce

If this project moved inside Salesforce alongside Vibes and DX MCP, my priorities would be:

1. **Audit log persistence and a viewer.** Every tool call recorded with input arguments, output summary, user identity, org identity, latency, cost. Surfaceable by tier and by org. The manifest already declares `audit_logging: false` as a known gap; closing it unblocks SOC / FedRAMP compliance for enterprise customers.
2. **Workflow engine for long deploys.** Move the multi-step flow deploy + verify + rollback path off the request-response cycle. Vercel Workflow or Temporal both fit.
3. **Cross-org governance diff.** Two orgs, two scans in parallel, structural delta. Tells a customer "your prod has X tightened that your sandbox doesn't" — production-grade tool that no one ships today. Scaffold is at `Phase 5E` in the internal plan.
4. **Per-tenant rate limiting and quotas.** Current limits in the manifest are per-process. Move to Redis or Upstash, key by org. Cost-track per tenant.
5. **More health/debt rules.** Three were added in Phase 5 (`PROFILE_API_ENABLED_ON_STANDARD_USER`, `SHARING_OWD_PUBLIC_READ_WRITE`, `SESSION_TIMEOUT_TOO_LONG`); the engine architecture (push to module-level `checks` array, no registration hook) makes additions cheap. Realistic target: 30+ rules.
6. **Encrypt refresh tokens at rest.** `src/lib/crypto.ts` is wired but not yet applied to `org_connections.refreshToken`. Flagged in `SECURITY.md`.

Items already shipped that earlier versions of this brief listed as future work: anonymous Apex (`execute_anonymous_apex`), agent-side governance feedback loop (`get_health_findings` and friends), DX MCP composition (`--with-dx-mcp` proxy with curated whitelist + tier overlay), MCP tool annotations on every tool. The bar moved up.

## Stack summary

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router, Turbopack |
| Runtime | React 19 |
| Language | TypeScript (strict) |
| AI provider | Anthropic SDK + AWS Bedrock fallback; Claude Sonnet 4 (`claude-sonnet-4-20250514`) |
| Tool protocol | Model Context Protocol SDK 1.27, streamable-http transport |
| Salesforce | jsforce 3, OAuth 2.0 + PKCE, SF CLI device flow |
| Database | SQLite (dev default) or PostgreSQL 17, Drizzle ORM with dialect dispatcher |
| State | Zustand + Zundo (undo/redo for flow editor) |
| Visualization | React Flow (`@xyflow/react`) + Dagre |
| Styling | Tailwind CSS 4, Radix UI, Lucide icons |
| Session | iron-session (encrypted cookies) |
| Deployment | Docker Compose-ready; Next.js standalone build |
