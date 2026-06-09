# Roadmap

*June 2026 edition. Re-evaluated at Dreamforce 2026 and at every major Agentforce / Data 360 / Agent Fabric announcement.*

## Relevance verdict — held, narrowed at one edge, widened at another

The whole-org analyst / governance lane — security health scoring, technical-debt detection, RBAC drift, FlexiPage and Flow introspection, AI-generated org documentation — is still uncontested by Salesforce's own surface and by the open-source community. Spring '26 expanded Salesforce Health Check on five new dimensions (MFA status, SAML, session management, file virus scan, the Delete Files permission) but it remains a UI-only page in Setup with no MCP-callable surface. The 50+ entries in the Hosted MCP catalogue are organised on a *capability* axis (Data 360, Marketing Cloud, DX) — none on a *cross-cutting concern* axis (security, debt, RBAC).

**Narrowed** — Agent Fabric (GA June 2026: AI Gateway, MCP Bridge, Trusted Agent Identity, Controlled Registration, Agent Broker) is Salesforce's first real move into agent-governance, but at the *runtime / agent-permission* layer, not the *org-metadata-config* layer. Vibes 2.0 claims "full org awareness from the start" but ships per-file IDE coding-assist, not audit. Elements.cloud and Copado Agentia each circle a paid "context layer for AI DevOps" adjacency. Pressure is real but lives at the edge.

**Widened** — Two new gaps opened. (1) Informatica closed November 2025; Data 360 MCP shipped Dev Preview May 2026 and is *write-capable* but unaudited — a data-classification-drift scanner pack has no first-party equivalent. (2) The phishing-resistant MFA mandate (enforced 22 June sandbox, 13 July production) creates a *prove enforcement* gap — orgs must report compliance, not just enable it. Both are natural extensions of the static-analysis-plus-agent pattern.

## What this delivers

Five value claims, ordered by defensibility:

