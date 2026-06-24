# SF Dev AI

**An AI-native Salesforce developer workbench: tier-gated MCP tools and whole-org governance auditing (security health, technical debt, RBAC, architecture docs) on top of jsforce and Claude Sonnet 4.**

> 📄 **For a quick read:** [docs/BRIEF.md](./docs/BRIEF.md) (one-pager) · [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) (deep dive) · [docs/ROADMAP.md](./docs/ROADMAP.md) (June 2026 roadmap) · [docs/DEPLOY.md](./docs/DEPLOY.md) (ECA + Vercel)

SF Dev AI connects to any Salesforce org via OAuth (or zero-config via the Salesforce CLI device flow) and exposes its metadata through a Model Context Protocol (MCP) server. Claude can inspect schemas, query data, modify permissions, generate flows, and explain your org's security posture — every tool declared at a risk tier, with tier 2/3 mutations requiring explicit confirmation.

## Why this exists

Dreamforce 2025 introduced **Agentforce Vibes** (the in-IDE coding agent) and the **DX MCP Server** (so any agent can talk to a Salesforce org). The in-editor, per-file AI lane is now Salesforce's to own. What customers building production Agentforce deployments still don't have is a *whole-org* governance layer: something that audits metadata after an agent generates it, surfaces drift across permission sets and profiles, scores security posture, and gives an admin or FDE a single place to reason about the org with an agent at their side.

Vibes lives in your editor, per file. SF Dev AI lives above the org, across files. They're complements, not competitors — and the workbench is designed to *consume* DX MCP tools as easily as it exposes its own.

## What's in the box

| Module | What it does |
|---|---|
| **Dashboard** | Org identity, API limits, record counts, recent flow drafts. |
| **Flows** | Generate Salesforce Flows from natural language, render as a visual graph (React Flow + Dagre), deploy via the Metadata API. |
| **Query** | Describe what you need in plain English; Claude writes the SOQL, runs it, returns results. |
| **Objects** | Every SObject with full field metadata, relationships, picklists. |
| **Permissions** | Permission sets and profiles side-by-side, object-level and field-level. |
| **RBAC** | User → permission set graph, access comparisons across users, unassigned permission sets, drift detection. |
| **Health Hub** | 13-rule security health scan with A–F scoring. Each finding has severity, explanation, affected items, remediation. |
| **Technical Debt** | Apex coverage gaps, inactive metadata, automation hygiene. Per-category scoring, prioritised remediations. |
| **Docs** | AI-generated architecture documentation per org. Versioned in PostgreSQL. |
| **Pages** | Parse and visualize FlexiPage metadata. Component tree, region layout, raw JSON. |
| **AI Agent** | On every page. Tool access scoped to the page context. Multi-turn loop with SSE streaming, token-cost tracking, and `ask_clarification` as a first-class tool. |

## Architecture at a glance

```mermaid
flowchart LR
    User[User in browser] -->|OAuth + PKCE| Workspace[Next.js 16 workspace]
    Workspace -->|SSE| AgentRoute["/api/ai/agent"]
    AgentRoute -->|messages| Claude["Claude Sonnet 4<br/>(Anthropic or Bedrock)"]
    Claude -->|tool_use| AgentRoute
    AgentRoute -->|MCP tool call| McpServer[In-memory MCP server]
    McpServer -->|jsforce| Salesforce[(Salesforce org)]
    McpServer -.->|on tool result| AgentRoute
    AgentRoute -->|cost + tool_result| Workspace
    ExternalAgent[Claude Code / Cursor / other MCP client] -->|streamable-http| McpHttp["/api/mcp/streamable-http"]
    McpHttp --> McpServer
    Manifest[".well-known/mcp.json<br/>tiers 0-3 + page scoping"] -.discovered by.-> ExternalAgent
```

**Tier 0** tools (read-only) run automatically. **Tier 1** (read sensitive — Apex bodies, raw permission XML) run automatically with sensitive-data logging. **Tier 2** (mutating — create record, create field, update permissions) requires confirmation. **Tier 3** (destructive — delete record, delete field) requires confirmation with an irreversibility warning.

