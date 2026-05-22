"use client";

import { useState } from "react";
import { Search, User, Shield, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UserAssignment } from "@/lib/salesforce/rbac";

interface UserAccessPanelProps {
  users: UserAssignment[];
  selectedUserId: string | null;
  selectedUser: UserAssignment | null;
  onSelectUser: (id: string) => void;
}

export function UserAccessPanel({ users, selectedUserId, selectedUser, onSelectUser }: UserAccessPanelProps) {
  const [search, setSearch] = useState("");

  const q = search.toLowerCase();
  const filtered = users.filter(
    (u) => !q || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
  );

  return (
    <div className="flex h-full">
      {/* User list */}
      <div className="w-72 flex flex-col border-r border-border-default shrink-0">
        <div className="p-3 border-b border-border-default">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full rounded-md border border-border-default bg-bg-primary pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
            />
          </div>
          <div className="mt-1.5 text-[11px] text-text-muted">{filtered.length} users</div>
        </div>
        <ScrollArea className="flex-1">
          <div className="py-1">
            {filtered.map((user) => (
              <button
                key={user.userId}
                onClick={() => onSelectUser(user.userId)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
                  selectedUserId === user.userId
                    ? "bg-accent-blue/10 text-accent-blue"
                    : "text-text-primary hover:bg-bg-tertiary"
                )}
              >
                <User className="h-3.5 w-3.5 shrink-0 opacity-50" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{user.name}</div>
                  <div className="text-[11px] text-text-muted truncate">{user.username}</div>
                </div>
                <ChevronRight className="h-3 w-3 shrink-0 text-text-muted" />
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* User detail */}
      <div className="flex-1 overflow-auto">
        {!selectedUser ? (
          <div className="flex items-center justify-center h-full text-text-muted text-xs">
            Select a user to view access details
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">{selectedUser.name}</h3>
              <div className="text-xs text-text-muted font-mono">{selectedUser.username}</div>
            </div>

            <div className="rounded-lg border border-border-default bg-bg-primary p-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-medium text-text-primary">Profile</span>
              </div>
              <div className="text-sm text-text-secondary">{selectedUser.profileName}</div>
            </div>

            <div>
              <h4 className="text-xs font-medium text-text-primary mb-2">
                Permission Sets ({selectedUser.permissionSets.length})
              </h4>
              {selectedUser.permissionSets.length > 0 ? (
                <div className="space-y-1">
                  {selectedUser.permissionSets.map((ps) => (
                    <div
                      key={ps.id}
                      className="flex items-center gap-2 rounded-md bg-bg-primary border border-border-default px-3 py-2"
                    >
                      <Shield className="h-3 w-3 text-accent-blue shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-text-primary truncate">{ps.label}</div>
                        <div className="text-[11px] text-text-muted font-mono truncate">{ps.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-text-muted">No additional permission sets</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
