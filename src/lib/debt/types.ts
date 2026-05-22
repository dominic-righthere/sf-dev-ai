import type { Severity, AffectedItem, Grade } from "@/lib/health/types";

export type { Severity, AffectedItem, Grade };

export type DebtCategory = "apex" | "automation" | "metadata" | "schema";

export interface DebtFinding {
  checkId: string;
  category: DebtCategory;
  severity: Severity;
  title: string;
  description: string;
  bestPractice: string;
  remedy: string;
  affectedItems: AffectedItem[];
}

export interface DebtCategorySummary {
  category: DebtCategory;
  label: string;
  totalChecks: number;
  passedChecks: number;
  findings: DebtFinding[];
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface DebtScanResult {
  score: number;
  grade: Grade;
  scannedAt: string;
  categories: DebtCategorySummary[];
  findings: DebtFinding[];
  totalChecks: number;
  passedChecks: number;
  summary: string;
}
