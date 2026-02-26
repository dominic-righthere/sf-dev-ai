"use client";

import Link from "next/link";
import { Plus, Workflow, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/hooks/use-session";

export default function FlowsPage() {
  useSession();

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
        {/* Empty state */}
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="rounded-2xl border border-border-default bg-bg-secondary p-8 max-w-md">
            <Workflow className="h-12 w-12 text-text-muted mx-auto mb-4" />
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
      </div>
    </div>
  );
}
