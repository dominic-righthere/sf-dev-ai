"use client";

import { Search, Database, Box, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useObjectsStore } from "@/stores/objects-store";
import { cn } from "@/lib/utils";

export function ObjectList() {
  const filteredObjects = useObjectsStore((s) => s.filteredObjects);
  const search = useObjectsStore((s) => s.search);
  const filter = useObjectsStore((s) => s.filter);
  const selectedObjectName = useObjectsStore((s) => s.selectedObjectName);
  const isLoadingList = useObjectsStore((s) => s.isLoadingList);
  const setSearch = useObjectsStore((s) => s.setSearch);
  const setFilter = useObjectsStore((s) => s.setFilter);
  const setSelectedObjectName = useObjectsStore((s) => s.setSelectedObjectName);

  return (
    <div className="flex flex-col h-full border-r border-border-default">
      {/* Search */}
      <div className="p-3 space-y-2 border-b border-border-default">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search objects..."
            className="w-full rounded-md border border-border-default bg-bg-primary pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "standard", "custom"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-medium transition-colors capitalize",
                filter === f
                  ? "bg-accent-blue/10 text-accent-blue"
                  : "text-text-muted hover:text-text-secondary hover:bg-bg-tertiary"
              )}
            >
              {f}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-text-muted tabular-nums">
            {filteredObjects.length}
          </span>
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {isLoadingList ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : filteredObjects.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-text-muted text-xs">
            <Database className="h-5 w-5 mb-2" />
            No objects found
          </div>
        ) : (
          <div className="py-1">
            {filteredObjects.map((obj) => (
              <button
                key={obj.name}
                onClick={() => setSelectedObjectName(obj.name)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
                  selectedObjectName === obj.name
                    ? "bg-accent-blue/10 text-accent-blue"
                    : "text-text-primary hover:bg-bg-tertiary"
                )}
              >
                <Box className="h-3.5 w-3.5 shrink-0 opacity-50" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{obj.label}</div>
                  <div className="text-[11px] text-text-muted font-mono truncate">{obj.name}</div>
                </div>
                {obj.custom && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                    Custom
                  </Badge>
                )}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
