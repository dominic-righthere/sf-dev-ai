import type Connection from "jsforce/lib/connection";
import type { HealthScanResult, Finding, CategorySummary, Category, Grade, Severity } from "./types";
import { checks, type ScanData } from "./checks";
import {
  getUserAssignments,
  getUnassignedPermissionSets,
  getPermissionSetGroups,
} from "@/lib/salesforce/rbac";

const CATEGORY_LABELS: Record<Category, string> = {
  profiles: "Profiles",
  permissionSets: "Permission Sets",
  userAccess: "User Access",
  objectSecurity: "Object Security",
};

const SEVERITY_DEDUCTIONS: Record<Severity, number> = {
  critical: 15,
  high: 8,
  medium: 3,
  low: 1,
  info: 0,
};

function computeGrade(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export async function collectScanData(
  conn: Connection,
  orgType: "production" | "sandbox" | undefined
): Promise<ScanData> {
  const [
    profileResult,
    permSetResult,
    objectPermResult,
    userAssignments,
    unassignedPermSets,
    permSetGroups,
  ] = await Promise.all([
    conn.query<{
      Id: string;
      Name: string;
      Label: string;
      "Profile.Name": string;
      PermissionsModifyAllData: boolean;
      PermissionsViewAllData: boolean;
      PermissionsManageUsers: boolean;
      PermissionsAuthorApex: boolean;
    }>(
      "SELECT Id, Name, Label, Profile.Name, " +
        "PermissionsModifyAllData, PermissionsViewAllData, " +
        "PermissionsManageUsers, PermissionsAuthorApex " +
        "FROM PermissionSet WHERE IsOwnedByProfile = true"
    ),
    conn.query<{
      Id: string;
      Name: string;
      Label: string;
      PermissionsModifyAllData: boolean;
      PermissionsViewAllData: boolean;
      PermissionsManageUsers: boolean;
      PermissionsAuthorApex: boolean;
    }>(
      "SELECT Id, Name, Label, " +
        "PermissionsModifyAllData, PermissionsViewAllData, " +
        "PermissionsManageUsers, PermissionsAuthorApex " +
        "FROM PermissionSet WHERE IsOwnedByProfile = false AND IsCustom = true"
    ),
    conn.query<{
      "Parent.Name": string;
      "Parent.Label": string;
      "Parent.IsOwnedByProfile": boolean;
      SobjectType: string;
      PermissionsViewAllRecords: boolean;
      PermissionsModifyAllRecords: boolean;
    }>(
      "SELECT Parent.Name, Parent.Label, Parent.IsOwnedByProfile, " +
        "SobjectType, PermissionsViewAllRecords, PermissionsModifyAllRecords " +
        "FROM ObjectPermissions " +
        "WHERE PermissionsViewAllRecords = true OR PermissionsModifyAllRecords = true " +
        "LIMIT 2000"
    ),
    getUserAssignments(conn),
    getUnassignedPermissionSets(conn),
    getPermissionSetGroups(conn),
  ]);

  return {
    profilePermissions: profileResult.records,
    permSetPermissions: permSetResult.records,
    objectPermissions: objectPermResult.records,
    userAssignments,
    unassignedPermSets,
    permSetGroups,
    orgType,
  };
}

export async function runHealthScan(
  conn: Connection,
  orgType: "production" | "sandbox" | undefined
): Promise<HealthScanResult> {
  const data = await collectScanData(conn, orgType);

  const allFindings: Finding[] = [];
  for (const check of checks) {
    const findings = check.evaluate(data);
    allFindings.push(...findings);
  }

  // Score
  let score = 100;
  for (const f of allFindings) {
    score -= SEVERITY_DEDUCTIONS[f.severity];
  }
  score = Math.max(0, score);

  // Category summaries
  const categoryMap = new Map<Category, Finding[]>();
  for (const f of allFindings) {
    const list = categoryMap.get(f.category) || [];
    list.push(f);
    categoryMap.set(f.category, list);
  }

  const categories: CategorySummary[] = (
    ["profiles", "permissionSets", "userAccess", "objectSecurity"] as Category[]
  ).map((cat) => {
    const catChecks = checks.filter((c) => c.category === cat);
    const catFindings = categoryMap.get(cat) || [];
    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      totalChecks: catChecks.length,
      passedChecks: catChecks.length - catFindings.length,
      findings: catFindings,
      critical: catFindings.filter((f) => f.severity === "critical").length,
      high: catFindings.filter((f) => f.severity === "high").length,
      medium: catFindings.filter((f) => f.severity === "medium").length,
      low: catFindings.filter((f) => f.severity === "low").length,
      info: catFindings.filter((f) => f.severity === "info").length,
    };
  });

  const totalChecks = checks.length;
  const passedChecks = totalChecks - allFindings.length;
  const grade = computeGrade(score);

  const critCount = allFindings.filter((f) => f.severity === "critical").length;
  const highCount = allFindings.filter((f) => f.severity === "high").length;
  let summary = `Score: ${score}/100 (${grade}). ${passedChecks}/${totalChecks} checks passed.`;
  if (critCount > 0) summary += ` ${critCount} critical issue(s).`;
  if (highCount > 0) summary += ` ${highCount} high severity issue(s).`;

  return {
    score,
    grade,
    scannedAt: new Date().toISOString(),
    categories,
    findings: allFindings,
    totalChecks,
    passedChecks,
    summary,
  };
}
