"use client";

import { Search, Shield, Key, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { usePermissionsStore, type PermissionListItem } from "@/stores/permissions-store";
import { cn } from "@/lib/utils";

export function PermissionList() {
  const permissionSets = usePermissionsStore((s) => s.permissionSets);
  const profiles = usePermissionsStore((s) => s.profiles);
  const search = usePermissionsStore((s) => s.search);
  const selectedName = usePermissionsStore((s) => s.selectedName);
  const selectedType = usePermissionsStore((s) => s.selectedType);
  const isLoadingList = usePermissionsStore((s) => s.isLoadingList);
  const setSearch = usePermissionsStore((s) => s.setSearch);
  const setSelected = usePermissionsStore((s) => s.setSelected);

  const q = search.toLowerCase();
  const filteredSets = permissionSets.filter((p) => !q || p.fullName.toLowerCase().includes(q));
  const filteredProfiles = profiles.filter((p) => !q || p.fullName.toLowerCase().includes(q));

  const renderItem = (item: PermissionListItem) => {
    const isSelected = selectedName === item.fullName && selectedType === item.type;
    return (
      <button
        key={`${item.type}-${item.fullName}`}
        onClick={() => setSelected(item.fullName, item.type)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
          isSelected
            ? "bg-accent-blue/10 text-accent-blue"
            : "text-text-primary hover:bg-bg-tertiary"
        )}
      >
        {item.type === "Profile" ? (
          <Shield className="h-3.5 w-3.5 shrink-0 opacity-50" />
        ) : (
          <Key className="h-3.5 w-3.5 shrink-0 opacity-50" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">{item.fullName}</div>
          {item.lastModifiedByName && (
            <div className="text-[11px] text-text-muted truncate">
              {item.lastModifiedByName}
            </div>
          )}
        </div>
        {item.manageableState === "installed" && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">Pkg</Badge>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full border-r border-border-default">
      <div className="p-3 border-b border-border-default">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search permissions..."
            className="w-full rounded-md border border-border-default bg-bg-primary pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoadingList ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : (
          <>
            {filteredProfiles.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider bg-bg-tertiary/50">
                  Profiles ({filteredProfiles.length})
                </div>
                {filteredProfiles.map(renderItem)}
              </div>
            )}
            {filteredSets.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider bg-bg-tertiary/50">
                  Permission Sets ({filteredSets.length})
                </div>
                {filteredSets.map(renderItem)}
              </div>
            )}
            {filteredProfiles.length === 0 && filteredSets.length === 0 && (
              <div className="flex flex-col items-center py-12 text-text-muted text-xs">
                <Shield className="h-5 w-5 mb-2" />
                No permissions found
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
}
