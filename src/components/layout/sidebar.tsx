"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Workflow, Search, Database, Shield, LayoutDashboard, Settings, Home, Users, ShieldCheck, Wrench, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrgSwitcher } from "@/components/layout/org-switcher";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/flows", label: "Flows", icon: Workflow },
  { href: "/query", label: "Query", icon: Search },
  { href: "/objects", label: "Objects", icon: Database },
  { href: "/permissions", label: "Permissions", icon: Shield },
  { href: "/rbac", label: "RBAC", icon: Users },
  { href: "/health", label: "Health", icon: ShieldCheck },
  { href: "/debt", label: "Tech Debt", icon: Wrench },
  { href: "/docs", label: "Docs", icon: BookOpen },
  { href: "/pages", label: "Pages", icon: LayoutDashboard },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-16 flex-col items-center border-r border-border-default bg-bg-secondary py-4 gap-1">
      <Link
        href="/dashboard"
        className="logo-hover mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-blue/15 text-accent-blue transition-all hover:bg-accent-blue/25"
        title="Home"
      >
        <Home className="h-5 w-5" />
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

      <OrgSwitcher />

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
