"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Plus, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useOrgStore } from "@/stores/org-store";
import { useOrgsStore, type OrgConnection } from "@/stores/orgs-store";

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function OrgSwitcher() {
  const router = useRouter();
  const { orgConnectionId, orgType, username, displayName, orgId } = useOrgStore();
  const { orgs } = useOrgsStore();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  const currentLabel =
    orgs.find((o) => o.id === orgConnectionId)?.orgLabel ?? displayName ?? username ?? orgId ?? "Unknown Org";

  async function handleSwitch(conn: OrgConnection) {
    if (conn.id === orgConnectionId) {
      setOpen(false);
      return;
    }
    setSwitching(conn.id);
    try {
      const res = await fetch("/api/orgs/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgConnectionId: conn.id }),
      });
      const data = await res.json();
      if (data.error === "refresh_failed") {
        // Redirect to re-authenticate
        const orgTypeParam = conn.orgType;
        window.location.href = `/api/auth/salesforce?orgType=${orgTypeParam}`;
        return;
      }
      if (data.success) {
        setOpen(false);
        // Hard navigate to reset all store state
        window.location.href = "/dashboard";
      }
    } finally {
      setSwitching(null);
    }
  }

  function handleAddOrg(type: "production" | "sandbox") {
    setOpen(false);
    router.push(`/api/auth/salesforce?orgType=${type}`);
  }

  if (!orgConnectionId) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-text-muted hover:bg-bg-tertiary hover:text-text-secondary transition-all"
          title={`Active org: ${currentLabel}`}
        >
          <div className="relative flex items-center justify-center">
            <Circle
              className={cn(
                "h-4 w-4",
                orgType === "sandbox" ? "text-amber-400" : "text-emerald-400"
              )}
              fill="currentColor"
            />
            <ChevronDown className="absolute -bottom-1 -right-1 h-2.5 w-2.5 text-text-muted" />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent side="right" align="end" className="w-72">
        <p className="px-2 pb-1 pt-1 text-xs font-medium text-text-muted">Saved Orgs</p>

        <div className="space-y-0.5">
          {orgs.map((conn) => {
            const label = conn.orgLabel ?? conn.displayName ?? conn.username;
            const isActive = conn.id === orgConnectionId;
            const isSpinning = switching === conn.id;
            return (
              <button
                key={conn.id}
                onClick={() => handleSwitch(conn)}
                disabled={isSpinning}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
                  isActive
                    ? "bg-bg-tertiary text-text-primary"
                    : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                )}
              >
                <Circle
                  className={cn(
                    "h-2 w-2 shrink-0",
                    conn.orgType === "sandbox" ? "text-amber-400" : "text-emerald-400"
                  )}
                  fill="currentColor"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{label}</p>
                  <p className="truncate text-xs text-text-muted">{conn.username}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  {isActive && <Check className="h-3.5 w-3.5 text-accent-blue" />}
                  <span className="text-xs text-text-muted">{relativeTime(conn.lastUsedAt)}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-2 border-t border-border-default pt-2 space-y-0.5">
          <button
            onClick={() => handleAddOrg("production")}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Connect production org
          </button>
          <button
            onClick={() => handleAddOrg("sandbox")}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Connect sandbox org
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
