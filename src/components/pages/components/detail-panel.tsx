import type { ParsedComponentNode } from "@/lib/flexipage/types";

export function DetailPanel({ component }: { component: ParsedComponentNode }) {
  const variant = component.originalName !== "force:detailPanel"
    ? component.originalName
    : undefined;

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
      <h4 className="text-xs font-semibold text-text-primary mb-1">
        {component.label || "Record Detail"}
      </h4>
      {variant && (
        <div className="text-[10px] text-text-muted font-mono mb-3">{variant}</div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="h-2.5 w-14 bg-bg-tertiary rounded" />
            <div className="h-3 w-24 bg-bg-tertiary rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
