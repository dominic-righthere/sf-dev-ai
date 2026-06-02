/**
 * Governance tools — surface the static-analysis engines (health, debt,
 * RBAC, docs) as MCP tools so the agent can read its own findings and
 * reason about them. Closes the "engine → agent" feedback loop that was
 * previously UI-only.
 *
 * Pattern: deterministic engines analyse the org; LLM reads findings via
 * these tools, explains them, and chains into mutation tools (tier 2/3)
 * to remediate. The engine is reproducible code; the agent is the
 * explanation + action layer.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Connection from "jsforce/lib/connection";
import { z } from "zod";
import { ANNOTATIONS } from "../annotations";
import { runHealthScan } from "../../health/engine";
import { runDebtScan } from "../../debt/engine";
import {
  getUserAssignments,
  getUnassignedPermissionSets,
  getPermissionSetGroups,
} from "../../salesforce/rbac";
import { getCached, setCache } from "../../db/cache";

export interface OrgContext {
  orgId: string;
  orgType: "production" | "sandbox";
}

export function registerGovernanceTools(
  server: McpServer,
  getConnection: () => Connection,
  getOrgContext: () => OrgContext,
) {
  server.tool(
    "get_health_findings",
    "Run or read the cached security health scan. Returns an A-F grade, a 0-100 score, and findings grouped by category (profiles, permission sets, user access, object security). Each finding has severity, affected items, and a concrete remediation.",
    {
      forceRefresh: z
        .boolean()
        .optional()
        .describe("Skip the cache and re-run the scan (default: use cache, ~30 min TTL)"),
    },
    ANNOTATIONS.read,
    async ({ forceRefresh }) => {
      const ctx = getOrgContext();
      if (!forceRefresh) {
        const cached = await getCached<unknown>(ctx.orgId, "healthScan");
        if (cached) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify(cached, null, 2) }],
          };
        }
      }
      const conn = getConnection();
      const result = await runHealthScan(conn, ctx.orgType);
      await setCache(ctx.orgId, "healthScan", result);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "get_debt_findings",
    "Run or read the cached technical debt scan. Detects Apex coverage gaps, inactive metadata, and automation hygiene issues. Returns categorized findings with severity and remediation guidance.",
    {
      forceRefresh: z
        .boolean()
        .optional()
        .describe("Skip the cache and re-run the scan (default: use cache, ~30 min TTL)"),
    },
    ANNOTATIONS.read,
    async ({ forceRefresh }) => {
      const ctx = getOrgContext();
      if (!forceRefresh) {
        const cached = await getCached<unknown>(ctx.orgId, "technicalDebt");
        if (cached) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify(cached, null, 2) }],
          };
        }
      }
      const conn = getConnection();
      const result = await runDebtScan(conn, ctx.orgType);
      await setCache(ctx.orgId, "technicalDebt", result);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "get_rbac_audit",
    "Audit role-based access: user → permission set assignments, unassigned permission sets, and permission set groups. Useful for spotting access drift or unused permissions.",
    {},
    ANNOTATIONS.read,
    async () => {
      const ctx = getOrgContext();
      const cached = await getCached<unknown>(ctx.orgId, "rbacAssignments");
      if (cached) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify(cached, null, 2) }],
        };
      }
      const conn = getConnection();
      const [assignments, unassigned, groups] = await Promise.all([
        getUserAssignments(conn),
        getUnassignedPermissionSets(conn),
        getPermissionSetGroups(conn),
      ]);
      const result = {
        assignments,
        unassignedPermissionSets: unassigned,
        permissionSetGroups: groups,
        scannedAt: new Date().toISOString(),
      };
      await setCache(ctx.orgId, "rbacAssignments", result);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
