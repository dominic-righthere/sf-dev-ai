"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { FieldAccessEntry } from "@/lib/salesforce/rbac";

interface FieldAuditTableProps {
  objectName: string;
  fieldName: string;
  entries: FieldAccessEntry[];
  isLoading: boolean;
  onSearch: (objectName: string, fieldName: string) => void;
}

function Check({ value }: { value: boolean }) {
  return value ? (
    <span className="text-green-400 text-xs font-bold">Y</span>
  ) : (
    <span className="text-text-muted text-xs">-</span>
  );
}

export function FieldAuditTable({ objectName, fieldName, entries, isLoading, onSearch }: FieldAuditTableProps) {
  const [objInput, setObjInput] = useState(objectName);
  const [fieldInput, setFieldInput] = useState(fieldName);

  const handleSearch = () => {
    if (objInput && fieldInput) onSearch(objInput, fieldInput);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border-default">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={objInput}
              onChange={(e) => setObjInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Object (e.g. Account)"
              className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
            />
          </div>
          <div className="relative flex-1">
            <input
              type="text"
              value={fieldInput}
              onChange={(e) => setFieldInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Field (e.g. Industry)"
              className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
            />
          </div>
          <Button size="sm" onClick={handleSearch} disabled={!objInput || !fieldInput || isLoading}>
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
                  <th className="text-center py-2 px-4 text-text-muted font-medium">Read</th>
                  <th className="text-center py-2 px-4 text-text-muted font-medium">Edit</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr key={i} className="border-b border-border-default/50">
                    <td className="py-2 pr-4 text-text-primary">{entry.parentLabel}</td>
                    <td className="py-2 pr-2">
                      <Badge variant="outline" className="text-[10px]">{entry.parentType}</Badge>
                    </td>
                    <td className="text-center py-2 px-4"><Check value={entry.permissionsRead} /></td>
                    <td className="text-center py-2 px-4"><Check value={entry.permissionsEdit} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !isLoading && objectName && fieldName ? (
          <div className="flex items-center justify-center text-text-muted text-xs py-12">
            No field permissions found for {objectName}.{fieldName}
          </div>
        ) : !isLoading ? (
          <div className="flex items-center justify-center text-text-muted text-xs py-12">
            Enter an object and field name, then click Audit
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