1. **Composability over competition.** sf-dev-ai composes with [`@salesforce/mcp`](https://github.com/salesforcecli/mcp) via the `--with-dx-mcp` flag rather than duplicating it. One MCP endpoint a developer registers, two lanes (governance native + build/deploy proxied), one tier-annotated safety model.
2. **Tier-annotated agentic safety.** Salesforce's own server ships `readOnlyHint` and `destructiveHint` baseline (PR #61, merged June 2025). sf-dev-ai's four-tier model (read / read-sensitive / mutate / destructive) plus per-tool confirmation prompts remains the highest-resolution safety overlay in any Salesforce MCP project.
3. **Whole-org analyst surface nothing else covers.** 16 deterministic security rules + 8 technical-debt rules + RBAC graph + Flow / FlexiPage introspection + AI-generated org docs — all callable as MCP tools an agent can chain.
4. **Static-analysis-plus-LLM as an auditable pattern.** Findings are reproducible code, not LLM outputs. Same prompt → same finding. Auditable for SOC / FedRAMP conversations in ways LLM-as-analyser is not.
5. **Apache-2.0 means zero procurement friction.** Customers adopt without legal review of usage terms. The proxy bundles `@salesforce/mcp` (also Apache-2.0). End to end open, end to end compatible.

## Now → next 3 months (Q3 2026)

Three high-priority moves that compound the existing lane.

### Audit log persistence

Flip `audit_logging: false` (declared at `/.well-known/mcp.json`) to `true`. Every tool call recorded with input arguments, output summary, identity (org + user), latency, cost, tier, confirmation outcome. Postgres `audit_events` table keyed by org + tool + timestamp, with retention policy in `src/lib/audit/retention.ts`. New MCP tool `get_audit_events` (tier 0, read).

**Why now.** Agent Fabric's Trusted Agent Identity (GA June 2026) will demand audit handoff when sf-dev-ai-installed agents pass through the Controlled Registration flow. SOC 2 conversations already need it. This is a prerequisite, not a feature.

**Touches.** `src/lib/db/schema.ts` (new table), `src/lib/audit/` (new directory), `src/lib/mcp/server.ts` (middleware wrapper around every tool call), `src/lib/mcp/tools/audit.ts` (new toolset).

### Data 360 + Informatica metadata-classification audit pack

New toolset `governance_data360` with tools that scan data-classification drift, dataspace membership, identity-resolution rule sprawl, and Informatica catalog-vs-org metadata divergence. Builds on the existing static-analysis-plus-engine pattern in `src/lib/health/` and `src/lib/debt/`.

**Why now.** Data 360 MCP shipped Dev Preview May 2026 and is write-capable. Informatica closed November 2025 ($8B) and the catalog is now the Salesforce-blessed data-governance surface. Neither has an audit story. sf-dev-ai's *analyst-on-top* role fits the gap.

**Touches.** New engine at `src/lib/data360/engine.ts` with parallel collectors for Data 360 entities, dataspaces, identity resolution rules. New MCP tools in `src/lib/mcp/tools/data360.ts`. New workspace page `src/app/(workspace)/data360/`.

### npm publish + bin polish

Add a `tsc` build step that compiles `bin/sf-dev-ai-mcp.ts` to JS. Publish `sf-dev-ai-mcp` to npm. Update README so `npx -y sf-dev-ai-mcp --orgs DEFAULT_TARGET_ORG` works without a local clone.

**Why now.** This is currently the highest-friction onboarding step — anyone trying the proxy mode needs a local checkout. Salesforce ships `@salesforce/mcp` exactly this way for good reason.

**Touches.** `tsconfig.build.json` (new), `package.json` (add `prepublishOnly` and `files`), `README.md` (replace the `tsx /absolute/path/...` snippet with `npx -y sf-dev-ai-mcp`).

## 3–6 months (Q4 2026)

Composability moves that extend reach into enterprise deployments.

### Agent Fabric / MCP Bridge registration adapter

Surface sf-dev-ai's tier annotations and tool inventory as Agent Fabric Controlled Registration metadata. When customers bring agents through Agent Broker, sf-dev-ai's safety model rides through unchanged. Adapter shim lives in `src/lib/integrations/agent-fabric/`.

**Why now.** Agent Fabric GA'd June 2026. Enterprise Salesforce customers running governance through Trusted Agent Identity need MCP servers that hand off cleanly. First-mover advantage on third-party adapters is open.

### Cross-org governance diff

The Phase 5E item from the earlier plan. Run health + debt scans against two orgs in parallel, return structural delta. MCP tool `diff_orgs` (tier 0, read). Workspace page at `/diff/[orgA]/[orgB]`.

**Why now.** Production-vs-sandbox drift is a recurring customer pain point that no MCP-callable tool addresses today. The math is small (two `Promise.all` scans + a `diffScanResults` function) but the demo lands hard.

### Phishing-resistant-MFA compliance reporter

New health rule `MFA_PHISHING_RESISTANT_NOT_ENFORCED` covering the Summer '26 mandate (enforced 22 June 2026 sandbox, 13 July 2026 production). The rule checks setup-level MFA configuration plus per-user enrolment status, returns severity by gap size, generates an attestation report.

**Why now.** The mandate creates a *prove enforcement* gap. Health Check in Setup shows MFA enabled / disabled per profile but doesn't generate a compliance report. Auditors will ask for one.

## 6–9 months (Q1 2027)

Durability and multi-tenant moves that unlock shared-service deployments.

### Durable workflow engine for long deploys

Move long-running operations (multi-step metadata deploys, cross-org scans, audit report generation) off the request-response cycle. Vercel Workflow or Temporal. Workflow definitions live in `src/lib/workflows/`.

**Why now.** Any customer running sf-dev-ai as a shared service needs operations that survive a process restart. Currently the agent loop is request-scoped.

### Encrypt refresh tokens at rest

Apply `src/lib/crypto.ts` (already wired) to `org_connections.refreshToken`. Migration script handles existing rows.

**Why now.** Flagged in `SECURITY.md` as a known gap; trivial to do; required before any multi-tenant deployment.

### Per-tenant rate limits and quotas

Redis or Upstash, keyed by org. Cost-track per tenant the way the in-app agent already cost-tracks per session. Surfaces via new tools `get_org_quota` and `get_org_usage`.

**Why now.** Manifest currently declares rate limits per-process, fine for single-developer use. Multi-tenant needs per-org enforcement.

## Stretch (defer to next planning window)

These belong on the radar but are not commitments. Re-evaluate at Dreamforce 2026.

- **RAG over org documentation.** Index AI-generated org docs + commit history + Slack incident threads. Query layer on top of the existing `org_documents` table.
- **AppExchange listing.** Security Review is 3–9 months and paid. Worth the credibility once durable workflows + audit log + token encryption ship.
- **Hosted SaaS offering.** Sf-dev-ai as a service for customers without infrastructure. Depends entirely on whether the OSS adoption signal justifies the operational commitment.
- **Certification programme.** Tier annotation conformance for third-party Salesforce MCP servers. Premature today; revisit when there are ≥5 governance-adjacent MCP servers in the wild.

## Anti-goals (explicit non-goals so contributors don't drift)

The lane is held by being disciplined about what *not* to build. The following are explicitly out of scope, with their canonical alternative:

| Don't build | Use this instead |
|---|---|
| Apex / LWC / Aura code generation | Agentforce Vibes (IDE coding agent) |
| Metadata deploy / retrieve, change-set orchestration | `@salesforce/mcp` `deploy_metadata` / `retrieve_metadata` |
| DevOps Center work items, PRs, pipeline promotion | `@salesforce/mcp` `devops` toolset |
| Aura → LWC migration, SLDS uplift, Figma → LWC | `@salesforce/mcp` `aura-experts` / `lwc-experts` |
| Mobile LWC capability checks | `@salesforce/mcp` `mobile-core` |
| End-user CRM agents (Opportunity, Account, Case) | Salesforce Hosted MCP Servers |
| Data 360 catalog / lineage / quality | Informatica (integrate with it; don't reimplement) |
| Production deployment automation | DX MCP `deploy_metadata` (and register `@salesforce/mcp` separately for prod-deploy safety) |

A simple test: a contributor reading this section can answer *"should we build an LWC scaffold tool?"* without ambiguity.

## How this gets versioned

Every roadmap is a snapshot. This one is dated **June 2026** and was authored from a current-state research scan with primary-source citations to:

- Agentforce 360 (GA Feb 2026), Multi-Agent Orchestration + Atlas Reasoning Engine 3.0 (GA June 2026), Agent Fabric multi-component control plane (GA June 2026)
- Data 360 MCP Server (Dev Preview, May 2026)
- Hosted MCP Servers (GA April 2026)
- `@salesforce/mcp` v0.30.13 (27 May 2026), annotation work in PR #61 (merged June 2025)
- Agentforce Vibes 2.0 (TDX 2026, paid tier 1 June 2026)
- Spring '26 / Summer '26 release notes (Health Check expansion, phishing-resistant MFA mandate)
- Salesforce M&A: Informatica (closed November 2025), m3ter (announced June 2026)

Re-evaluate when:

1. **Dreamforce 2026** (expected September / October 2026)
2. **Agent Fabric Trusted Agent Identity** ships its first specification for third-party MCP-server hand-off
3. **Data 360 MCP Server** goes GA (currently Dev Preview)
4. **Any first-party Salesforce announcement of an MCP-callable governance, security-health, or RBAC-audit surface** — this would force a re-scope and is the single highest-signal trigger
5. **MCP protocol 2026-07-28 RC** ships annotation extensions affecting tier semantics
