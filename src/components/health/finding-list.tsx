"use client";

import { useHealthStore } from "@/stores/health-store";
import { FindingCard } from "./finding-card";
import type { Finding, Severity } from "@/lib/health/types";

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Informational",
};

const SEVERITY_BORDER: Record<Severity, string> = {
  critical: "border-l-red-400",
  high: "border-l-orange-400",
  medium: "border-l-amber-400",
  low: "border-l-blue-400",
  info: "border-l-gray-400",
};

export function FindingList() {
  const scanResult = useHealthStore((s) => s.scanResult);
  const selectedCategory = useHealthStore((s) => s.selectedCategory);

  if (!scanResult) return null;

  const filtered = selectedCategory
    ? scanResult.findings.filter((f) => f.category === selectedCategory)
    : scanResult.findings;

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-border-default bg-bg-secondary p-8 text-center">
        <p className="text-sm text-emerald-400 font-medium mb-1">All clear</p>
        <p className="text-xs text-text-muted">
          {selectedCategory
            ? "No findings in this category."
            : "No security issues detected."}
        </p>
      </div>
    );
  }

  const grouped = new Map<Severity, Finding[]>();
  for (const f of filtered) {
    const list = grouped.get(f.severity) || [];
    list.push(f);
    grouped.set(f.severity, list);
  }

  return (
    <div className="space-y-4">
      {SEVERITY_ORDER.map((sev) => {
        const findings = grouped.get(sev);
        if (!findings || findings.length === 0) return null;
        return (
          <div key={sev} className={`border-l-2 ${SEVERITY_BORDER[sev]} pl-4 space-y-2`}>
            <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider">
              {SEVERITY_LABELS[sev]} ({findings.length})
            </h3>
            {findings.map((f) => (
              <FindingCard key={f.checkId} finding={f} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
