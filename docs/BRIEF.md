# SF Dev AI — One-Page Brief

**An AI-native Salesforce developer workbench with tier-gated MCP tools and whole-org governance auditing (security health, technical debt, RBAC, architecture docs) on top of jsforce and Claude Sonnet 4.**

## Problem

After Dreamforce 2025, Salesforce shipped Agentforce Vibes and the DX MCP Server. The in-IDE AI coding lane is now occupied by Salesforce itself. What customers building production Agentforce deployments still don't have: a *whole-org* governance layer that audits the metadata an AI just generated, surfaces drift across permission sets and profiles, scores security posture, and gives an FDE or admin a single place to reason about an org with an agent at their side.

Vibes lives in your editor, per file. SF Dev AI lives above the org, across files.

## Approach

**MCP tier model.** Every tool declares a tier (0–3) and a confirmation requirement in `/.well-known/mcp.json`. Tier 0 runs automatically; tier 2/3 (mutating, destructive) require explicit user confirmation. The manifest also flags `treat_page_content_as_untrusted` and `require_user_presence` — concrete defenses against prompt injection through org data and against agent-initiated mutations without a human in the loop.

**Static analysis + agent, not agent alone.** Health Hub runs 13 best-practice checks (Modify All Data, excessive admins, unassigned permission set groups, etc.) deterministically; the agent explains findings, proposes fixes, and (with confirmation) applies them. Same pattern for the technical-debt scanner and the RBAC auditor. The LLM is used where it's strong (explanation, generation, multi-step reasoning) and not where deterministic code is better.

**Composable via MCP.** The same server that powers the in-app agent is exposed at `/api/mcp/streamable-http` for external clients (Claude Code, Cursor). The tool surface is the same; the per-page `TOOL_PRESETS` just scope it.

## What's working

- OAuth 2.0 + PKCE with optional zero-config Salesforce CLI device flow.
- ~25 MCP tools across data, schema, metadata, field-ops, permissions, flow, interaction.
- Multi-turn agent loop on Claude Sonnet 4 (Bedrock-capable) with SSE streaming, cost tracking, and `ask_clarification` as a first-class tool (HITL via tool, not side channel).
- 13-rule Security Health Hub with A–F scoring.
- Technical Debt scanner (Apex coverage, inactive metadata, automation hygiene).
- RBAC auditor (user→permission set graph, access comparisons, drift).
- AI-generated architecture docs per org.
- Visual flow builder + Metadata API deploy (React Flow + Dagre).

## What's next

- Wire DML tools through the agent with an approval-gate component (tools exist, not yet routed to the user-facing tier-2 confirmation flow).
- Anonymous Apex execution via the Tooling API — agent-validated Apex snippets.
- A "complement Vibes + DX MCP" reference: call the official Salesforce DX MCP Server from the workbench for scratch-org provisioning.
- Audit log persistence (currently `audit_logging: false`).

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Anthropic SDK + Bedrock · MCP SDK 1.27 · jsforce 3 · PostgreSQL 17 + Drizzle ORM · React Flow + Dagre · Tailwind 4 + Radix UI · iron-session.

## Links

- Repo: <https://github.com/dominic-righthere/sf-dev-ai> *(update when public)*
- Architecture deep-dive: [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- Demo (3 min): *Loom link — add after recording*
