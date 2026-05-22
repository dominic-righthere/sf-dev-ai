import type { ParsedComponentNode } from "@/lib/flexipage/types";

export function ActivityPanel({ component }: { component: ParsedComponentNode }) {
  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
      <h4 className="text-xs font-semibold text-text-primary mb-3">Activity Timeline</h4>
      <div className="space-y-3 pl-3 border-l-2 border-border-default">
        {["Email", "Call", "Task"].map((type) => (
          <div key={type} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-accent-blue -ml-[17px]" />
            <div className="h-3 w-12 bg-bg-tertiary rounded" />
            <span className="text-[10px] text-text-muted">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
