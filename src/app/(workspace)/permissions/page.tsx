"use client";

import { Shield } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useOrgStore } from "@/stores/org-store";
import Link from "next/link";

export default function PermissionsPage() {
  useSession();
  const isConnected = useOrgStore((s) => s.isConnected);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border-default px-6 py-4">
        <h1 className="text-lg font-semibold text-text-primary">Permissions Manager</h1>
        <p className="text-sm text-text-muted">
          Analyze and manage Salesforce permission sets and profiles
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="rounded-2xl border border-border-default bg-bg-secondary p-8 max-w-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 mx-auto mb-4">
              <Shield className="h-6 w-6 text-purple-400" />
            </div>
            {isConnected ? (
              <>
                <h2 className="text-lg font-semibold text-text-primary mb-2">
                  Permissions Manager
                </h2>
                <p className="text-sm text-text-secondary">
                  View permission sets, profiles, and field-level security across your org.
                  Coming soon.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-text-primary mb-2">
                  Connect a Salesforce org
                </h2>
                <p className="text-sm text-text-secondary mb-4">
                  Connect a Salesforce org to manage permissions.
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
