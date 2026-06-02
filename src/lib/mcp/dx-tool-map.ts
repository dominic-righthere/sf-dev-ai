/**
 * Curated whitelist of tools to proxy from `@salesforce/mcp` (the official
 * Salesforce DX MCP Server, Apache-2.0).
 *
 * Each entry overlays our tier annotations onto the upstream tool so MCP
 * clients (Claude Code, Cursor, Windsurf) see one unified safety model
 * across both lanes: governance (sf-dev-ai native) + build/deploy/migrate
 * (DX MCP proxied).
 *
 * **Curation principle.** We only proxy tools that close real gaps in
 * sf-dev-ai's surface — test execution, code analysis, user→permset
 * linkage. We deliberately do NOT proxy DX MCP tools where we already
 * have native equivalents (run_soql_query, list_metadata, describe_object,
 * etc. — these would create confusing duplicates).
 *
 * **AUDIT.** Re-review this map on every `@salesforce/mcp` version bump.
 * Upstream tool semantics or annotations can change; our overlay is
 * authoritative for clients consuming sf-dev-ai's stdio server.
 *
 * Pinned upstream version: see `@salesforce/mcp` in package.json.
 */

import { ANNOTATIONS } from "./annotations";

export interface DxToolMapping {
  /** Upstream tool name in @salesforce/mcp. */
  upstreamName: string;
  /** ANNOTATIONS preset key — our tier overlay for this tool. */
  tier: keyof typeof ANNOTATIONS;
  /** Optional rationale, surfaced as a description prefix and in audit logs. */
  rationale: string;
}

export const DX_TOOL_MAP: ReadonlyArray<DxToolMapping> = [
  {
    upstreamName: "run_apex_test",
    tier: "update",
    rationale:
      "Apex tests: idempotent in end-state sense but execute user-defined Apex with arbitrary side effects.",
  },
  {
    upstreamName: "run_code_analyzer",
    tier: "read",
    rationale:
      "Static analysis (PMD/ESLint/RetireJS); no org-side mutation.",
  },
  {
    upstreamName: "query_code_analyzer_results",
    tier: "read",
    rationale: "Reads previously-stored analyzer results; pure read.",
  },
  {
    upstreamName: "assign_permission_set",
    tier: "create",
    rationale:
      "Writes a new PermissionSetAssignment row; not idempotent (re-assignment errors).",
  },
];

/**
 * Tools we explicitly chose NOT to proxy, and why. Kept here so the
 * decision is auditable on upstream version bumps.
 */
export const DX_TOOL_EXCLUSIONS: ReadonlyArray<{ name: string; reason: string }> = [
  {
    name: "run_soql_query",
    reason: "sf-dev-ai has a native equivalent (run_soql_query, tier 0).",
  },
  {
    name: "list_metadata",
    reason: "sf-dev-ai has a native equivalent (list_metadata, tier 0).",
  },
  {
    name: "deploy_metadata",
    reason:
      "Production-deploy safety is significant; users should register @salesforce/mcp directly if they want this lane.",
  },
  {
    name: "create_scratch_org / delete_org / create_org_snapshot",
    reason: "Org lifecycle is heavy; defer unless an FDE demo specifically calls for it.",
  },
  {
    name: "lwc-experts / aura-experts / mobile (~50 tools)",
    reason: "Wrong lane — Vibes/DX MCP own LWC creation, Aura migration, mobile.",
  },
  {
    name: "DevOps Center (12 tools)",
    reason: "Out of sf-dev-ai's governance scope.",
  },
];

/**
 * Toolsets to pass to @salesforce/mcp via --toolsets so only what we
 * actually want surfaces from upstream. We use the most permissive set
 * needed for the curated whitelist + filter individual tools at register
 * time.
 *
 * `testing` enables run_apex_test; `code-analysis` enables analyzer tools;
 * `users` enables assign_permission_set. Core is always implicit.
 */
export const UPSTREAM_TOOLSETS = ["testing", "code-analysis", "users"] as const;
