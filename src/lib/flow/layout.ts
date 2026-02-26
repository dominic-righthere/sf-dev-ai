import dagre from "@dagrejs/dagre";
import type { FlowDefinition, FlowConnector } from "./types";

const NODE_WIDTH = 240;
const NODE_HEIGHT = 80;
const RANK_SEP = 100;
const NODE_SEP = 60;

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  nodes: LayoutNode[];
  width: number;
  height: number;
}

export function layoutFlow(flow: FlowDefinition): LayoutResult {
  const g = new dagre.graphlib.Graph();

  g.setGraph({
    rankdir: "TB",
    ranksep: RANK_SEP,
    nodesep: NODE_SEP,
    marginx: 40,
    marginy: 40,
  });

  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes
  for (const [id, element] of flow.elements) {
    const height = element.type === "Screen" ? 120 : NODE_HEIGHT;
    g.setNode(id, { width: NODE_WIDTH, height });
  }

  // Add edges from connectors
  for (const connector of flow.connectors) {
    g.setEdge(connector.sourceId, connector.targetId);
  }

  dagre.layout(g);

  const nodes: LayoutNode[] = [];
  let maxX = 0;
  let maxY = 0;

  g.nodes().forEach((nodeId) => {
    const node = g.node(nodeId);
    if (node) {
      nodes.push({
        id: nodeId,
        x: node.x - node.width / 2,
        y: node.y - node.height / 2,
        width: node.width,
        height: node.height,
      });
      maxX = Math.max(maxX, node.x + node.width / 2);
      maxY = Math.max(maxY, node.y + node.height / 2);
    }
  });

  return { nodes, width: maxX + 40, height: maxY + 40 };
}

export function autoLayoutFlow(flow: FlowDefinition): FlowDefinition {
  const layout = layoutFlow(flow);

  const updatedElements = new Map(flow.elements);
  for (const layoutNode of layout.nodes) {
    const element = updatedElements.get(layoutNode.id);
    if (element) {
      updatedElements.set(layoutNode.id, {
        ...element,
        locationX: layoutNode.x,
        locationY: layoutNode.y,
      });
    }
  }

  return { ...flow, elements: updatedElements };
}
