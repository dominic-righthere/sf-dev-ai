"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUIStore } from "@/stores/ui-store";
import { useFlowStore } from "@/stores/flow-store";
import type { FlowElement } from "@/lib/flow/types";

export function NodeInspector() {
  const { inspectorOpen, selectedNodeId, setInspectorOpen, setSelectedNodeId } =
    useUIStore();
  const flow = useFlowStore((s) => s.flow);

  if (!inspectorOpen || !selectedNodeId || !flow) return null;

  const element = flow.elements.get(selectedNodeId);
  if (!element) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-80 border-l border-border-default bg-bg-secondary z-20">
      <div className="flex items-center justify-between border-b border-border-default p-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {element.type}
          </Badge>
          <span className="text-sm font-medium text-text-primary truncate">
            {element.label}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-text-muted"
          onClick={() => {
            setInspectorOpen(false);
            setSelectedNodeId(null);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100%-48px)]">
        <div className="p-4 space-y-4">
          <Field label="ID" value={element.id} mono />
          <Field label="Name" value={element.name} mono />
          <Field label="Label" value={element.label} />
          {element.description && (
            <Field label="Description" value={element.description} />
          )}

          {renderTypeSpecificFields(element)}
        </div>
      </ScrollArea>
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-text-muted mb-1">{label}</div>
      <div
        className={`text-sm text-text-primary ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function renderTypeSpecificFields(element: FlowElement) {
  switch (element.type) {
    case "Screen":
      return (
        <div className="space-y-3">
          <div className="text-xs text-text-muted font-medium uppercase tracking-wider">
            Screen Fields
          </div>
          {(element.fields ?? []).map((field) => (
            <div
              key={field.id}
              className="rounded-lg border border-border-subtle p-2 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-primary">{field.label || field.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {field.fieldType}
                </Badge>
              </div>
              {field.required && (
                <span className="text-[10px] text-accent-amber">Required</span>
              )}
            </div>
          ))}
          <div className="space-y-1 text-xs text-text-muted">
            <div>Allow Back: {element.allowBack ? "Yes" : "No"}</div>
            <div>Allow Finish: {element.allowFinish ? "Yes" : "No"}</div>
            <div>Show Footer: {element.showFooter ? "Yes" : "No"}</div>
          </div>
        </div>
      );

    case "Decision":
      return (
        <div className="space-y-3">
          <div className="text-xs text-text-muted font-medium uppercase tracking-wider">
            Decision Rules
          </div>
          {(element.rules ?? []).map((rule) => (
            <div
              key={rule.name}
              className="rounded-lg border border-border-subtle p-2 space-y-1"
            >
              <span className="text-sm text-text-primary">{rule.label}</span>
              <div className="text-xs text-text-muted">
                Logic: {rule.conditionLogic}
              </div>
              {(rule.conditions ?? []).map((c, i) => (
                <div key={i} className="text-xs font-mono text-text-secondary">
                  {c.leftValueReference} {c.operator}{" "}
                  {c.rightValue?.stringValue ||
                    c.rightValue?.numberValue ||
                    c.rightValue?.elementReference ||
                    "null"}
                </div>
              ))}
            </div>
          ))}
          <Field label="Default Outcome" value={element.defaultConnectorLabel} />
        </div>
      );

    case "RecordCreate":
    case "RecordUpdate":
      return (
        <div className="space-y-3">
          <Field label="Object" value={element.object} mono />
          <div className="text-xs text-text-muted font-medium uppercase tracking-wider">
            Field Assignments
          </div>
          {(element.inputAssignments ?? []).map((ia, i) => (
            <div key={i} className="text-xs font-mono text-text-secondary">
              {ia.field} ={" "}
              {ia.value.elementReference ||
                ia.value.stringValue ||
                ia.value.numberValue?.toString() ||
                "null"}
            </div>
          ))}
        </div>
      );

    case "RecordLookup":
      return (
        <div className="space-y-3">
          <Field label="Object" value={element.object} mono />
          <div className="text-xs text-text-muted">
            First Record Only: {element.getFirstRecordOnly ? "Yes" : "No"}
          </div>
          <div className="text-xs text-text-muted font-medium uppercase tracking-wider">
            Filters
          </div>
          {(element.filters ?? []).map((f, i) => (
            <div key={i} className="text-xs font-mono text-text-secondary">
              {f.field} {f.operator}{" "}
              {f.value.elementReference ||
                f.value.stringValue ||
                f.value.numberValue?.toString() ||
                "null"}
            </div>
          ))}
        </div>
      );

    case "Assignment":
      return (
        <div className="space-y-3">
          <div className="text-xs text-text-muted font-medium uppercase tracking-wider">
            Assignments
          </div>
          {(element.assignmentItems ?? []).map((a, i) => (
            <div key={i} className="text-xs font-mono text-text-secondary">
              {a.assignToReference} {a.operator}{" "}
              {a.value.elementReference ||
                a.value.stringValue ||
                a.value.numberValue?.toString() ||
                "null"}
            </div>
          ))}
        </div>
      );

    case "Loop":
      return (
        <div className="space-y-3">
          <Field label="Collection" value={element.collectionReference} mono />
          <Field label="Iteration Order" value={element.iterationOrder} />
        </div>
      );

    default:
      return null;
  }
}
