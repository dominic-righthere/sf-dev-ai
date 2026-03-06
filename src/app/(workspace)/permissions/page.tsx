"use client";

import { useEffect } from "react";
import { Shield } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useOrgStore } from "@/stores/org-store";
import { usePermissionsStore } from "@/stores/permissions-store";
import { PermissionList } from "@/components/permissions/permission-list";
import { PermissionDetail } from "@/components/permissions/permission-detail";
import { AgentBar } from "@/components/ai/agent-bar";
import { AgentChatPanel } from "@/components/ai/agent-chat-panel";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

export default function PermissionsPage() {
  useSession();
  const isConnected = useOrgStore((s) => s.isConnected);
  const setPermissionSets = usePermissionsStore((s) => s.setPermissionSets);
  const setProfiles = usePermissionsStore((s) => s.setProfiles);
  const setIsLoadingList = usePermissionsStore((s) => s.setIsLoadingList);
  const selectedName = usePermissionsStore((s) => s.selectedName);
  const selectedType = usePermissionsStore((s) => s.selectedType);
  const setSelectedDetail = usePermissionsStore((s) => s.setSelectedDetail);
  const setIsLoadingDetail = usePermissionsStore((s) => s.setIsLoadingDetail);

  // Fetch permission list
  useEffect(() => {
    if (!isConnected) return;
    setIsLoadingList(true);
    fetch("/api/salesforce/permissions")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPermissionSets(data.permissionSets || []);
        setProfiles(data.profiles || []);
      })
      .catch((err) =>
        toast({ title: "Failed to load permissions", description: err.message, variant: "destructive" })
      )
      .finally(() => setIsLoadingList(false));
  }, [isConnected]);

  // Fetch detail when selected
  useEffect(() => {
    if (!selectedName || !selectedType || !isConnected) return;
    setIsLoadingDetail(true);
    fetch(`/api/salesforce/permissions/${encodeURIComponent(selectedName)}?type=${selectedType}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        // Normalize the metadata API response
        setSelectedDetail({
          fullName: data.fullName || selectedName,
          label: data.label,
          description: data.description,
          objectPermissions: Array.isArray(data.objectPermissions)
            ? data.objectPermissions.map((op: any) => ({
                object: op.object,
                allowCreate: op.allowCreate === "true" || op.allowCreate === true,
                allowRead: op.allowRead === "true" || op.allowRead === true,
                allowEdit: op.allowEdit === "true" || op.allowEdit === true,
                allowDelete: op.allowDelete === "true" || op.allowDelete === true,
                viewAllRecords: op.viewAllRecords === "true" || op.viewAllRecords === true,
                modifyAllRecords: op.modifyAllRecords === "true" || op.modifyAllRecords === true,
              }))
            : [],
          fieldPermissions: Array.isArray(data.fieldPermissions)
            ? data.fieldPermissions.map((fp: any) => ({
                field: fp.field,
                readable: fp.readable === "true" || fp.readable === true,
                editable: fp.editable === "true" || fp.editable === true,
              }))
            : [],
        });
      })
      .catch((err) =>
        toast({ title: "Failed to load detail", description: err.message, variant: "destructive" })
      )
      .finally(() => setIsLoadingDetail(false));
  }, [selectedName, selectedType, isConnected]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="rounded-2xl border border-border-default bg-bg-secondary p-8 max-w-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 mx-auto mb-4">
            <Shield className="h-6 w-6 text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">Connect a Salesforce org</h2>
          <p className="text-sm text-text-secondary mb-4">
            Connect a Salesforce org to manage permissions.
          </p>
          <Link href="/auth/login" className="text-sm text-accent-blue hover:underline">
            Connect now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="border-b border-border-default px-6 py-3">
        <h1 className="text-lg font-semibold text-text-primary">Permissions Manager</h1>
        <p className="text-sm text-text-muted">Analyze and manage Salesforce permission sets and profiles</p>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 shrink-0">
          <PermissionList />
        </div>
        <div className="flex-1 overflow-hidden">
          <PermissionDetail />
        </div>
      </div>
      <AgentBar
        placeholder="Ask about permissions, update field access, manage profiles..."
        toolsets={["schema", "metadata", "permissions", "interaction"]}
        suggestions={[
          "What permissions does Sales User have?",
          "Grant read access to all Account fields",
          "Compare two permission sets",
        ]}
      />
      <AgentChatPanel toolsets={["schema", "metadata", "permissions", "interaction"]} />
    </div>
  );
}
