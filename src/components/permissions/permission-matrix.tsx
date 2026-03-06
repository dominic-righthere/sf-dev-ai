"use client";

import { useState, Fragment } from "react";
import { Search, Check, Minus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ObjectPermission, FieldPermission } from "@/stores/permissions-store";

type Props =
  | { type: "object"; objectPermissions: ObjectPermission[]; fieldPermissions?: never }
  | { type: "field"; fieldPermissions: FieldPermission[]; objectPermissions?: never };

export function PermissionMatrix(props: Props) {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase();

  if (props.type === "object") {
    const columns = ["Create", "Read", "Edit", "Delete", "View All", "Modify All"] as const;
    const keyMap: Record<typeof columns[number], keyof ObjectPermission> = {
      Create: "allowCreate",
      Read: "allowRead",
      Edit: "allowEdit",
      Delete: "allowDelete",
      "View All": "viewAllRecords",
      "Modify All": "modifyAllRecords",
    };

    const filtered = props.objectPermissions.filter(
      (p) => !q || p.object.toLowerCase().includes(q)
    );

    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-border-default">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter objects..."
              className="w-full rounded-md border border-border-default bg-bg-primary pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-bg-secondary z-10">
              <tr className="border-b border-border-default">
                <th className="px-3 py-2 text-left text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  Object
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-2 py-2 text-center text-[11px] font-medium text-text-muted uppercase tracking-wider w-16"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((perm) => (
                <tr key={perm.object} className="border-b border-border-subtle hover:bg-bg-tertiary/50">
                  <td className="px-3 py-1.5 font-mono text-text-primary whitespace-nowrap">
                    {perm.object}
                  </td>
                  {columns.map((col) => (
                    <td key={col} className="px-2 py-1.5 text-center">
                      {perm[keyMap[col]] ? (
                        <Check className="h-3.5 w-3.5 text-green-400 mx-auto" />
                      ) : (
                        <Minus className="h-3 w-3 text-border-default mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-8 text-center text-xs text-text-muted">No object permissions match</div>
          )}
        </ScrollArea>
        <div className="px-3 py-1.5 border-t border-border-default text-[11px] text-text-muted">
          {filtered.length} objects
        </div>
      </div>
    );
  }

  // Field permissions
  const filtered = props.fieldPermissions.filter(
    (p) => !q || p.field.toLowerCase().includes(q)
  );

  // Group by object
  const grouped = new Map<string, FieldPermission[]>();
  for (const fp of filtered) {
    const obj = fp.field.split(".")[0] ?? fp.field;
    if (!grouped.has(obj)) grouped.set(obj, []);
    grouped.get(obj)!.push(fp);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border-default">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter fields..."
            className="w-full rounded-md border border-border-default bg-bg-primary pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-bg-secondary z-10">
            <tr className="border-b border-border-default">
              <th className="px-3 py-2 text-left text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Field
              </th>
              <th className="px-2 py-2 text-center text-[11px] font-medium text-text-muted uppercase tracking-wider w-20">
                Read
              </th>
              <th className="px-2 py-2 text-center text-[11px] font-medium text-text-muted uppercase tracking-wider w-20">
                Edit
              </th>
            </tr>
          </thead>
          <tbody>
            {[...grouped.entries()].map(([obj, fields]) => (
              <Fragment key={obj}>
                <tr className="bg-bg-tertiary/30">
                  <td colSpan={3} className="px-3 py-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                    {obj}
                  </td>
                </tr>
                {fields.map((fp) => (
                  <tr key={fp.field} className="border-b border-border-subtle hover:bg-bg-tertiary/50">
                    <td className="px-3 py-1.5 font-mono text-text-primary pl-6">
                      {fp.field.split(".").pop()}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {fp.readable ? (
                        <Check className="h-3.5 w-3.5 text-green-400 mx-auto" />
                      ) : (
                        <Minus className="h-3 w-3 text-border-default mx-auto" />
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {fp.editable ? (
                        <Check className="h-3.5 w-3.5 text-green-400 mx-auto" />
                      ) : (
                        <Minus className="h-3 w-3 text-border-default mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-xs text-text-muted">No field permissions match</div>
        )}
      </ScrollArea>
      <div className="px-3 py-1.5 border-t border-border-default text-[11px] text-text-muted">
        {filtered.length} fields across {grouped.size} objects
      </div>
    </div>
  );
}

