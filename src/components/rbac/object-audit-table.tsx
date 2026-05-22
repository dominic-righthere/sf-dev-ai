"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { ObjectAccessEntry } from "@/lib/salesforce/rbac";

interface ObjectAuditTableProps {
  objectName: string;
  entries: ObjectAccessEntry[];
  isLoading: boolean;
  onSearch: (objectName: string) => void;
}

function Check({ value }: { value: boolean }) {
  return value ? (
    <span className="text-green-400 text-xs font-bold">Y</span>
  ) : (
    <span className="text-text-muted text-xs">-</span>
  );
}

export function ObjectAuditTable({ objectName, entries, isLoading, onSearch }: ObjectAuditTableProps) {
  const [input, setInput] = useState(objectName);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border-default">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && input && onSearch(input)}
              placeholder="Object API name (e.g. Account)"
              className="w-full rounded-md border border-border-default bg-bg-primary pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
            />
          </div>
          <Button size="sm" onClick={() => input && onSearch(input)} disabled={!input || isLoading}>
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Audit"}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {entries.length > 0 ? (
          <div className="p-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left py-2 pr-4 text-text-muted font-medium">Name</th>
                  <th className="text-left py-2 pr-2 text-text-muted font-medium">Type</th>
                  <th className="text-center py-2 px-2 text-text-muted font-medium">C</th>
                  <th className="text-center py-2 px-2 text-text-muted font-medium">R</th>
                  <th className="text-center py-2 px-2 text-text-muted font-medium">U</th>
                  <th className="text-center py-2 px-2 text-text-muted font-medium">D</th>
                  <th className="text-center py-2 px-2 text-text-muted font-medium">View All</th>
                  <th className="text-center py-2 px-2 text-text-muted font-medium">Mod All</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr key={i} className="border-b border-border-default/50">
                    <td className="py-2 pr-4 text-text-primary">{entry.parentLabel}</td>
                    <td className="py-2 pr-2">
                      <Badge variant="outline" className="text-[10px]">{entry.parentType}</Badge>
                    </td>
                    <td className="text-center py-2 px-2"><Check value={entry.permissionsCreate} /></td>
                    <td className="text-center py-2 px-2"><Check value={entry.permissionsRead} /></td>
                    <td className="text-center py-2 px-2"><Check value={entry.permissionsEdit} /></td>
                    <td className="text-center py-2 px-2"><Check value={entry.permissionsDelete} /></td>
                    <td className="text-center py-2 px-2"><Check value={entry.permissionsViewAllRecords} /></td>
                    <td className="text-center py-2 px-2"><Check value={entry.permissionsModifyAllRecords} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !isLoading && objectName ? (
          <div className="flex items-center justify-center h-full text-text-muted text-xs py-12">
            No permissions found for {objectName}
          </div>
        ) : !isLoading ? (
          <div className="flex items-center justify-center h-full text-text-muted text-xs py-12">
            Enter an object name and click Audit
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
