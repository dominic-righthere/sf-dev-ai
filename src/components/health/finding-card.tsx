"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Finding, Severity } from "@/lib/health/types";
import { cn } from "@/lib/utils";

const SEVERITY_DOT: Record<Severity, string> = {
  critical: "bg-red-400",
  high: "bg-orange-400",
  medium: "bg-amber-400",
  low: "bg-blue-400",
  info: "bg-gray-400",
};

export function FindingCard({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(finding.severity === "critical");

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-bg-tertiary/50 transition-colors"
      >
        <span className={cn("h-2 w-2 rounded-full shrink-0", SEVERITY_DOT[finding.severity])} />
        <span className="text-sm font-medium text-text-primary flex-1 min-w-0 truncate">
          {finding.title}
        </span>
        <span className="text-xs text-text-muted shrink-0">
          {finding.affectedItems.length} item{finding.affectedItems.length !== 1 ? "s" : ""}
        </span>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-text-muted shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border-subtle">
          <p className="text-sm text-text-secondary pt-3">{finding.description}</p>

          <div className="rounded-lg bg-bg-tertiary/50 p-3 space-y-1">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Best Practice
            </span>
            <p className="text-sm text-text-secondary">{finding.bestPractice}</p>
          </div>

          <div className="rounded-lg bg-accent-blue/5 border border-accent-blue/10 p-3 space-y-1">
            <span className="text-xs font-medium text-accent-blue uppercase tracking-wider">
              Remedy
            </span>
            <p className="text-sm text-text-secondary">{finding.remedy}</p>
          </div>

          {finding.affectedItems.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Affected Items
              </span>
              <div className="flex flex-wrap gap-1.5">
                {finding.affectedItems.map((item, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md bg-bg-tertiary px-2 py-1 text-xs text-text-secondary"
                    title={item.detail}
                  >
                    {item.name}
                    {item.detail && (
                      <span className="text-text-muted ml-0.5">({item.detail})</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
