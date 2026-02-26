"use client";

import { useOrgStore } from "@/stores/org-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { LogOut, RefreshCw } from "lucide-react";

export default function SettingsPage() {
  useSession();
  const { username, orgId, orgType, instanceUrl, displayName, isConnected } =
    useOrgStore();

  const handleDisconnect = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    window.location.href = "/auth/login";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border-default px-6 py-4">
        <h1 className="text-lg font-semibold text-text-primary">Settings</h1>
        <p className="text-sm text-text-muted">
          Org connection and preferences
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-6">
          {/* Connected Org */}
          <section className="rounded-xl border border-border-default bg-bg-secondary p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">
                Connected Org
              </h2>
              {isConnected && (
                <Badge variant={orgType === "sandbox" ? "warning" : "success"}>
                  {orgType}
                </Badge>
              )}
            </div>

            {isConnected ? (
              <div className="space-y-3">
                <InfoRow label="Username" value={username || "-"} />
                <InfoRow label="Display Name" value={displayName || "-"} />
                <InfoRow label="Org ID" value={orgId || "-"} mono />
                <InfoRow label="Instance" value={instanceUrl || "-"} mono />

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh Schema Cache
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-accent-red hover:text-accent-red"
                    onClick={handleDisconnect}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted">
                No org connected. Go to the login page to connect.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-muted">{label}</span>
      <span
        className={`text-sm text-text-primary ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
