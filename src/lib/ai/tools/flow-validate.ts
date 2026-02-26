import type { FlowDefinition, FlowElement } from "@/lib/flow/types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateFlow(flow: FlowDefinition): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for start element
  if (!flow.elements.has(flow.startElementId)) {
    errors.push("Flow is missing a start element");
  }

  // Check that the start element connects to something
  const start = flow.elements.get(flow.startElementId);
  if (start && start.type === "Start" && !start.connector) {
    if (flow.elements.size > 1) {
      errors.push("Start element has no connector to the first element");
    }
  }

  // Check for orphaned elements (not reachable from start)
  const reachable = new Set<string>();
  if (start) {
    walkFlow(flow, flow.startElementId, reachable);
  }
  for (const [id] of flow.elements) {
    if (id !== flow.startElementId && !reachable.has(id)) {
      warnings.push(`Element "${id}" is not reachable from the start`);
    }
  }

  // Check connector targets exist
  for (const connector of flow.connectors) {
    if (!flow.elements.has(connector.targetId)) {
      errors.push(
        `Connector from "${connector.sourceId}" targets non-existent element "${connector.targetId}"`
      );
    }
    if (!flow.elements.has(connector.sourceId)) {
      errors.push(
        `Connector source "${connector.sourceId}" does not exist`
      );
    }
  }

  // Check Screen elements have fields
  for (const [id, el] of flow.elements) {
    if (el.type === "Screen" && el.fields.length === 0) {
      warnings.push(`Screen "${id}" has no fields`);
    }
  }

  // Check Decision elements have rules
  for (const [id, el] of flow.elements) {
    if (el.type === "Decision" && el.rules.length === 0) {
      errors.push(`Decision "${id}" has no rules`);
    }
  }

  // Check RecordCreate/Update have inputAssignments
  for (const [id, el] of flow.elements) {
    if (
      (el.type === "RecordCreate" || el.type === "RecordUpdate") &&
      el.inputAssignments.length === 0
    ) {
      warnings.push(`${el.type} "${id}" has no input assignments`);
    }
  }

  // Check RecordLookup has filters
  for (const [id, el] of flow.elements) {
    if (el.type === "RecordLookup" && el.filters.length === 0) {
      warnings.push(`RecordLookup "${id}" has no filters — will return all records`);
    }
  }

  // Check for API name
  if (!flow.apiName || flow.apiName.trim() === "") {
    errors.push("Flow is missing an API name");
  }

  // Check for label
  if (!flow.label || flow.label.trim() === "") {
    errors.push("Flow is missing a label");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function walkFlow(
  flow: FlowDefinition,
  currentId: string,
  visited: Set<string>
): void {
  if (visited.has(currentId)) return;
  visited.add(currentId);

  // Find all connectors from this element
  for (const connector of flow.connectors) {
    if (connector.sourceId === currentId) {
      walkFlow(flow, connector.targetId, visited);
    }
  }
}