The same MCP server powers the in-app agent and the external HTTP endpoint; per-page `TOOL_PRESETS` scope what the agent can call when, enforcing least authority at construction time. Read [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full design.

## 60-second try-it

Prereqs: Node 22+ and an Anthropic API key. **No database server. No Salesforce Connected App. No Docker.**

```bash
git clone https://github.com/dominic-righthere/sf-dev-ai.git
cd sf-dev-ai
cp .env.example .env.local
# Edit .env.local: paste ANTHROPIC_API_KEY and generate a SESSION_SECRET
#   openssl rand -base64 32   ← a fresh one
npm install        # or: bun install
npm run db:push    # creates ./sfdev.db (SQLite)
npm run dev        # Turbopack at http://localhost:3000
```

Open <http://localhost:3000>. Click **Device Login** — this uses the Salesforce CLI's pre-authorized client ID, no Connected App needed. Authorize in your org. Land on the dashboard. Ask the agent a question.

### Production-shaped alternative: Postgres via Docker

If you want a Postgres-backed setup matching production:

```bash
cp .env.example .env.local
# In .env.local, swap the SQLite line for the commented Postgres line.
docker compose up -d db     # just the Postgres service
npm install
npm run db:push             # applies schema to Postgres
npm run dev
```

Or to run the entire stack in Docker (web + db) behind your own reverse proxy:

```bash
docker compose --profile full up -d
# Visit http://localhost:3000
```

## Setup

### Environment

```bash
cp .env.example .env.local
```

Required:

```env
# AI
ANTHROPIC_API_KEY=sk-ant-...

# Session — generate with: openssl rand -base64 32
SESSION_SECRET=

# Database — pick one
DATABASE_URL=file:./sfdev.db
# DATABASE_URL=postgresql://sfdev:sfdev@localhost:5432/sfdev
```

The app auto-selects the SQLite or Postgres driver based on the `DATABASE_URL` prefix (`file:`/`sqlite:` → SQLite, anything else → Postgres). Schema is mirrored across both dialects in [`src/lib/db/`](./src/lib/db/).

Optional (only if you want a custom Salesforce auth integration instead of the zero-config device flow — required for hosted deployments):

```env
SF_CLIENT_ID=your_external_client_app_consumer_key
SF_CLIENT_SECRET=your_external_client_app_consumer_secret
SF_CALLBACK_URL=http://localhost:3000/auth/callback
```

> **External Client App, not Connected App.** Salesforce disabled creation of new Connected Apps across all orgs in Spring '26 (March 2026). The OAuth wire protocol is identical, so `lib/salesforce/auth.ts` works against either — but new setups should register an **External Client App** (Setup → External Client Apps → New). See [`docs/DEPLOY.md`](./docs/DEPLOY.md) for the SaaS walkthrough.

To use AWS Bedrock instead of the Anthropic API directly:

```env
AI_PROVIDER=bedrock
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-20250514-v1:0
```

### Database

```bash
npm run db:push      # push schema directly to the configured database
npm run db:generate  # generate migration files (Postgres only, for production)
npm run db:studio    # open Drizzle Studio
```

All `db:*` scripts auto-load `.env.local` via `dotenv-cli`. Migrations live in `drizzle/` (Postgres) and `drizzle-sqlite/` (SQLite).

### Tech stack

| Layer | Stack |
|-------|-------|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS 4, Radix UI, Lucide icons |
| AI | Anthropic SDK 0.78 (Claude Sonnet 4), AWS Bedrock (optional) |
| Tool Protocol | Model Context Protocol SDK 1.27, streamable-http transport |
| Salesforce | jsforce 3, OAuth 2.0 + PKCE, SF CLI device flow |
| Database | SQLite (default, dev) or PostgreSQL 17, Drizzle ORM with dialect dispatcher |
| State | Zustand, Zundo (undo/redo for flow editor) |
| Visualization | React Flow (`@xyflow/react`), Dagre |
| Session | iron-session (encrypted cookies) |

## MCP server

The built-in MCP server exposes Salesforce operations as tools that any MCP client can call. Toolset summary:

| Toolset | Capabilities |
|---|---|
| **data** | `run_soql_query` (SELECT, capped 200), `count_records`, `create_record` (tier 2), `update_record` (tier 2), `delete_record` (tier 3) |
| **schema** | `describe_object`, `list_objects`, `search_objects`, `describe_field` |
| **metadata** | `list_metadata`, `read_metadata` (tier 1), Apex classes/triggers, FlexiPages |
| **field-ops** | `create_custom_field`, `update_custom_field`, `delete_custom_field`, `create_validation_rule`, `update_validation_rule` |
| **permissions** | `list_permission_sets`, `list_profiles`, `read_permission_set` (tier 1), `update_field_permissions`, `update_object_permissions` |
| **governance** | `get_health_findings`, `get_debt_findings`, `get_rbac_audit` — agent-side feedback loop into the static-analysis engines (tier 0, read-only) |
| **apex** | `execute_anonymous_apex` (tier 2) — Tooling API; lets an agent validate Apex it generated before deploying |
| **flow** | Generate and refine flow definitions |
| **interaction** | `ask_clarification` (HITL via tool), emit UI events, stop agent loop |
| **proxied (`--with-dx-mcp`)** | `dx_run_apex_test`, `dx_run_code_analyzer`, `dx_query_code_analyzer_results`, `dx_assign_permission_set` — re-exported from `@salesforce/mcp` with sf-dev-ai's tier annotations |

External clients (Claude Code, Cursor) can connect at `/api/mcp/streamable-http`. The discovery manifest is published at `/.well-known/mcp.json` — it includes the tier of every tool, per-tool rate limits, per-page tool scoping, and security flags (`treat_page_content_as_untrusted`, `require_user_presence`, `tool_descriptions_authoritative`).

### Use it from Claude Code / Cursor (stdio)

The same MCP server runs as a stdio entry — `bin/sf-dev-ai-mcp.ts` — so Claude Code, Cursor, Windsurf, or any MCP client can drive it directly without the web UI. Auth reuses your local `~/.sfdx` (same as the `sf` CLI), so no extra login is needed.

Two integration modes:

1. **Unified-proxy mode (`--with-dx-mcp`, recommended).** sf-dev-ai-mcp spawns Salesforce's official [`@salesforce/mcp`](https://github.com/salesforcecli/mcp) as a child process and re-exports a curated subset of its tools (`dx_run_apex_test`, `dx_run_code_analyzer`, `dx_query_code_analyzer_results`, `dx_assign_permission_set`) through one endpoint, with **sf-dev-ai's tier annotations layered on top**. The MCP client sees one server, one unified safety model.
2. **Side-by-side mode.** Register both servers separately. Slightly faster startup (no child spawn), but the client sees two endpoints with different safety semantics.

**Claude Code, unified-proxy mode** — add to `~/.claude.json` (global) or `.mcp.json` (project):

```jsonc
{
  "mcpServers": {
    "sf-dev-ai": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/sf-dev-ai/bin/sf-dev-ai-mcp.ts",
               "--orgs", "DEFAULT_TARGET_ORG",
               "--with-dx-mcp"]
    }
  }
}
```

This single entry exposes 35 tools: 27 native (data/schema/metadata/field_ops/permissions) + 3 governance + 1 apex + 4 proxied `dx_*` tools. All carry MCP annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`) so Claude Code renders confirmation gates natively for tier-2/3 operations.

**Claude Code, side-by-side mode** — if you'd rather register Salesforce's server directly:

```jsonc
{
  "mcpServers": {
    "salesforce-dx": {
      "command": "npx",
      "args": ["-y", "@salesforce/mcp",
               "--orgs", "DEFAULT_TARGET_ORG",
               "--toolsets", "data,metadata,testing,devops,lwc-experts"]
    },
    "sf-dev-ai": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/sf-dev-ai/bin/sf-dev-ai-mcp.ts",
               "--orgs", "DEFAULT_TARGET_ORG"]
    }
  }
}
```

(Once published to npm, the sf-dev-ai entry becomes `npx -y sf-dev-ai-mcp ...`. For now it points at the local checkout.)

Then drop [`SKILL.md`](./SKILL.md) into `~/.claude/skills/sf-dev-ai/SKILL.md` so Claude Code knows when to prefer sf-dev-ai (governance tasks) and when to defer (LWC, DevOps Center, deploys via DX MCP).

**Cursor / Windsurf** — `.cursor/mcp.json` and Windsurf's equivalent take the same shape; just substitute the absolute path and add `--with-dx-mcp` if you want unified proxy mode.

**Local-dev convenience** — run the stdio server in a terminal to verify it boots before wiring it up to a client:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | npm run mcp:stdio -- --orgs DEFAULT_TARGET_ORG --with-dx-mcp
```

