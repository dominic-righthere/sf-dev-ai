"use client";

import { UserCog, KeyRound, Users, Database } from "lucide-react";
import { useHealthStore } from "@/stores/health-store";
import type { Category, CategorySummary } from "@/lib/health/types";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<Category, typeof UserCog> = {
  profiles: UserCog,
  permissionSets: KeyRound,
  userAccess: Users,
  objectSecurity: Database,
};

export function CategoryCards() {
  const scanResult = useHealthStore((s) => s.scanResult);
  const selectedCategory = useHealthStore((s) => s.selectedCategory);
  const setSelectedCategory = useHealthStore((s) => s.setSelectedCategory);

  if (!scanResult) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {scanResult.categories.map((cat) => (
        <CategoryCard
          key={cat.category}
          summary={cat}
          isSelected={selectedCategory === cat.category}
          onClick={() =>
            setSelectedCategory(selectedCategory === cat.category ? null : cat.category)
          }
        />
      ))}
    </div>
  );
}

function CategoryCard({
  summary,
  isSelected,
  onClick,
}: {
  summary: CategorySummary;
  isSelected: boolean;
  onClick: () => void;
}) {
  const Icon = CATEGORY_ICONS[summary.category];
  const hasFindings = summary.findings.length > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-bg-secondary p-4 text-left transition-all hover:bg-bg-tertiary",
        isSelected ? "border-accent-blue ring-1 ring-accent-blue/20" : "border-border-default"
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-tertiary">
          <Icon className="h-4 w-4 text-text-secondary" />
        </div>
        <span className="text-sm font-medium text-text-primary">{summary.label}</span>
      </div>

      <div className="space-y-1.5">
        {hasFindings ? (
          <div className="flex flex-wrap gap-1">
            {summary.critical > 0 && (
              <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                {summary.critical} critical
              </span>
            )}
            {summary.high > 0 && (
              <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-400">
                {summary.high} high
              </span>
            )}
            {summary.medium > 0 && (
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                {summary.medium} medium
              </span>
            )}
            {summary.low > 0 && (
              <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                {summary.low} low
              </span>
            )}
            {summary.info > 0 && (
              <span className="rounded bg-gray-500/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                {summary.info} info
              </span>
            )}
          </div>
        ) : (
          <span className="inline-flex rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
            All clear
          </span>
        )}
        <p className="text-xs text-text-muted">
          {summary.passedChecks}/{summary.totalChecks} passed
        </p>
      </div>
    </button>
  );
}
