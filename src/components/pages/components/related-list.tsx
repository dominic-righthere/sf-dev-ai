import type { ParsedComponentNode } from "@/lib/flexipage/types";
import { Badge } from "@/components/ui/badge";

export function RelatedList({ component }: { component: ParsedComponentNode }) {
  const override = component.properties.relatedListComponentOverride;
  const parentField = component.properties.parentFieldApiName;
  const label = parentField || component.label || "Related Records";

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-xs font-semibold text-text-primary">{label}</h4>
        {override && <Badge variant="outline" className="text-[10px]">{override}</Badge>}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border-default">
            <th className="text-left py-1.5 text-text-muted font-medium">Name</th>
            <th className="text-left py-1.5 text-text-muted font-medium">Type</th>
            <th className="text-left py-1.5 text-text-muted font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3].map((i) => (
            <tr key={i} className="border-b border-border-default/50">
              <td className="py-1.5"><div className="h-3 w-24 bg-bg-tertiary rounded" /></td>
              <td className="py-1.5"><div className="h-3 w-16 bg-bg-tertiary rounded" /></td>
              <td className="py-1.5"><div className="h-3 w-20 bg-bg-tertiary rounded" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
