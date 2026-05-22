"use client";

import Link from "next/link";
import { Clock, Workflow } from "lucide-react";

interface Draft {
  id: string;
  label: string;
  apiName: string;
  updatedAt: string;
}

interface RecentActivityCardProps {
  drafts: Draft[];
}

export function RecentActivityCard({ drafts }: RecentActivityCardProps) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-secondary p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-accent-blue" />
        <h3 className="text-sm font-semibold text-text-primary">Recent Drafts</h3>
      </div>
      {drafts.length > 0 ? (
        <div className="space-y-2">
          {drafts.slice(0, 5).map((draft) => (
            <Link
              key={draft.id}
              href={`/flows/${draft.id}`}
              className="flex items-center gap-3 rounded-lg p-2 hover:bg-bg-tertiary transition-colors"
            >
              <Workflow className="h-3.5 w-3.5 text-accent-electric shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text-primary truncate">{draft.label}</div>
                <div className="text-[11px] text-text-muted font-mono truncate">{draft.apiName}</div>
              </div>
              <div className="text-[11px] text-text-muted shrink-0">
                {new Date(draft.updatedAt).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-xs text-text-muted text-center py-4">No recent drafts</div>
      )}
    </div>
  );
}
