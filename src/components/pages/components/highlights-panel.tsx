import type { ParsedComponentNode } from "@/lib/flexipage/types";
import { Badge } from "@/components/ui/badge";

export function HighlightsPanel({ component }: { component: ParsedComponentNode }) {
  const collapsed = component.properties.collapsed;
  const numActions = component.properties.numVisibleActions;

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
      <div className="flex items-center gap-4 mb-3">
        <div className="h-10 w-10 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue text-sm font-bold">
          R
        </div>
        <div className="flex-1">
          <div className="h-4 w-40 bg-bg-tertiary rounded mb-1.5" />
          <div className="h-3 w-24 bg-bg-tertiary rounded" />
        </div>
        <div className="flex gap-1.5">
          {collapsed && <Badge variant="outline" className="text-[10px]">collapsed</Badge>}
          {numActions && <Badge variant="outline" className="text-[10px]">{numActions} actions</Badge>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-2.5 w-12 bg-bg-tertiary rounded mb-1" />
            <div className="h-3 w-20 bg-bg-tertiary rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
