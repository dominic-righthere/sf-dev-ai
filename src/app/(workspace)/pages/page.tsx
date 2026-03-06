"use client";

import { LayoutDashboard } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useOrgStore } from "@/stores/org-store";
import { PageList } from "@/components/pages/page-list";
import Link from "next/link";

export default function LightningPagesPage() {
  useSession();
  const isConnected = useOrgStore((s) => s.isConnected);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="rounded-2xl border border-border-default bg-bg-secondary p-8 max-w-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 mx-auto mb-4">
            <LayoutDashboard className="h-6 w-6 text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">Connect a Salesforce org</h2>
          <p className="text-sm text-text-secondary mb-4">
            Connect a Salesforce org to view Lightning pages.
          </p>
          <Link href="/auth/login" className="text-sm text-accent-blue hover:underline">
            Connect now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border-default px-6 py-3">
        <h1 className="text-lg font-semibold text-text-primary">Lightning Pages</h1>
        <p className="text-sm text-text-muted">Browse FlexiPage metadata from your Salesforce org</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <PageList isConnected={isConnected} />
      </div>
    </div>
  );
}
