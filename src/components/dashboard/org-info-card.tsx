"use client";

import { Building2, Globe, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OrgInfoCardProps {
  identity: {
    orgId: string;
    username: string;
    displayName: string;
    orgType?: string;
    instanceUrl?: string;
  };
}

export function OrgInfoCard({ identity }: OrgInfoCardProps) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-secondary p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="h-4 w-4 text-accent-blue" />
        <h3 className="text-sm font-semibold text-text-primary">Organization</h3>
        {identity.orgType && (
          <Badge
            variant="outline"
            className={
              identity.orgType === "production"
                ? "text-[10px] border-green-500/30 text-green-400"
                : "text-[10px] border-amber-500/30 text-amber-400"
            }
          >
            {identity.orgType}
          </Badge>
        )}
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-text-muted" />
          <div>
            <div className="text-xs text-text-muted">User</div>
            <div className="text-sm text-text-primary">{identity.displayName || identity.username}</div>
            <div className="text-[11px] text-text-muted font-mono">{identity.username}</div>
          </div>
        </div>
        {identity.instanceUrl && (
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-text-muted" />
            <div>
              <div className="text-xs text-text-muted">Instance</div>
              <div className="text-xs text-text-secondary font-mono truncate max-w-[250px]">
                {identity.instanceUrl}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
