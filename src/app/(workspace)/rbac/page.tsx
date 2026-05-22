"use client";

import { useSession } from "@/hooks/use-session";
import { useOrgStore } from "@/stores/org-store";
import { RbacAnalysis } from "@/components/rbac/rbac-analysis";

export default function RbacPage() {
  useSession();
  const { isConnected } = useOrgStore();

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border-default px-6 py-4">
        <h1 className="text-lg font-semibold text-text-primary">RBAC Analysis</h1>
        <p className="text-sm text-text-muted">
          Analyze user permissions, profiles, and access controls
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <RbacAnalysis isConnected={isConnected} />
      </div>
    </div>
  );
}
