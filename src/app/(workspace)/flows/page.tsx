"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Zap, Loader2, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";

interface FlowDraft {
  id: string;
  apiName: string;
  label: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function FlowsPage() {
  useSession();
  const [drafts, setDrafts] = useState<FlowDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/flows")
      .then((r) => r.json())
      .then((data) => setDrafts(data.drafts || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

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

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
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
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="rounded-2xl border border-border-default bg-bg-secondary p-8 max-w-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-electric/10 mx-auto mb-4">
                <Zap className="h-6 w-6 text-accent-electric" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                No flows yet
              </h2>
              <p className="text-sm text-text-secondary mb-6">
                Create your first AI-generated Salesforce Flow. Describe what you
                want in natural language and watch it build in real-time.
              </p>
              <Link href="/flows/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Flow
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
