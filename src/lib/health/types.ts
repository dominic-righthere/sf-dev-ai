export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type Category = "profiles" | "permissionSets" | "userAccess" | "objectSecurity";
export type Grade = "A" | "B" | "C" | "D" | "F";

export interface AffectedItem {
  name: string;
  id?: string;
  detail?: string;
}

export interface Finding {
  checkId: string;
  category: Category;
  severity: Severity;
  title: string;
  description: string;
  bestPractice: string;
  remedy: string;
  affectedItems: AffectedItem[];
}

export interface CategorySummary {
  category: Category;
  label: string;
  totalChecks: number;
  passedChecks: number;
  findings: Finding[];
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface HealthScanResult {
  score: number;
  grade: Grade;
  scannedAt: string;
  categories: CategorySummary[];
  findings: Finding[];
  totalChecks: number;
  passedChecks: number;
  summary: string;
}
