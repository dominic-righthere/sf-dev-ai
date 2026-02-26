import { BaseFlowNode } from "./base-node";

// All node types use the BaseFlowNode which adapts based on element.type
export const nodeTypes = {
  start: BaseFlowNode,
  screen: BaseFlowNode,
  decision: BaseFlowNode,
  assignment: BaseFlowNode,
  recordcreate: BaseFlowNode,
  recordupdate: BaseFlowNode,
  recordlookup: BaseFlowNode,
  recorddelete: BaseFlowNode,
  loop: BaseFlowNode,
  actioncall: BaseFlowNode,
  subflow: BaseFlowNode,
  wait: BaseFlowNode,
};
