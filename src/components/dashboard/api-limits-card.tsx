"use client";

import { Activity } from "lucide-react";

interface LimitData {
  Max: number;
  Remaining: number;
}

interface ApiLimitsCardProps {
  limits: Record<string, LimitData | undefined>;
}

function LimitBar({ label, data }: { label: string; data?: LimitData }) {
  if (!data) return null;
  const used = data.Max - data.Remaining;
  const pct = data.Max > 0 ? (used / data.Max) * 100 : 0;
  const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-accent-blue";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="text-[11px] text-text-muted font-mono">
          {used.toLocaleString()} / {data.Max.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-primary overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

export function ApiLimitsCard({ limits }: ApiLimitsCardProps) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-secondary p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-accent-blue" />
        <h3 className="text-sm font-semibold text-text-primary">API Limits</h3>
      </div>
      <div className="space-y-3">
        <LimitBar label="Daily API Requests" data={limits.DailyApiRequests} />
        <LimitBar label="Data Storage (MB)" data={limits.DataStorageMB} />
        <LimitBar label="File Storage (MB)" data={limits.FileStorageMB} />
        <LimitBar label="Single Email" data={limits.SingleEmail} />
      </div>
    </div>
  );
}
