"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Workflow, Search, Database, Shield, LayoutDashboard, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/flows", label: "Flows", icon: Workflow },
  { href: "/query", label: "Query", icon: Search },
  { href: "/objects", label: "Objects", icon: Database },
  { href: "/permissions", label: "Permissions", icon: Shield },
  { href: "/pages", label: "Pages", icon: LayoutDashboard },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-16 flex-col items-center border-r border-border-default bg-bg-secondary py-4 gap-1">
      <Link
        href="/flows"
        className="logo-hover mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-blue/15 text-accent-blue transition-all hover:bg-accent-blue/25"
      >
        <Zap className="h-5 w-5" />
      </Link>

      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-lg transition-all",
              isActive
                ? "sidebar-active-glow bg-bg-tertiary text-accent-blue"
                : "text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
            )}
            title={item.label}
          >
            <item.icon className="h-5 w-5" />
          </Link>
        );
      })}

      <div className="flex-1" />

      <Link
        href="/settings"
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-lg transition-all",
          pathname.startsWith("/settings")
            ? "sidebar-active-glow bg-bg-tertiary text-accent-blue"
            : "text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
        )}
        title="Settings"
      >
        <Settings className="h-5 w-5" />
      </Link>
    </aside>
  );
}
