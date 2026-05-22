import type { ParsedComponentNode } from "@/lib/flexipage/types";
import { Badge } from "@/components/ui/badge";
import { RenderChildren } from "./component-renderer";

/** "ObjectManager" → "Object Manager", "recentRecordContainer" → "Recent Record Container" */
function humanize(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

export function GenericComponent({ component }: { component: ParsedComponentNode }) {
  const propEntries = Object.entries(component.properties).slice(0, 4);
  const displayLabel = humanize(component.label);

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-xs font-semibold text-text-primary">{displayLabel}</h4>
        <Badge variant="outline" className="text-[10px]">
          {component.type}
        </Badge>
      </div>
      <div className="text-[11px] text-text-muted font-mono mb-2">{component.originalName}</div>
      {propEntries.length > 0 && (
        <div className="space-y-1 mb-2">
          {propEntries.map(([key, val]) => (
            <div key={key} className="flex gap-2 text-[11px]">
              <span className="text-text-muted">{key}:</span>
              <span className="text-text-secondary truncate">{val}</span>
            </div>
          ))}
        </div>
      )}
      {component.children.length > 0 && (
        <div className="mt-3 pl-3 border-l-2 border-border-default space-y-2">
          <RenderChildren children={component.children} />
        </div>
      )}
    </div>
  );
}
