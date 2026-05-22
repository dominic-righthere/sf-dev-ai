"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Zap, Loader2, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/hooks/use-session";
import { useOrgStore } from "@/stores/org-store";

interface FlowDraft {
  id: string;
  apiName: string;
  label: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface OrgFlow {
  fullName: string;
  lastModifiedDate?: string;
  lastModifiedByName?: string;
  processType?: string | null;
  description?: string | null;
  isActive: boolean;
}

export default function FlowsPage() {
  useSession();
  const { isConnected } = useOrgStore();
  const [drafts, setDrafts] = useState<FlowDraft[]>([]);
  const [orgFlows, setOrgFlows] = useState<OrgFlow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrg, setIsLoadingOrg] = useState(false);

  useEffect(() => {
    fetch("/api/flows")
      .then((r) => r.json())
      .then((data) => setDrafts(data.drafts || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    setIsLoadingOrg(true);
    fetch("/api/salesforce/flows")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setOrgFlows(data.flows || []);
      })
      .catch(() => {})
      .finally(() => setIsLoadingOrg(false));
  }, [isConnected]);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border-default px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Flows</h1>
            <p className="text-sm text-text-muted">
              Build and manage Salesforce Flows with AI
            </p>
          </div>
          <Link href="/flows/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Flow
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-8">
        {/* My Drafts */}
        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-3">My Drafts</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          ) : drafts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {drafts.map((draft) => (
                <Link key={draft.id} href={`/flows/${draft.id}`}>
                  <div className="group rounded-xl border border-border-default bg-bg-secondary p-5 hover:border-accent-electric/40 hover:bg-bg-tertiary transition-all cursor-pointer">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-electric/10">
                        <Workflow className="h-4 w-4 text-accent-electric" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-accent-electric transition-colors">
                          {draft.label}
                        </h3>
                        <p className="text-xs text-text-muted font-mono truncate">
                          {draft.apiName}
                        </p>
                      </div>
                    </div>
                    {draft.description && (
                      <p className="text-xs text-text-secondary line-clamp-2 mb-3">
                        {draft.description}
                      </p>
                    )}
                    <p className="text-xs text-text-muted">
                      Updated {new Date(draft.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <div className="rounded-2xl border border-border-default bg-bg-secondary p-6 max-w-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-electric/10 mx-auto mb-3">
                  <Zap className="h-5 w-5 text-accent-electric" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">No drafts yet</h3>
                <p className="text-xs text-text-secondary mb-4">
                  Create your first AI-generated Salesforce Flow.
                </p>
                <Link href="/flows/new">
                  <Button size="sm" className="gap-2">
                    <Plus className="h-3.5 w-3.5" />
                    Create Your First Flow
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Org Flows */}
        {isConnected && (
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-3">Org Flows</h2>
            {isLoadingOrg ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
              </div>
            ) : orgFlows.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {orgFlows.map((flow) => (
                  <div
                    key={flow.fullName}
                    className="rounded-xl border border-border-default bg-bg-secondary p-5"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                        <Workflow className="h-4 w-4 text-purple-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-text-primary truncate">
                          {flow.fullName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={
                              flow.isActive
                                ? "text-[10px] border-green-500/30 text-green-400"
                                : "text-[10px] border-text-muted/30 text-text-muted"
                            }
                          >
                            {flow.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {flow.processType && (
                            <Badge variant="outline" className="text-[10px]">
                              {flow.processType}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {flow.description && (
                      <p className="text-xs text-text-secondary line-clamp-2 mb-3">
                        {flow.description}
                      </p>
                    )}
                    {flow.lastModifiedByName && (
                      <p className="text-xs text-text-muted">
                        Modified by {flow.lastModifiedByName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-muted text-center py-8">
                No flows found in org
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
