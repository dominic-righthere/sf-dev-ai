---
name: sf-dev-ai
description: Salesforce org governance, security health, technical debt, RBAC audit, metadata introspection, and AI-generated org docs via tier-gated MCP tools. Use when the user asks about org health, permission drift, debt, governance, FlexiPage/Flow structure, or auditing an org — not for building LWC components, Aura migration, or DevOps Center workflows (defer those to the official Salesforce DX MCP Server when both are registered).
---

# SF Dev AI — Claude Code Skill

Use the **sf-dev-ai** MCP server when working with Salesforce orgs from Claude Code. It's a governance-focused stdio MCP server that **composes with** the official `@salesforce/mcp` server — when launched with `--with-dx-mcp`, sf-dev-ai spawns DX MCP as a child process and re-exports a curated subset of its tools as `dx_*` with sf-dev-ai's tier annotations on top.

## When to prefer sf-dev-ai-native tools over `dx_*` (and vice versa)

| Task | Use |
|---|---|
| Read SOQL, describe objects, list metadata | sf-dev-ai-native (`run_soql_query`, `describe_object`, …) |
| Inspect permission sets, profiles, RBAC | **sf-dev-ai-native** (DX MCP has none) |
| Read health / debt / RBAC findings | **sf-dev-ai-native** (`get_health_findings`, `get_debt_findings`, `get_rbac_audit`) |
| Generate org documentation | **sf-dev-ai-native** (DX MCP has none) |
| Read or analyse a FlexiPage / Flow | **sf-dev-ai-native** (DX MCP has none) |
| Create / update / delete custom fields, validation rules | **sf-dev-ai-native** (`create_custom_field`, …) — high-level CRUD without XML round-trip |
| Validate generated Apex (compile + run) | **sf-dev-ai-native** (`execute_anonymous_apex`) |
| Run Apex tests against the org | **`dx_run_apex_test`** (proxied from `@salesforce/mcp`) |
| Static analysis (PMD / ESLint / RetireJS) | **`dx_run_code_analyzer`** / **`dx_query_code_analyzer_results`** |
| Assign a user to a permission set | **`dx_assign_permission_set`** |
| Deploy a metadata bundle | DX MCP `deploy_metadata` (register `@salesforce/mcp` separately; NOT proxied — production-deploy safety is significant) |
| Create / scaffold LWC components | DX MCP (`lwc-experts` toolset; not proxied) |
| Aura → LWC migration, SLDS uplift, Figma → LWC | DX MCP (not proxied) |
| DevOps Center work items, PRs, pipeline promotion | DX MCP (`devops` toolset; not proxied) |

The `dx_*` tools available in unified-proxy mode carry sf-dev-ai's tier annotations even though `@salesforce/mcp` itself ships no annotations. That's the safety overlay.

## Tier model (read before mutating)

Every sf-dev-ai tool has a risk tier declared in [`/.well-known/mcp.json`](https://github.com/dominic-righthere/sf-dev-ai/blob/main/src/app/.well-known/mcp.json/route.ts). Respect them:

- **Tier 0** — read-only (SOQL, describes, list_*, list_apex_classes, list_permission_sets, etc.). Run freely.
- **Tier 1** — read sensitive (read_apex_class, read_metadata, read_permission_set, read_profile, read_flexipage). Bodies and raw permission XML — handle output with the same care as the source files.
- **Tier 2** — mutating (`create_record`, `update_record`, `create_custom_field`, `update_custom_field`, `create_validation_rule`, `update_validation_rule`, `update_field_permissions`, `update_object_permissions`). **Confirm with the user before calling.** State exactly what will change.
- **Tier 3** — destructive (`delete_record`, `delete_custom_field`). **Always confirm** and state that the action is not reversible without metadata redeploy or backup restore.

Salesforce's own DX MCP Server does not have a tier model. When you're in a mixed config, lean on sf-dev-ai's tier discipline for the tools it owns — and treat DX MCP's `deploy_metadata` against production as inherently tier 3 even though it isn't labelled.

## Common workflows

### Governance audit (preferred path)
1. `get_health_findings` → 16 deterministic rules across profiles, permission sets, user access, object security. Returns A-F grade, severity-categorised findings, affected items, remedies.
2. `get_debt_findings` → Apex coverage gaps, inactive metadata, automation hygiene.
3. `get_rbac_audit` → user → permission set graph, unassigned permission sets, permission set groups.
4. If the agent needs to dig deeper, fall through to `read_profile` / `read_permission_set` for specific affected items, or `run_soql_query` for ad-hoc queries.
5. Summarize with severity and concrete remediation (e.g. "remove ModifyAllData from profile `Sales User`"). Propose mutations via tier-2 tools (`update_field_permissions`, `update_object_permissions`) only with user confirmation.

### Permission drift investigation
1. `read_permission_set` for two perm sets to diff.
2. `update_field_permissions` / `update_object_permissions` (tier 2 — confirm) to bring them in line.

### FlexiPage / Flow archaeology
1. `list_flexipages` → find candidates.
2. `read_flexipage` → component tree + region layout. Don't try to redeploy via this server; export and use DX MCP `deploy_metadata` instead.

### Custom field lifecycle
1. `describe_object` to confirm where the field belongs.
2. `create_custom_field` (tier 2 — confirm) with explicit type, length/precision, picklist values.
3. `update_field_permissions` to grant access on the relevant permission set(s).

### Validating AI-generated Apex
1. Draft Apex code based on the user's request.
2. `execute_anonymous_apex` (tier 2 — confirm; runs as the authenticated user) with `System.debug()` calls to surface intermediate values.
3. If compile fails, inspect `exception.line` / `exception.column` and revise. If runtime exception, fix and re-run.
4. For test class coverage, use `dx_run_apex_test` (proxied from DX MCP) once the implementation compiles.

## Auth

sf-dev-ai-mcp reuses your local `~/.sfdx` auth (same as the `sf` CLI). If a tool call fails with a 401 or "INVALID_SESSION_ID", run `sf org login web --alias <name>` and restart Claude Code to pick up the new auth.

## What to NOT use this skill for

- Building LWC / Aura components.
- Salesforce DX project structure scaffolding.
- Deploying multi-component metadata bundles (use DX MCP's `deploy_metadata`).
- Anything outside the Salesforce ecosystem.
