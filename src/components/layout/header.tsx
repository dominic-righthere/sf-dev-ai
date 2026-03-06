"use client";

import Link from "next/link";
import { useOrgStore } from "@/stores/org-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command as CommandIcon, LogOut, PlugZap } from "lucide-react";

export function Header() {
  const { username, orgType, isConnected } = useOrgStore();

  return (
    <header className="flex h-12 items-center justify-between border-b border-border-default bg-bg-secondary px-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tracking-tight text-text-primary">
          SF Dev AI
        </span>
        {isConnected ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75 connection-syncing" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-green" />
              </span>
              <Badge variant={orgType === "sandbox" ? "warning" : "success"}>
                {orgType}
              </Badge>
            </div>
            <span className="text-xs text-text-muted font-mono tracking-tight">
              {username}
            </span>
          </div>
        ) : (
          <Link href="/auth/login">
            <Badge variant="secondary" className="gap-1.5 cursor-pointer hover:bg-bg-tertiary">
              <PlugZap className="h-3 w-3" />
              Connect Org
            </Badge>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-text-muted font-mono"
          onClick={() => {
            const event = new KeyboardEvent("keydown", {
              key: "k",
              metaKey: true,
            });
            document.dispatchEvent(event);
          }}
        >
          <CommandIcon className="h-3 w-3" />
          <span className="text-xs">K</span>
        </Button>
        {isConnected && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-text-muted"
            onClick={() => {
              window.location.href = "/auth/login";
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
