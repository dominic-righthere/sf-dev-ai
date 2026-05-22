"use client";

import Link from "next/link";
import { Plus, Search, Database, Workflow } from "lucide-react";

const actions = [
  { href: "/flows/new", label: "New Flow", icon: Plus, color: "text-accent-electric" },
  { href: "/query", label: "Run Query", icon: Search, color: "text-green-400" },
  { href: "/objects", label: "Browse Objects", icon: Database, color: "text-amber-400" },
  { href: "/flows", label: "My Flows", icon: Workflow, color: "text-purple-400" },
];

export function QuickActions() {
  return (
    <div className="rounded-xl border border-border-default bg-bg-secondary p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-2 rounded-lg bg-bg-primary border border-border-default p-3 hover:border-accent-blue/40 hover:bg-bg-tertiary transition-all"
          >
            <action.icon className={`h-4 w-4 ${action.color}`} />
            <span className="text-xs font-medium text-text-primary">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
