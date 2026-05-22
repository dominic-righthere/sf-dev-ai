"use client";

import type { ParsedPage } from "@/lib/flexipage/types";
import { getLayoutDefinition } from "@/lib/flexipage/layouts";
import { ComponentRenderer } from "./components/component-renderer";
import { Badge } from "@/components/ui/badge";

interface PageRendererProps {
  page: ParsedPage;
}

export function PageRenderer({ page }: PageRendererProps) {
  const layout = getLayoutDefinition(page.layoutType);

  // Deduplicate regions that map to the same grid area
  const areaMap = new Map<string, typeof page.regions[0][]>();
  for (const region of page.regions) {
    const existing = areaMap.get(region.gridArea) || [];
    existing.push(region);
    areaMap.set(region.gridArea, existing);
  }

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold text-text-primary">{page.label}</h3>
          <Badge variant="outline" className="text-[10px]">{page.pageType}</Badge>
          <Badge variant="outline" className="text-[10px]">{page.layoutType}</Badge>
        </div>
        {page.sobjectType && (
          <div className="text-xs text-text-muted font-mono">{page.sobjectType}</div>
        )}
      </div>

      <div
        className="gap-4"
        style={{
          display: "grid",
          gridTemplate: layout.gridTemplate,
          minHeight: "400px",
        }}
      >
        {Array.from(areaMap.entries()).map(([area, regions]) => {
          const nodes = regions.flatMap((r) => r.components);
          return (
            <div key={area} style={{ gridArea: area }} className="space-y-3 min-w-0">
              {nodes.length > 0 ? (
                nodes.map((node) => (
                  <ComponentRenderer key={node.id} node={node} />
                ))
              ) : (
                <div className="flex items-center justify-center h-full rounded-lg border border-dashed border-border-default text-xs text-text-muted">
                  Empty region
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
