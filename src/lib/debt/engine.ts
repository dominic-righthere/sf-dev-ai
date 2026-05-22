import type Connection from "jsforce/lib/connection";
import type { DebtScanResult, DebtFinding, DebtCategorySummary, DebtCategory, Grade, Severity } from "./types";
import { checks, type DebtScanData } from "./checks";

const CATEGORY_LABELS: Record<DebtCategory, string> = {
  apex: "Apex Code",
  automation: "Automation",
  metadata: "Metadata",
  schema: "Schema",
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

async function toolingQuery<T>(conn: Connection, soql: string): Promise<T[]> {
  try {
    const result = await conn.tooling.query(soql);
    return ((result as unknown) as { records: T[] }).records ?? [];
  } catch {
    return [];
  }
}

export async function collectDebtData(
  conn: Connection,
  orgType: "production" | "sandbox" | undefined
): Promise<DebtScanData> {
  const [
    apexClassRecords,
    inactiveClassRecords,
    apexTriggerRecords,
    coverageRecords,
    validationRuleRecords,
    flowResult,
  ] = await Promise.all([
    toolingQuery<{
      Id: string;
      Name: string;
      Status: string;
      ApiVersion: number;
      LengthWithoutComments: number;
    }>(
      conn,
      "SELECT Id, Name, Status, ApiVersion, LengthWithoutComments FROM ApexClass WHERE Status = 'Active' ORDER BY Name"
    ),
    toolingQuery<{
      Id: string;
      Name: string;
      Status: string;
      ApiVersion: number;
      LengthWithoutComments: number;
    }>(
      conn,
      "SELECT Id, Name, Status, ApiVersion, LengthWithoutComments FROM ApexClass WHERE Status = 'Inactive' ORDER BY Name"
    ),
    toolingQuery<{
      Id: string;
      Name: string;
      TableEnumOrId: string;
      Status: string;
    }>(
      conn,
      "SELECT Id, Name, TableEnumOrId, Status FROM ApexTrigger WHERE Status = 'Active' ORDER BY Name"
    ),
    toolingQuery<{
      ApexClassOrTriggerId: string;
      ApexClassOrTrigger: { Name: string };
      NumLinesCovered: number;
      NumLinesUncovered: number;
    }>(
      conn,
      "SELECT ApexClassOrTriggerId, ApexClassOrTrigger.Name, NumLinesCovered, NumLinesUncovered FROM ApexCodeCoverageAggregate"
    ),
    toolingQuery<{
      Id: string;
      EntityDefinitionId: string;
      ValidationName: string;
      Active: boolean;
      Description?: string;
    }>(
      conn,
      "SELECT Id, EntityDefinitionId, ValidationName, Active, Description FROM ValidationRule WHERE Active = false LIMIT 500"
    ),
    conn
      .query<{
        DeveloperName: string;
        Label: string;
        ProcessType: string;
        TriggerType?: string;
        ActiveVersionId: string | null;
        Description?: string;
      }>(
        "SELECT DeveloperName, Label, ProcessType, TriggerType, ActiveVersionId, Description FROM FlowDefinition"
      )
      .catch(() => ({ records: [], done: true, totalSize: 0 })),
  ]);

  return {
    apexClasses: apexClassRecords,
    inactiveApexClasses: inactiveClassRecords,
    apexTriggers: apexTriggerRecords,
    coverage: coverageRecords.map((r) => ({
      ApexClassOrTriggerId: r.ApexClassOrTriggerId,
      ApexClassOrTriggerName: r.ApexClassOrTrigger?.Name ?? "",
      NumLinesCovered: r.NumLinesCovered,
      NumLinesUncovered: r.NumLinesUncovered,
    })),
    validationRules: validationRuleRecords,
    flowDefinitions: flowResult.records,
    orgType,
  };
}

export async function runDebtScan(
  conn: Connection,
  orgType: "production" | "sandbox" | undefined
): Promise<DebtScanResult> {
  const data = await collectDebtData(conn, orgType);

  const allFindings: DebtFinding[] = [];
  for (const check of checks) {
    allFindings.push(...check.evaluate(data));
  }

  let score = 100;
  for (const f of allFindings) {
    score -= SEVERITY_DEDUCTIONS[f.severity];
  }
  score = Math.max(0, score);

  const categoryMap = new Map<DebtCategory, DebtFinding[]>();
  for (const f of allFindings) {
    const list = categoryMap.get(f.category) || [];
    list.push(f);
    categoryMap.set(f.category, list);
  }

  const categories: DebtCategorySummary[] = (
    ["apex", "automation", "metadata", "schema"] as DebtCategory[]
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

  const highCount = allFindings.filter((f) => f.severity === "high").length;
  const medCount = allFindings.filter((f) => f.severity === "medium").length;
  let summary = `Score: ${score}/100 (${grade}). ${passedChecks}/${totalChecks} checks passed.`;
  if (highCount > 0) summary += ` ${highCount} high severity issue(s).`;
  if (medCount > 0) summary += ` ${medCount} medium severity issue(s).`;

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