You should see a JSON-RPC `tools` response with 35 tools (without `--with-dx-mcp`: 31) and the stderr line `[sf-dev-ai-mcp] ready · ... · dx-proxy: 4 tools`.

### Why a proxy, not just two MCP servers

Salesforce's [`@salesforce/mcp`](https://github.com/salesforcecli/mcp) is a build/deploy/migrate/IDE-developer server: ~60 tools across LWC creation, Aura→LWC migration, Code Analyzer, DevOps Center, mobile LWC. It has **no governance, RBAC, health, debt, FlexiPage, or Flow-introspection tools**, and **no tier-based safety model** (no per-tool confirmation, no prod-deploy guard). Apache-2.0 licensed.

sf-dev-ai-mcp's `--with-dx-mcp` mode spawns `@salesforce/mcp` as a child stdio process and re-exports a curated subset of its tools through this server with our tier annotations overlaid. The result is **one MCP endpoint a developer registers, one unified safety model across both lanes** — governance (native) + build/deploy/migrate (proxied). It's the safety layer over Salesforce's own server that the official server doesn't ship.

(`@salesforce/mcp` is bundled as a regular dependency — see [`src/lib/mcp/dx-tool-map.ts`](./src/lib/mcp/dx-tool-map.ts) for the whitelist + tier overlay. Apache-2.0 attribution lives in `node_modules/@salesforce/mcp/LICENSE.txt`.)

