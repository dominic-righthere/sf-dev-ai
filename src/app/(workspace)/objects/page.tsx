"use client";

import { Database, Search } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useOrgStore } from "@/stores/org-store";
import Link from "next/link";

export default function ObjectsPage() {
  useSession();
  const isConnected = useOrgStore((s) => s.isConnected);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border-default px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Object Explorer</h1>
            <p className="text-sm text-text-muted">
              Browse and inspect Salesforce object schemas
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search objects..."
              disabled={!isConnected}
              className="rounded-lg border border-border-default bg-bg-secondary pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="rounded-2xl border border-border-default bg-bg-secondary p-8 max-w-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-blue/10 mx-auto mb-4">
              <Database className="h-6 w-6 text-accent-blue" />
            </div>
            {isConnected ? (
              <>
                <h2 className="text-lg font-semibold text-text-primary mb-2">
                  Object Explorer
                </h2>
                <p className="text-sm text-text-secondary">
                  Browse your Salesforce objects, view field details, and understand
                  relationships. Coming soon.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-text-primary mb-2">
                  Connect a Salesforce org
                </h2>
                <p className="text-sm text-text-secondary mb-4">
                  Connect a Salesforce org to explore your object schemas.
                </p>
                <Link
                  href="/auth/login"
                  className="text-sm text-accent-blue hover:underline"
                >
                  Connect now
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
