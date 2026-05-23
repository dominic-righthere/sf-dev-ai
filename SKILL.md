---
name: sf-dev-ai
description: Salesforce org governance, security health, technical debt, RBAC audit, metadata introspection, and AI-generated org docs via tier-gated MCP tools. Use when the user asks about org health, permission drift, debt, governance, FlexiPage/Flow structure, or auditing an org — not for building LWC components, Aura migration, or DevOps Center workflows (defer those to the official Salesforce DX MCP Server when both are registered).
---

# SF Dev AI — Claude Code Skill

Use the **sf-dev-ai** MCP server when working with Salesforce orgs from Claude Code. It's a governance-focused stdio MCP server that complements (does not replace) the official `@salesforce/mcp` server.

## When to prefer sf-dev-ai over Salesforce DX MCP

| Task | Use |
|---|---|
| Read SOQL, describe objects, list metadata | sf-dev-ai (lighter surface) |
| Inspect permission sets, profiles, RBAC | **sf-dev-ai** (DX MCP has none) |
| Run a security health scan or technical-debt scan | **sf-dev-ai** (DX MCP has none) |
| Read or analyse a FlexiPage / Flow | **sf-dev-ai** (DX MCP has none) |
| Generate org documentation | **sf-dev-ai** (DX MCP has none) |
| Create / update / delete custom fields, validation rules | **sf-dev-ai** (high-level CRUD tools; DX MCP requires deploying XML) |
| Create / scaffold LWC components | DX MCP (`@salesforce/mcp`, lwc-experts toolset) |
| Aura → LWC migration, SLDS uplift, Figma → LWC | DX MCP |
| Deploy a metadata bundle, run Apex tests | DX MCP (`deploy_metadata`, `run_apex_test`) |
| DevOps Center work items, PRs, pipeline promotion | DX MCP (`devops` toolset) |
| Mobile LWC capability checks | DX MCP |

When both servers are registered, scope your tool calls to the right lane. Don't use sf-dev-ai's `read_metadata` for what DX MCP's `deploy_metadata` flow expects; don't use DX MCP's `run_code_analyzer` for what sf-dev-ai's health/debt scanners exist for.

## Tier model (read before mutating)

Every sf-dev-ai tool has a risk tier declared in [`/.well-known/mcp.json`](https://github.com/dominic-righthere/sf-dev-ai/blob/main/src/app/.well-known/mcp.json/route.ts). Respect them:

- **Tier 0** — read-only (SOQL, describes, list_*, list_apex_classes, list_permission_sets, etc.). Run freely.
- **Tier 1** — read sensitive (read_apex_class, read_metadata, read_permission_set, read_profile, read_flexipage). Bodies and raw permission XML — handle output with the same care as the source files.
- **Tier 2** — mutating (`create_record`, `update_record`, `create_custom_field`, `update_custom_field`, `create_validation_rule`, `update_validation_rule`, `update_field_permissions`, `update_object_permissions`). **Confirm with the user before calling.** State exactly what will change.
- **Tier 3** — destructive (`delete_record`, `delete_custom_field`). **Always confirm** and state that the action is not reversible without metadata redeploy or backup restore.

Salesforce's own DX MCP Server does not have a tier model. When you're in a mixed config, lean on sf-dev-ai's tier discipline for the tools it owns — and treat DX MCP's `deploy_metadata` against production as inherently tier 3 even though it isn't labelled.

## Common workflows

### Governance audit
1. `run_soql_query` → check user counts, license counts, recent admin actions.
2. `list_profiles` + `read_profile` for non-admin profiles → look for ModifyAllData, ViewAllData, ManageUsers, AuthorApex.
3. `list_permission_sets` + `read_permission_set` → unassigned sets, overly broad sets.
4. Summarize with severity (critical/high/medium/low) and concrete remediation (e.g. "remove ModifyAllData from profile `Sales User`").

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

## Auth

sf-dev-ai-mcp reuses your local `~/.sfdx` auth (same as the `sf` CLI). If a tool call fails with a 401 or "INVALID_SESSION_ID", run `sf org login web --alias <name>` and restart Claude Code to pick up the new auth.

## What to NOT use this skill for

- Building LWC / Aura components.
- Salesforce DX project structure scaffolding.
- Deploying multi-component metadata bundles (use DX MCP's `deploy_metadata`).
- Anything outside the Salesforce ecosystem.
