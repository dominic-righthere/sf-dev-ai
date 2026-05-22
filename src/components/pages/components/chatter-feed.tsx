import type { ParsedComponentNode } from "@/lib/flexipage/types";

export function ChatterFeed({ component }: { component: ParsedComponentNode }) {
  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
      <h4 className="text-xs font-semibold text-text-primary mb-2">Chatter Feed</h4>
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-2">
            <div className="h-6 w-6 rounded-full bg-bg-tertiary shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-2.5 w-24 bg-bg-tertiary rounded" />
              <div className="h-2 w-full bg-bg-tertiary rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
