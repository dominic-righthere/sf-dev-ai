"use client";

import { useState } from "react";
import { useOrgStore } from "@/stores/org-store";
import { useOrgsStore, type OrgConnection } from "@/stores/orgs-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/use-session";
import { LogOut, RefreshCw, Pencil, Check, X, Trash2, Circle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  useSession();
  const { username, orgId, orgType, instanceUrl, displayName, isConnected, orgConnectionId } =
    useOrgStore();
  const { orgs, updateOrgLabel, removeOrg } = useOrgsStore();

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

          {/* My Orgs */}
          {isConnected && (
            <section className="rounded-xl border border-border-default bg-bg-secondary p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">My Orgs</h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => window.location.href = "/api/auth/salesforce?orgType=production"}
                  >
                    <Plus className="h-3 w-3" />
                    Production
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => window.location.href = "/api/auth/salesforce?orgType=sandbox"}
                  >
                    <Plus className="h-3 w-3" />
                    Sandbox
                  </Button>
                </div>
              </div>

              {orgs.length === 0 ? (
                <p className="text-sm text-text-muted">No saved orgs yet.</p>
              ) : (
                <div className="space-y-2">
                  {orgs.map((conn) => (
                    <OrgRow
                      key={conn.id}
                      conn={conn}
                      isActive={conn.id === orgConnectionId}
                      onLabelSave={(label) => updateOrgLabel(conn.id, label)}
                      onDisconnect={() => removeOrg(conn.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function OrgRow({
  conn,
  isActive,
  onLabelSave,
  onDisconnect,
}: {
  conn: OrgConnection;
  isActive: boolean;
  onLabelSave: (label: string | null) => void;
  onDisconnect: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conn.orgLabel ?? "");

  async function saveLabel() {
    const label = draft.trim() || null;
    await fetch(`/api/orgs/${conn.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgLabel: label }),
    });
    onLabelSave(label);
    setEditing(false);
  }

  async function handleDisconnect() {
    await fetch(`/api/orgs/${conn.id}`, { method: "DELETE" });
    onDisconnect();
  }

  const displayLabel = conn.orgLabel ?? conn.displayName ?? conn.username;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border-default px-3 py-2.5",
        isActive && "border-accent-blue/40 bg-accent-blue/5"
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
        {editing ? (
          <div className="flex items-center gap-1">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveLabel();
                if (e.key === "Escape") setEditing(false);
              }}
              placeholder={conn.displayName ?? conn.username}
              className="h-6 text-sm"
              autoFocus
            />
            <button onClick={saveLabel} className="text-accent-blue hover:opacity-80">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setEditing(false)} className="text-text-muted hover:opacity-80">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <p className="truncate text-sm font-medium text-text-primary">{displayLabel}</p>
        )}
        <p className="truncate text-xs text-text-muted">{conn.username}</p>
      </div>

      <Badge variant={conn.orgType === "sandbox" ? "warning" : "success"} className="text-xs shrink-0">
        {conn.orgType}
      </Badge>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => { setDraft(conn.orgLabel ?? ""); setEditing(true); }}
          className="rounded p-1 text-text-muted hover:bg-bg-tertiary hover:text-text-secondary transition-colors"
          title="Edit label"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {!isActive && (
          <button
            onClick={handleDisconnect}
            className="rounded p-1 text-text-muted hover:bg-bg-tertiary hover:text-accent-red transition-colors"
            title="Disconnect"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
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
