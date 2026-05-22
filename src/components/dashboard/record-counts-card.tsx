"use client";

import { BarChart3 } from "lucide-react";

interface RecordCountsCardProps {
  counts: Record<string, number | null>;
}

export function RecordCountsCard({ counts }: RecordCountsCardProps) {
  const entries = Object.entries(counts).filter(([, v]) => v !== null);

  return (
    <div className="rounded-xl border border-border-default bg-bg-secondary p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-accent-blue" />
        <h3 className="text-sm font-semibold text-text-primary">Record Counts</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {entries.map(([obj, count]) => (
          <div key={obj} className="rounded-lg bg-bg-primary p-3 border border-border-default">
            <div className="text-lg font-semibold text-text-primary">{count!.toLocaleString()}</div>
            <div className="text-xs text-text-muted">{obj}</div>
          </div>
        ))}
      </div>
      {entries.length === 0 && (
        <div className="text-xs text-text-muted text-center py-4">No data available</div>
      )}
    </div>
  );
}
