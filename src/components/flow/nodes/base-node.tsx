"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Play,
  Monitor,
  GitBranch,
  Variable,
  FilePlus2,
  FileEdit,
  Search,
  FileX2,
  Repeat,
  Zap,
  GitFork,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlowElement } from "@/lib/flow/types";
import { useUIStore } from "@/stores/ui-store";

interface BaseNodeData {
  element: FlowElement;
  label: string;
}

const nodeAccentColors: Record<string, string> = {
  start: "border-l-node-start bg-node-start/8",
  screen: "border-l-node-screen bg-node-screen/8",
  decision: "border-l-node-decision bg-node-decision/8",
  assignment: "border-l-node-assignment bg-node-assignment/8",
  recordcreate: "border-l-node-record-create bg-node-record-create/8",
  recordupdate: "border-l-node-record-update bg-node-record-update/8",
  recordlookup: "border-l-node-record-lookup bg-node-record-lookup/8",
  recorddelete: "border-l-node-record-delete bg-node-record-delete/8",
  loop: "border-l-node-loop bg-node-loop/8",
  actioncall: "border-l-node-action bg-node-action/8",
  subflow: "border-l-node-subflow bg-node-subflow/8",
  wait: "border-l-node-wait bg-node-wait/8",
};

const nodeIconColors: Record<string, string> = {
  start: "text-node-start",
  screen: "text-node-screen",
  decision: "text-node-decision",
  assignment: "text-node-assignment",
  recordcreate: "text-node-record-create",
  recordupdate: "text-node-record-update",
  recordlookup: "text-node-record-lookup",
  recorddelete: "text-node-record-delete",
  loop: "text-node-loop",
  actioncall: "text-node-action",
  subflow: "text-node-subflow",
  wait: "text-node-wait",
};

const nodeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Start: Play,
  Screen: Monitor,
  Decision: GitBranch,
  Assignment: Variable,
  RecordCreate: FilePlus2,
  RecordUpdate: FileEdit,
  RecordLookup: Search,
  RecordDelete: FileX2,
  Loop: Repeat,
  ActionCall: Zap,
  Subflow: GitFork,
  Wait: Clock,
};

export function BaseFlowNode({ data, selected }: NodeProps) {
  const { element, label } = data as unknown as BaseNodeData;
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const accentClass = nodeAccentColors[element.type.toLowerCase()] || "border-l-border-default bg-bg-secondary";
  const iconColorClass = nodeIconColors[element.type.toLowerCase()] || "text-text-muted";
  const IconComponent = nodeIcons[element.type];

  return (
    <div
      className={cn(
        "flow-node-appear rounded-lg border border-border-default border-l-[3px] px-4 py-3 shadow-lg min-w-[200px] max-w-[280px] cursor-pointer transition-all bg-bg-secondary",
        accentClass,
        selected && "ring-2 ring-accent-blue/50 ring-offset-2 ring-offset-bg-primary"
      )}
      onClick={() => setSelectedNodeId(element.id)}
    >
      <Handle type="target" position={Position.Top} className="!bg-text-muted !w-2 !h-2" />

      <div className="flex items-center gap-2.5">
        <div className={cn("shrink-0", iconColorClass)}>
          {IconComponent ? (
            <IconComponent className="h-4 w-4" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
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
