import type { ParsedComponentNode } from "@/lib/flexipage/types";
import { RenderChildren } from "./component-renderer";

export function FieldSection({ component }: { component: ParsedComponentNode }) {
  const label = component.properties.label || component.label || "Details";
  const columns = component.children; // Column nodes

  // If we have resolved column children, render them with real fields
  if (columns.length > 0) {
    return (
      <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
        <h4 className="text-xs font-semibold text-text-primary mb-3">{label}</h4>
        <div className={`grid gap-4 ${columns.length >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {columns.map((col) => (
            <div key={col.id} className="space-y-2">
              <RenderChildren children={col.children} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback skeleton for unresolved sections
  const colCount = parseInt(component.properties.columns || "2", 10);
  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
      <h4 className="text-xs font-semibold text-text-primary mb-3">{label}</h4>
      <div className={`grid gap-3 ${colCount >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="h-2.5 w-16 bg-bg-tertiary rounded" />
            <div className="h-3 w-28 bg-bg-tertiary rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
