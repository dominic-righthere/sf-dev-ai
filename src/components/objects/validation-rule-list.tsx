"use client";

import { CheckCircle2, XCircle, Code2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { ValidationRule } from "@/stores/objects-store";
import { useState } from "react";

export function ValidationRuleList({ rules }: { rules: ValidationRule[] }) {
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted text-xs">
        <Code2 className="h-5 w-5 mb-2" />
        No validation rules found
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border-subtle">
        {rules.map((rule) => (
          <div key={rule.fullName} className="px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              {rule.active ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-text-muted shrink-0" />
              )}
              <span className="text-xs font-medium text-text-primary font-mono">
                {rule.fullName.split(".").pop()}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1 py-0 ${rule.active ? "text-green-400 border-green-400/30" : "text-text-muted"}`}
              >
                {rule.active ? "Active" : "Inactive"}
              </Badge>
            </div>

            {rule.description && (
              <p className="text-[11px] text-text-secondary ml-5.5 mb-1">{rule.description}</p>
            )}

            <div className="ml-5.5 space-y-1">
              <div className="text-[11px] text-text-muted">
                Error: <span className="text-accent-red">{rule.errorMessage}</span>
                {rule.errorDisplayField && (
                  <span className="ml-1 text-text-muted">on {rule.errorDisplayField}</span>
                )}
              </div>

              <button
                onClick={() => setExpandedRule(expandedRule === rule.fullName ? null : rule.fullName)}
                className="text-[11px] text-accent-blue hover:underline"
              >
                {expandedRule === rule.fullName ? "Hide formula" : "Show formula"}
              </button>

              {expandedRule === rule.fullName && (
                <pre className="mt-1 rounded-md bg-bg-primary border border-border-default p-2 text-[11px] font-mono text-text-secondary overflow-x-auto whitespace-pre-wrap">
                  {rule.errorConditionFormula}
                </pre>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
