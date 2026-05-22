import type { ParsedComponentNode } from "@/lib/flexipage/types";
import { Badge } from "@/components/ui/badge";

export function FlowInterview({ component }: { component: ParsedComponentNode }) {
  const flowName = component.properties.flowApiName || component.properties.flowName || "Unknown Flow";
  const layout = component.properties.flowLayout;

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold text-text-primary">Flow</h4>
        <Badge variant="outline" className="text-[10px]">embedded</Badge>
        {layout && <Badge variant="outline" className="text-[10px]">{layout}</Badge>}
      </div>
      <div className="text-[11px] text-text-muted font-mono mt-1">{flowName}</div>
    </div>
  );
}
