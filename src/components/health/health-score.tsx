"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHealthStore } from "@/stores/health-store";
import { cn } from "@/lib/utils";

const GRADE_COLORS: Record<string, string> = {
  A: "text-emerald-400",
  B: "text-blue-400",
  C: "text-amber-400",
  D: "text-orange-400",
  F: "text-red-400",
};

const GRADE_RING_COLORS: Record<string, string> = {
  A: "stroke-emerald-400",
  B: "stroke-blue-400",
  C: "stroke-amber-400",
  D: "stroke-orange-400",
  F: "stroke-red-400",
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function HealthScore({ onScan }: { onScan: () => void }) {
  const scanResult = useHealthStore((s) => s.scanResult);
  const isScanning = useHealthStore((s) => s.isScanning);
  const fromCache = useHealthStore((s) => s.fromCache);

  if (!scanResult) {
    return (
      <div className="rounded-xl border border-border-default bg-bg-secondary p-8 flex flex-col items-center gap-4">
        <p className="text-sm text-text-muted">No scan data available</p>
        <Button onClick={onScan} disabled={isScanning} variant="default" size="sm">
          {isScanning ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Run Scan
        </Button>
      </div>
    );
  }

  const { score, grade, scannedAt, totalChecks, passedChecks, findings } = scanResult;
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  const criticals = findings.filter((f) => f.severity === "critical").length;
  const highs = findings.filter((f) => f.severity === "high").length;
  const mediums = findings.filter((f) => f.severity === "medium").length;
  const lows = findings.filter((f) => f.severity === "low").length;
  const infos = findings.filter((f) => f.severity === "info").length;

  return (
    <div className="rounded-xl border border-border-default bg-bg-secondary p-5">
      <div className="flex items-center gap-6">
        <div className="relative flex-shrink-0">
          <svg width="128" height="128" viewBox="0 0 128 128">
            <circle
              cx="64"
              cy="64"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-bg-tertiary"
            />
            <circle
              cx="64"
              cy="64"
              r="54"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={cn("transition-all duration-700", GRADE_RING_COLORS[grade])}
              transform="rotate(-90 64 64)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-3xl font-bold", GRADE_COLORS[grade])}>{grade}</span>
            <span className="text-xs text-text-muted">{score}/100</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-text-secondary">
              {passedChecks}/{totalChecks} checks passed
            </span>
            <span className="text-xs text-text-muted">
              {fromCache ? "cached" : "fresh"} &middot; {formatRelativeTime(scannedAt)}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {criticals > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
                {criticals} critical
              </span>
            )}
            {highs > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-400">
                {highs} high
              </span>
            )}
            {mediums > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
                {mediums} medium
              </span>
            )}
            {lows > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
                {lows} low
              </span>
            )}
            {infos > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-2.5 py-1 text-xs font-medium text-gray-400">
                {infos} info
              </span>
            )}
            {findings.length === 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                All clear
              </span>
            )}
          </div>

          <Button onClick={onScan} disabled={isScanning} variant="outline" size="sm">
            {isScanning ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
            )}
            Scan Now
          </Button>
        </div>
      </div>
    </div>
  );
}
