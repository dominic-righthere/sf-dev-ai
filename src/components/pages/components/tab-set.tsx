"use client";

import * as Tabs from "@radix-ui/react-tabs";
import type { ParsedComponentNode } from "@/lib/flexipage/types";
import { RenderChildren } from "./component-renderer";

export function TabSet({ component }: { component: ParsedComponentNode }) {
  const tabs = component.children;

  if (tabs.length === 0) {
    return (
      <div className="rounded-lg border border-border-default bg-bg-secondary p-4 text-xs text-text-muted">
        TabSet (no tabs resolved)
      </div>
    );
  }

  return (
    <Tabs.Root defaultValue={tabs[0]!.id} className="rounded-lg border border-border-default bg-bg-secondary overflow-hidden">
      <Tabs.List className="flex border-b border-border-default">
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.id}
            value={tab.id}
            className="px-4 py-2 text-xs font-medium transition-colors text-text-muted hover:text-text-primary data-[state=active]:text-accent-blue data-[state=active]:border-b-2 data-[state=active]:border-accent-blue"
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {tabs.map((tab) => (
        <Tabs.Content key={tab.id} value={tab.id} className="p-4 space-y-3">
          {tab.children.length > 0 ? (
            <RenderChildren children={tab.children} />
          ) : (
            <div className="text-xs text-text-muted">Empty tab</div>
          )}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
