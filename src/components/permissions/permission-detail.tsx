"use client";

import { Loader2, Shield, Key } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePermissionsStore } from "@/stores/permissions-store";
import { PermissionMatrixEditor } from "./permission-matrix-editor";
import { cn } from "@/lib/utils";

export function PermissionDetail() {
  const selectedName = usePermissionsStore((s) => s.selectedName);
  const selectedType = usePermissionsStore((s) => s.selectedType);
  const detail = usePermissionsStore((s) => s.selectedDetail);
  const detailTab = usePermissionsStore((s) => s.detailTab);
  const isLoadingDetail = usePermissionsStore((s) => s.isLoadingDetail);
  const setDetailTab = usePermissionsStore((s) => s.setDetailTab);

  if (!selectedName) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-xs">
        Select a permission set or profile to view details
      </div>
    );
  }

  if (isLoadingDetail) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!detail) return null;

  const tabs = [
    { id: "objectPermissions" as const, label: "Object Permissions", count: detail.objectPermissions.length },
    { id: "fieldPermissions" as const, label: "Field Permissions", count: detail.fieldPermissions.length },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center gap-2 mb-1">
          {selectedType === "Profile" ? (
            <Shield className="h-4 w-4 text-purple-400" />
          ) : (
            <Key className="h-4 w-4 text-accent-blue" />
          )}
          <h2 className="text-sm font-semibold text-text-primary">{detail.fullName}</h2>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          <span>{selectedType}</span>
          {detail.label && <span>{detail.label}</span>}
          {detail.description && <span className="truncate max-w-xs">{detail.description}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-default px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setDetailTab(tab.id)}
            className={cn(
              "px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
              detailTab === tab.id
                ? "border-accent-blue text-accent-blue"
                : "border-transparent text-text-muted hover:text-text-secondary"
            )}
          >
            {tab.label}
            <span className="ml-1.5 text-[10px] text-text-muted">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {detailTab === "objectPermissions" && (
          <PermissionMatrixEditor
            type="object"
            objectPermissions={detail.objectPermissions}
          />
        )}
        {detailTab === "fieldPermissions" && (
          <PermissionMatrixEditor
            type="field"
            fieldPermissions={detail.fieldPermissions}
          />
        )}
      </div>
    </div>
  );
}
