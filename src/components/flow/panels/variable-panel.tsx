"use client";

import { X, Variable } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUIStore } from "@/stores/ui-store";
import { useFlowStore } from "@/stores/flow-store";

export function VariablePanel() {
  const { variablePanelOpen, setVariablePanelOpen } = useUIStore();
  const flow = useFlowStore((s) => s.flow);

  if (!variablePanelOpen || !flow) return null;

  return (
    <div className="absolute top-0 left-16 h-full w-72 border-r border-border-default bg-bg-secondary z-20">
      <div className="flex items-center justify-between border-b border-border-default p-3">
        <div className="flex items-center gap-2">
          <Variable className="h-4 w-4 text-text-muted" />
          <span className="text-sm font-medium text-text-primary">
            Variables ({flow.variables.length})
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-text-muted"
          onClick={() => setVariablePanelOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100%-48px)]">
        <div className="p-3 space-y-2">
          {flow.variables.length === 0 ? (
            <div className="text-xs text-text-muted text-center py-8">
              No variables defined.
              <br />
              Variables will appear here as the AI creates them.
            </div>
          ) : (
            flow.variables.map((v) => (
              <div
                key={v.name}
                className="rounded-lg border border-border-subtle p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-text-primary">
                    {v.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {v.dataType}
                  </Badge>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {v.isCollection && (
                    <Badge variant="outline" className="text-[10px]">
                      Collection
                    </Badge>
                  )}
                  {v.isInput && (
                    <Badge variant="outline" className="text-[10px]">
                      Input
                    </Badge>
                  )}
                  {v.isOutput && (
                    <Badge variant="outline" className="text-[10px]">
                      Output
                    </Badge>
                  )}
                </div>
                {v.objectType && (
                  <div className="text-xs text-text-muted font-mono">
                    {v.objectType}
                  </div>
                )}
                {v.description && (
                  <div className="text-xs text-text-muted">{v.description}</div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
