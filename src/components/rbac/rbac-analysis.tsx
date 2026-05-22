"use client";

import { useEffect, useCallback } from "react";
import { Users, Database, FileText, GitCompareArrows, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRbacStore } from "@/stores/rbac-store";
import { UserAccessPanel } from "./user-access-panel";
import { ObjectAuditTable } from "./object-audit-table";
import { FieldAuditTable } from "./field-audit-table";
import { AccessComparison } from "./access-comparison";
import { Badge } from "@/components/ui/badge";

const tabs = [
  { id: "users" as const, label: "Users", icon: Users },
  { id: "objectAudit" as const, label: "Object Audit", icon: Database },
  { id: "fieldAudit" as const, label: "Field Audit", icon: FileText },
  { id: "comparison" as const, label: "Comparison", icon: GitCompareArrows },
  { id: "unassigned" as const, label: "Unassigned", icon: AlertCircle },
];

export function RbacAnalysis({ isConnected }: { isConnected: boolean }) {
  const store = useRbacStore();

  useEffect(() => {
    if (!isConnected) return;
    store.setIsLoading(true);
    Promise.all([
      fetch("/api/salesforce/rbac/users")
        .then((r) => r.json())
        .then((d) => { if (d.users) store.setUsers(d.users); }),
      fetch("/api/salesforce/rbac")
        .then((r) => r.json())
        .then((d) => {
          if (d.groups) store.setGroups(d.groups);
          if (d.unassigned) store.setUnassigned(d.unassigned);
        }),
    ])
      .catch((err) => store.setError(err.message))
      .finally(() => store.setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const handleObjectAudit = useCallback(async (objectName: string) => {
    store.setIsLoading(true);
    try {
      const res = await fetch(`/api/salesforce/rbac/audit?object=${encodeURIComponent(objectName)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      store.setObjectAudit(objectName, data.entries);
    } catch (err) {
      store.setError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      store.setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFieldAudit = useCallback(async (objectName: string, fieldName: string) => {
    store.setIsLoading(true);
    try {
      const res = await fetch(
        `/api/salesforce/rbac/audit?object=${encodeURIComponent(objectName)}&field=${encodeURIComponent(fieldName)}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      store.setFieldAudit(objectName, fieldName, data.entries);
    } catch (err) {
      store.setError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      store.setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        Connect to a Salesforce org to analyze permissions
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border-default bg-bg-secondary">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => store.setViewMode(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              store.viewMode === tab.id
                ? "bg-accent-blue/10 text-accent-blue"
                : "text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {store.viewMode === "users" && (
          <UserAccessPanel
            users={store.users}
            selectedUserId={store.selectedUserId}
            selectedUser={store.selectedUser}
            onSelectUser={(id) => store.setSelectedUserId(id)}
          />
        )}
        {store.viewMode === "objectAudit" && (
          <ObjectAuditTable
            objectName={store.objectAuditName}
            entries={store.objectAuditEntries}
            isLoading={store.isLoading}
            onSearch={handleObjectAudit}
          />
        )}
        {store.viewMode === "fieldAudit" && (
          <FieldAuditTable
            objectName={store.fieldAuditObject}
            fieldName={store.fieldAuditField}
            entries={store.fieldAuditEntries}
            isLoading={store.isLoading}
            onSearch={handleFieldAudit}
          />
        )}
        {store.viewMode === "comparison" && (
          <AccessComparison
            users={store.users}
            compareUserIds={store.compareUserIds}
            onSelectUser={(idx, userId) => {
              const ids: [string | null, string | null] = [...store.compareUserIds];
              ids[idx] = userId || null;
              store.setCompareUserIds(ids);
            }}
          />
        )}
        {store.viewMode === "unassigned" && (
          <div className="p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Unassigned Permission Sets ({store.unassigned.length})
            </h3>
            {store.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
              </div>
            ) : store.unassigned.length > 0 ? (
              <div className="space-y-1">
                {store.unassigned.map((ps) => (
                  <div
                    key={ps.id}
                    className="flex items-center gap-3 rounded-md bg-bg-primary border border-border-default px-3 py-2"
                  >
                    <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-text-primary truncate">{ps.label}</div>
                      <div className="text-[11px] text-text-muted font-mono truncate">{ps.name}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 shrink-0">
                      Unassigned
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-muted text-center py-8">
                All permission sets have at least one assignment
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
