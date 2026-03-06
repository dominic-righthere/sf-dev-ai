"use client";

import { useCallback, useMemo, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
} from "@xyflow/react";
import { useFlowStore } from "@/stores/flow-store";
import { useUIStore } from "@/stores/ui-store";
import { flowToReactFlow } from "@/lib/flow/converter";
import { nodeTypes } from "./nodes";

export function FlowCanvas() {
  const flow = useFlowStore((s) => s.flow);
  const isGenerating = useFlowStore((s) => s.isGenerating);
  const selectedNodeId = useUIStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const reactFlowInstance = useReactFlow();
  const wasGeneratingRef = useRef(false);

  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    if (!flow) return { nodes: [], edges: [] };
    return flowToReactFlow(flow);
  }, [flow]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Sync flow store changes to React Flow state
  useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  // fitView only when generation completes (true→false transition)
  useEffect(() => {
    if (wasGeneratingRef.current && !isGenerating) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
      }, 50);
    }
    wasGeneratingRef.current = isGenerating;
  }, [isGenerating, reactFlowInstance]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (isGenerating) return;
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId, isGenerating]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={isGenerating ? undefined : onNodesChange}
        onEdgesChange={isGenerating ? undefined : onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={!isGenerating}
        panOnDrag={!isGenerating}
        zoomOnScroll={!isGenerating}
        zoomOnPinch={!isGenerating}
        zoomOnDoubleClick={!isGenerating}
        elementsSelectable={!isGenerating}
        nodesConnectable={!isGenerating}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
          style: { stroke: "#1e2a42", strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={24}
          lineWidth={0.5}
          color="#141d30"
        />
        {!isGenerating && (
          <>
            <Controls
              position="top-left"
              showInteractive={false}
            />
            <MiniMap
              position="top-left"
              style={{ top: 140 }}
              nodeColor="#1e2a42"
              maskColor="rgba(8, 11, 20, 0.7)"
            />
          </>
        )}
      </ReactFlow>
    </div>
  );
}