## Database

Drizzle ORM manages the persistence layer:

- **org_connections** — one row per (user, Salesforce org) pair. Refresh tokens, instance URLs, org metadata. Multi-org switching via `/api/orgs/switch`.
- **conversations** / **messages** — multi-turn chat history per org, including tool call JSON.
- **flow_drafts** — agent-generated flow definitions; status draft or deployed.
- **schema_cache** — object describe results with TTL.
- **metadata_cache** — health scans, debt scans, RBAC snapshots.
- **org_documents** — versioned AI-generated architecture documentation per org.

The cache layer (`src/lib/db/cache.ts`) enforces TTLs per data type: object describes 1 hour, health scans 30 minutes, technical debt scans 30 minutes. The agent reads from cache by default; UI buttons force refresh.

## Health Hub (what makes it different from a chat-only agent)

The Health Hub illustrates the architectural pattern used across all the governance modules: **deterministic static analysis + LLM as explainer and actor**, not LLM-as-analyzer.

The scanner runs 16 checks across four categories:

- **Profiles** — non-admin profiles with Modify All Data (critical), View All Data, Manage Users, Author Apex, **API Enabled on Standard User**.
- **Permission Sets** — sets with Modify All Data or View All Data, unassigned sets, empty permission set groups.
- **User Access** — excessive System Administrator accounts, users with >10 permission sets, users on profile-only access, **session timeout longer than 8 hours**.
- **Object Security** — objects with ModifyAll or ViewAll granted to many profiles or permission sets, **objects with Public Read/Write organisation-wide default**.

Each finding has severity, a best practice explanation, concrete remediation steps, and a list of affected items. The org receives a score (0–100) and a letter grade. The agent reads findings as structured data and can — with tier-2 confirmation — apply remediations through the Metadata API. The LLM is used where it's strong (explanation, prioritisation, dialogue); the analysis itself is reproducible code.

## Project layout

```
src/
├── app/
│   ├── (workspace)/        # Authenticated pages (dashboard, flows, health, debt, rbac, docs, …)
│   ├── api/
│   │   ├── ai/             # Agent, flow generation, SOQL generation endpoints
│   │   ├── auth/           # OAuth + device flow
│   │   ├── salesforce/     # Org, objects, permissions, RBAC, health, debt, deploy
│   │   ├── mcp/            # MCP streamable-http transport
│   │   └── orgs/           # Multi-org connection management
│   ├── .well-known/        # /.well-known/mcp.json manifest
│   └── auth/               # Login/callback pages
├── lib/
│   ├── mcp/                # MCP server + tool definitions
│   │   └── tools/          # data, schema, metadata, field-ops, permissions, flow, interaction
│   ├── ai/                 # Anthropic client, SSE streaming, system prompts
│   ├── salesforce/         # OAuth, connection factory, RBAC queries
│   ├── health/             # Health check engine (types, checks, scoring)
│   ├── debt/               # Technical debt engine
│   ├── docs/               # AI doc generator
│   ├── flow/               # Flow type system + XML conversion
│   ├── flexipage/          # FlexiPage parser
│   └── db/                 # Drizzle schema, cache layer
├── components/             # UI per feature area
├── stores/                 # Zustand stores (org, schema, AI, health, debt, docs, rbac)
└── hooks/                  # Session, toast, agent streaming
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). New MCP tools must declare a tier; new mutating tools must declare a confirmation message. The MCP manifest is the source of truth.

## Security

See [SECURITY.md](./SECURITY.md). Known gaps are documented there — they're known, not unknown.

## License

[Apache License 2.0](./LICENSE).
