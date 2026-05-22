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

This is declared at the protocol layer, in `src/app/.well-known/mcp.json/route.ts`, so any MCP client (Claude Code, Cursor, etc.) connecting to the server sees the tiers and can render confirmation UI consistently. The same manifest defines:

- `treat_page_content_as_untrusted: true` — text retrieved from Salesforce (record content, picklist labels, description fields) must not be interpreted as agent instructions. A defense against prompt-injection-through-data.
- `tool_descriptions_authoritative: true` — tool descriptions are versioned with the code, not loaded dynamically.
- `require_user_presence: true` — tier 2/3 tools require an authenticated user session, not a background daemon.
- `pages.<route>.tools` — per-page tool scoping. The `/query` page only exposes read-only data and schema tools; the `/permissions` page only exposes permission tools. The principle: don't give the agent tools it has no reason to use in the current context.

The same model is enforced in code via `TOOL_PRESETS` in `src/lib/mcp/server.ts`:

```ts
export const TOOL_PRESETS = {
  external: ["data", "schema", "metadata", "field_ops", "permissions"],
  flow: ["schema", "flow", "interaction"],
  agent: ["data", "schema", "metadata", "field_ops", "permissions", "interaction"],
  query: ["data", "schema", "interaction"],
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

## Static analysis + agent (the governance modules)

Health Hub, Technical Debt, and RBAC use the same architectural pattern:

1. A deterministic engine in `src/lib/{health,debt}/engine.ts` runs a set of checks (`checks.ts`) and returns structured findings.
2. Each finding has a severity, category, explanation, affected items, and remediation steps.
3. The findings are persisted to `metadata_cache` with a TTL.
4. The UI renders findings deterministically.
5. The agent has access to the findings as context — it can explain, prioritise, or (in tier-2 mode) apply remediations through Metadata API tools.

What this isn't: an agent that "scans your org for security issues" by asking an LLM to look at metadata. That would be slow, expensive, non-reproducible, and impossible to audit. The static analysis is the analysis; the LLM is the explanation layer and the action layer.

The pattern is generalizable. If you add a new governance dimension (say, change-set readiness or release health) the recipe is: write the checks, return structured findings, expose findings as a tool the agent can read, and add a workspace page that renders the findings. The agent gets the new capability for free.

## Data model

Drizzle ORM, PostgreSQL 17. Key tables:

- `org_connections` — one row per (user, Salesforce org) pair. Stores instance URL, OAuth refresh token, org metadata. Multi-org switching via `/api/orgs/switch`.
- `conversations` and `messages` — multi-turn chat history per org, including tool call JSON.
- `flow_drafts` — agent-generated flow definitions; status `draft` or `deployed`.
- `schema_cache` — object describe results with TTL.
- `metadata_cache` — health scans, debt scans, RBAC snapshots, generated docs.
- `org_documents` — versioned AI-generated architecture documentation per org.

The cache layer in `src/lib/db/cache.ts` enforces TTLs per data type: object describes 1 hour, health scans 30 minutes, technical debt scans 30 minutes. The agent reads from cache by default; UI buttons force refresh.

## What's deliberately out of scope (today)

- **Durable workflows.** Long-running deploys, retries on failure, resumption after process restart. Today the agent is request-scoped; a production deployment would move long-running operations to a workflow engine (Vercel Workflow, Temporal, Inngest).
- **Apex test execution and packaging.** Tooling API gives us anonymous Apex; running test classes and packaging metadata for change-set delivery is a separate, larger commitment.
- **Multi-tenant SaaS hardening.** Per-org isolation in the database, per-tenant rate limiting, audit log persistence (the manifest currently has `audit_logging: false` — known gap).
- **RAG over org docs / org-specific examples.** Current knowledge is org metadata + static prompts. Adding embedding-based retrieval is feasible but not currently load-bearing.
- **Org-to-org compare / migration orchestration.** Useful, separate product.

## What I'd build next if shipping this at Salesforce

If this project moved inside Salesforce alongside Vibes and the DX MCP Server, my priorities would be:

1. **DML through the agent with a proper approval gate.** The tools exist and the manifest declares tier 2/3; the agent route currently doesn't surface a confirmation gate. This is the highest-signal completion of the existing architecture and the most important single demo for an FDE selling agentic systems to a customer.
2. **Anonymous Apex as a tool.** Agent generates a snippet, runs it in a scratch sandbox, reports the result. Closes the validation loop between "agent suggests code" and "agent knows the code compiles."
3. **Call out to the official Salesforce DX MCP Server.** From inside SF Dev AI, treat DX MCP as another MCP server and consume its scratch-org provisioning tools. A literal demonstration that the architecture composes with first-party tooling rather than reimplementing it.
4. **Audit log persistence and a viewer.** Every tool call recorded with input arguments, output summary, user identity, org identity, latency, cost. Surfaceable by tier and by org. This unblocks multi-tenant deployment and lets a Salesforce customer pass SOC/FedRAMP audits.
5. **Workflow engine for long deploys.** Move the multi-step flow deploy + verify + rollback path off the request-response cycle.

## Stack summary

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router, Turbopack |
| Runtime | React 19 |
| Language | TypeScript (strict) |
| AI provider | Anthropic SDK + AWS Bedrock fallback; Claude Sonnet 4 (`claude-sonnet-4-20250514`) |
| Tool protocol | Model Context Protocol SDK 1.27, streamable-http transport |
| Salesforce | jsforce 3, OAuth 2.0 + PKCE, SF CLI device flow |
| Database | PostgreSQL 17, Drizzle ORM |
| State | Zustand + Zundo (undo/redo for flow editor) |
| Visualization | React Flow (`@xyflow/react`) + Dagre |
| Styling | Tailwind CSS 4, Radix UI, Lucide icons |
| Session | iron-session (encrypted cookies) |
| Deployment | Docker Compose-ready; Next.js standalone build |
