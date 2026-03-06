"use client";

import { useState } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FieldDetail } from "@/stores/objects-store";
import { cn } from "@/lib/utils";

type SortKey = "name" | "label" | "type" | "required";
type SortDir = "asc" | "desc";

export function FieldTable({ fields }: { fields: FieldDetail[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = fields.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.label.toLowerCase().includes(q) || f.type.toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortKey === "required") return (Number(a.required) - Number(b.required)) * dir;
    return a[sortKey].localeCompare(b[sortKey]) * dir;
  });

  const typeColor: Record<string, string> = {
    string: "text-green-400",
    textarea: "text-green-400",
    id: "text-yellow-400",
    reference: "text-blue-400",
    boolean: "text-purple-400",
    int: "text-orange-400",
    double: "text-orange-400",
    currency: "text-orange-400",
    percent: "text-orange-400",
    date: "text-cyan-400",
    datetime: "text-cyan-400",
    picklist: "text-pink-400",
    multipicklist: "text-pink-400",
    email: "text-teal-400",
    url: "text-teal-400",
    phone: "text-teal-400",
  };

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
              {([
                ["name", "API Name"],
                ["label", "Label"],
                ["type", "Type"],
                ["required", "Required"],
              ] as [SortKey, string][]).map(([key, label]) => (
                <th
                  key={key}
                  className="px-3 py-2 text-left text-[11px] font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:text-text-secondary select-none"
                  onClick={() => toggleSort(key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <ArrowUpDown className={cn("h-3 w-3", sortKey === key ? "opacity-100" : "opacity-30")} />
                  </span>
                </th>
              ))}
              <th className="px-3 py-2 text-left text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((field) => (
              <tr
                key={field.name}
                className="border-b border-border-subtle hover:bg-bg-tertiary/50 transition-colors"
              >
                <td className="px-3 py-1.5 font-mono text-text-primary whitespace-nowrap">
                  {field.name}
                  {field.custom && (
                    <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0">C</Badge>
                  )}
                </td>
                <td className="px-3 py-1.5 text-text-secondary">{field.label}</td>
                <td className="px-3 py-1.5">
                  <span className={cn("font-mono", typeColor[field.type] || "text-text-secondary")}>
                    {field.type}
                  </span>
                  {field.length > 0 && field.type !== "boolean" && field.type !== "id" && (
                    <span className="text-text-muted ml-1">({field.length})</span>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  {field.required && !field.nillable ? (
                    <span className="text-accent-red text-[10px] font-medium">Required</span>
                  ) : null}
                </td>
                <td className="px-3 py-1.5 text-text-muted">
                  {field.referenceTo && field.referenceTo.length > 0 && (
                    <span className="text-blue-400 text-[10px]">{field.referenceTo.join(", ")}</span>
                  )}
                  {field.unique && <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">Unique</Badge>}
                  {field.externalId && <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">ExtId</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="py-8 text-center text-xs text-text-muted">No fields match your filter</div>
        )}
      </ScrollArea>

      <div className="px-3 py-1.5 border-t border-border-default text-[11px] text-text-muted">
        {sorted.length} of {fields.length} fields
      </div>
    </div>
  );
}
