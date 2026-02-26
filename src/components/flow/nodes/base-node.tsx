"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { FlowElement } from "@/lib/flow/types";
import { useUIStore } from "@/stores/ui-store";

interface BaseNodeData {
  element: FlowElement;
  label: string;
}

const nodeColors: Record<string, string> = {
  start: "border-node-start bg-node-start/10",
  screen: "border-node-screen bg-node-screen/10",
  decision: "border-node-decision bg-node-decision/10",
  assignment: "border-node-assignment bg-node-assignment/10",
  recordcreate: "border-node-record-create bg-node-record-create/10",
  recordupdate: "border-node-record-update bg-node-record-update/10",
  recordlookup: "border-node-record-lookup bg-node-record-lookup/10",
  recorddelete: "border-node-record-delete bg-node-record-delete/10",
  loop: "border-node-loop bg-node-loop/10",
  actioncall: "border-node-action bg-node-action/10",
  subflow: "border-node-subflow bg-node-subflow/10",
  wait: "border-node-wait bg-node-wait/10",
};

const nodeIcons: Record<string, string> = {
  Start: "▶",
  Screen: "🖥",
  Decision: "◆",
  Assignment: "=",
  RecordCreate: "+",
  RecordUpdate: "↑",
  RecordLookup: "🔍",
  RecordDelete: "✕",
  Loop: "↻",
  ActionCall: "⚡",
  Subflow: "↗",
  Wait: "⏳",
};

export function BaseFlowNode({ data, selected }: NodeProps) {
  const { element, label } = data as unknown as BaseNodeData;
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const colorClass = nodeColors[element.type.toLowerCase()] || "border-border-default bg-bg-secondary";

  return (
    <div
      className={cn(
        "flow-node-appear rounded-xl border-2 px-4 py-3 shadow-lg min-w-[200px] max-w-[280px] cursor-pointer transition-all",
        colorClass,
        selected && "ring-2 ring-accent-blue ring-offset-2 ring-offset-bg-primary"
      )}
      onClick={() => setSelectedNodeId(element.id)}
    >
      <Handle type="target" position={Position.Top} className="!bg-text-muted !w-2 !h-2" />

      <div className="flex items-center gap-2">
        <span className="text-lg" role="img" aria-label={element.type}>
          {nodeIcons[element.type] || "●"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono text-text-muted uppercase tracking-wider">
            {element.type}
          </div>
          <div className="text-sm font-medium text-text-primary truncate">
            {label}
          </div>
        </div>
      </div>

      {element.type === "Screen" && "fields" in element && (
        <div className="mt-2 space-y-1 border-t border-border-subtle pt-2">
          {(element.fields || []).slice(0, 3).map((field: any) => (
            <div key={field.id} className="text-xs text-text-secondary truncate">
              {field.label || field.name} · {field.fieldType}
            </div>
          ))}
          {(element.fields || []).length > 3 && (
            <div className="text-xs text-text-muted">
              +{element.fields.length - 3} more fields
            </div>
          )}
        </div>
      )}

      {element.type === "Decision" && "rules" in element && (
        <div className="mt-2 space-y-1 border-t border-border-subtle pt-2">
          {(element.rules || []).map((rule: any) => (
            <div key={rule.name} className="text-xs text-text-secondary truncate">
              {rule.label}
            </div>
          ))}
        </div>
      )}

      {element.type === "RecordLookup" && "object" in element && (
        <div className="mt-1 text-xs font-mono text-text-muted">
          {element.object}
        </div>
      )}

      {(element.type === "RecordCreate" || element.type === "RecordUpdate" || element.type === "RecordDelete") &&
        "object" in element && (
          <div className="mt-1 text-xs font-mono text-text-muted">
            {element.object}
          </div>
        )}

      <Handle type="source" position={Position.Bottom} className="!bg-text-muted !w-2 !h-2" />

      {/* Extra handles for Decision (multiple outputs) */}
      {element.type === "Decision" && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="default"
            className="!bg-text-muted !w-2 !h-2"
          />
        </>
      )}

      {/* Extra handles for Loop */}
      {element.type === "Loop" && (
        <Handle
          type="source"
          position={Position.Right}
          id="noMoreValues"
          className="!bg-text-muted !w-2 !h-2"
        />
      )}
    </div>
  );
}
