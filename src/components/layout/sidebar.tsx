"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Workflow, Search, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/flows", label: "Flows", icon: Workflow },
  { href: "/query", label: "Query", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-16 flex-col items-center border-r border-border-default bg-bg-secondary py-4 gap-1">
      <Link
        href="/flows"
        className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-blue/20 text-accent-blue"
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
              "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
              isActive
                ? "bg-bg-tertiary text-text-primary"
                : "text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
            )}
            title={item.label}
          >
            <item.icon className="h-5 w-5" />
          </Link>
        );
      })}
    </aside>
  );
}
