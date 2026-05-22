"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { OrgInfoCard } from "@/components/dashboard/org-info-card";
import { ApiLimitsCard } from "@/components/dashboard/api-limits-card";
import { RecordCountsCard } from "@/components/dashboard/record-counts-card";
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card";
import { QuickActions } from "@/components/dashboard/quick-actions";

interface OrgData {
  identity: {
    orgId: string;
    username: string;
    displayName: string;
    orgType?: string;
    instanceUrl?: string;
  };
  limits: Record<string, { Max: number; Remaining: number } | undefined>;
  recordCounts: Record<string, number | null>;
}

interface Draft {
  id: string;
  label: string;
  apiName: string;
  updatedAt: string;
}

export default function DashboardPage() {
  useSession();
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/salesforce/org")
        .then((r) => r.json())
        .then((d) => { if (!d.error) setOrgData(d); })
        .catch(() => {}),
      fetch("/api/flows")
        .then((r) => r.json())
        .then((d) => setDrafts(d.drafts || []))
        .catch(() => {}),
    ]).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border-default px-6 py-4">
        <h1 className="text-lg font-semibold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-muted">Salesforce org overview</p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
          {orgData ? (
            <>
              <OrgInfoCard identity={orgData.identity} />
              <ApiLimitsCard limits={orgData.limits} />
              <RecordCountsCard counts={orgData.recordCounts} />
              <RecentActivityCard drafts={drafts} />
              <QuickActions />
            </>
          ) : (
            <>
              <div className="rounded-xl border border-border-default bg-bg-secondary p-5">
                <div className="text-sm text-text-muted">
                  Connect to a Salesforce org to see your dashboard
                </div>
              </div>
              <QuickActions />
              <RecentActivityCard drafts={drafts} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
