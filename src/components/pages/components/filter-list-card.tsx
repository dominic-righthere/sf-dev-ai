import type { ParsedComponentNode } from "@/lib/flexipage/types";
import { Badge } from "@/components/ui/badge";

export function FilterListCard({ component }: { component: ParsedComponentNode }) {
  const entity = component.properties.entityName || "Records";
  const filter = component.properties.filterName;

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-xs font-semibold text-text-primary">{entity}</h4>
        <Badge variant="outline" className="text-[10px]">list</Badge>
      </div>
      {filter && (
        <div className="text-[11px] text-text-muted font-mono">{filter}</div>
      )}
      <div className="mt-2 space-y-1.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-3 bg-bg-tertiary rounded" style={{ width: `${80 - i * 10}%` }} />
        ))}
      </div>
    </div>
  );
}
