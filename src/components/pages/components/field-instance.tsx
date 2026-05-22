import type { ParsedComponentNode } from "@/lib/flexipage/types";
import { Badge } from "@/components/ui/badge";

export function FieldInstance({ component }: { component: ParsedComponentNode }) {
  const fieldName = component.properties.fieldApiName || component.label;
  const behavior = component.properties.uiBehavior;

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-xs font-mono text-text-secondary">{fieldName}</span>
      {behavior === "required" && (
        <Badge variant="outline" className="text-[9px] text-red-400 border-red-400/30">required</Badge>
      )}
      {behavior === "readonly" && (
        <Badge variant="outline" className="text-[9px] text-text-muted">readonly</Badge>
      )}
    </div>
  );
}
