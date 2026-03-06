"use client";

import { useState } from "react";
import { Loader2, Box, ArrowRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useObjectsStore } from "@/stores/objects-store";
import { FieldTable } from "./field-table";
import { FieldBuilder } from "./field-builder";
import { ValidationRuleList } from "./validation-rule-list";
import { ValidationRuleBuilder } from "./validation-rule-builder";
import { cn } from "@/lib/utils";

export function ObjectDetail() {
  const selectedObjectName = useObjectsStore((s) => s.selectedObjectName);
  const detail = useObjectsStore((s) => s.selectedObjectDetail);
  const detailTab = useObjectsStore((s) => s.detailTab);
  const isLoadingDetail = useObjectsStore((s) => s.isLoadingDetail);
  const setDetailTab = useObjectsStore((s) => s.setDetailTab);
  const setSelectedObjectName = useObjectsStore((s) => s.setSelectedObjectName);

  const [showFieldBuilder, setShowFieldBuilder] = useState(false);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);

  if (!selectedObjectName) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-xs">
        Select an object to view details
      </div>
    );
  }

  if (isLoadingDetail) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!detail) return null;

  const tabs = [
    { id: "fields" as const, label: "Fields", count: detail.fields.length },
    { id: "validationRules" as const, label: "Validation Rules", count: detail.validationRules.length },
    { id: "relationships" as const, label: "Relationships", count: detail.childRelationships.length },
  ];

  const handleRefresh = () => {
    // Re-trigger detail fetch by toggling selection
    const name = selectedObjectName;
    setSelectedObjectName(null);
    setTimeout(() => setSelectedObjectName(name), 0);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center gap-2 mb-1">
          <Box className="h-4 w-4 text-accent-blue" />
          <h2 className="text-sm font-semibold text-text-primary">{detail.label}</h2>
          {detail.custom && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">Custom</Badge>
          )}
          <div className="ml-auto flex gap-1">
            {detailTab === "fields" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 h-7"
                onClick={() => setShowFieldBuilder(true)}
              >
                <Plus className="h-3 w-3" /> New Field
              </Button>
            )}
            {detailTab === "validationRules" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 h-7"
                onClick={() => setShowRuleBuilder(true)}
              >
                <Plus className="h-3 w-3" /> New Rule
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          <span className="font-mono">{detail.name}</span>
          {detail.keyPrefix && <span>Prefix: {detail.keyPrefix}</span>}
          <span>{detail.fields.length} fields</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-default px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setDetailTab(tab.id)}
            className={cn(
              "px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
              detailTab === tab.id
                ? "border-accent-blue text-accent-blue"
                : "border-transparent text-text-muted hover:text-text-secondary"
            )}
          >
            {tab.label}
            <span className="ml-1.5 text-[10px] text-text-muted">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {detailTab === "fields" && <FieldTable fields={detail.fields} />}
        {detailTab === "validationRules" && <ValidationRuleList rules={detail.validationRules} />}
        {detailTab === "relationships" && (
          <ScrollArea className="h-full">
            {detail.childRelationships.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-text-muted text-xs">
                No child relationships
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {detail.childRelationships.map((rel, i) => (
                  <div key={`${rel.childSObject}-${rel.field}-${i}`} className="px-4 py-2 flex items-center gap-2 text-xs">
                    <span className="font-mono text-text-primary">{detail.name}</span>
                    <ArrowRight className="h-3 w-3 text-text-muted" />
                    <span className="font-mono text-blue-400">{rel.childSObject}</span>
                    <span className="text-text-muted">via</span>
                    <span className="font-mono text-text-secondary">{rel.field}</span>
                    {rel.relationshipName && (
                      <span className="text-text-muted ml-auto text-[11px]">{rel.relationshipName}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </div>

      {/* Builder modals */}
      {showFieldBuilder && (
        <FieldBuilder
          objectName={detail.name}
          onClose={() => setShowFieldBuilder(false)}
          onSuccess={handleRefresh}
        />
      )}
      {showRuleBuilder && (
        <ValidationRuleBuilder
          objectName={detail.name}
          onClose={() => setShowRuleBuilder(false)}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
