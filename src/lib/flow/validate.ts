import type { FlowDefinition, FlowElement, FlowVariable } from "./types";

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_ELEMENT_TYPES = new Set([
  "Start", "Screen", "Decision", "Assignment",
  "RecordCreate", "RecordUpdate", "RecordLookup", "RecordDelete",
  "Loop", "ActionCall", "Subflow", "Wait",
]);

const VALID_DATA_TYPES = new Set([
  "String", "Number", "Currency", "Boolean",
  "Date", "DateTime", "Picklist", "Multipicklist",
  "SObject", "Apex",
]);

export function validateFlowElement(element: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (!element.id || typeof element.id !== "string") {
    errors.push("Element missing required 'id' (string)");
  }
  if (!element.type || typeof element.type !== "string") {
    errors.push("Element missing required 'type' (string)");
  } else if (!VALID_ELEMENT_TYPES.has(element.type as string)) {
    errors.push(`Invalid element type: '${element.type}'. Must be one of: ${[...VALID_ELEMENT_TYPES].join(", ")}`);
  }
  if (!element.name || typeof element.name !== "string") {
    errors.push("Element missing required 'name' (string)");
  }
  if (!element.label || typeof element.label !== "string") {
    errors.push("Element missing required 'label' (string)");
  }

  // Type-specific validation
  if (element.type === "Screen") {
    if (!Array.isArray(element.fields)) {
      errors.push("Screen element must have a 'fields' array");
    }
  }
  if (element.type === "Decision") {
    if (!Array.isArray(element.rules)) {
      errors.push("Decision element must have a 'rules' array");
    }
  }
  if (element.type === "Assignment") {
    if (!Array.isArray(element.assignmentItems)) {
      errors.push("Assignment element must have an 'assignmentItems' array");
    }
  }
  if (element.type === "RecordCreate" || element.type === "RecordUpdate") {
    if (!element.object || typeof element.object !== "string") {
      errors.push(`${element.type} element must have an 'object' (string)`);
    }
    if (!Array.isArray(element.inputAssignments)) {
      errors.push(`${element.type} element must have an 'inputAssignments' array`);
    }
  }
  if (element.type === "RecordLookup" || element.type === "RecordDelete") {
    if (!element.object || typeof element.object !== "string") {
      errors.push(`${element.type} element must have an 'object' (string)`);
    }
  }
  if (element.type === "Loop") {
    if (!element.collectionReference || typeof element.collectionReference !== "string") {
      errors.push("Loop element must have a 'collectionReference' (string)");
    }
  }
  if (element.type === "ActionCall") {
    if (!element.actionName || typeof element.actionName !== "string") {
      errors.push("ActionCall element must have an 'actionName' (string)");
    }
    if (!element.actionType || typeof element.actionType !== "string") {
      errors.push("ActionCall element must have an 'actionType' (string)");
    }
  }
  if (element.type === "Subflow") {
    if (!element.flowName || typeof element.flowName !== "string") {
      errors.push("Subflow element must have a 'flowName' (string)");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateFlowVariable(variable: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (!variable.name || typeof variable.name !== "string") {
    errors.push("Variable missing required 'name' (string)");
  }
  if (!variable.dataType || typeof variable.dataType !== "string") {
    errors.push("Variable missing required 'dataType' (string)");
  } else if (!VALID_DATA_TYPES.has(variable.dataType as string)) {
    errors.push(`Invalid variable dataType: '${variable.dataType}'. Must be one of: ${[...VALID_DATA_TYPES].join(", ")}`);
  }
  if (typeof variable.isCollection !== "boolean") {
    errors.push("Variable missing required 'isCollection' (boolean)");
  }
  if (typeof variable.isInput !== "boolean") {
    errors.push("Variable missing required 'isInput' (boolean)");
  }
  if (typeof variable.isOutput !== "boolean") {
    errors.push("Variable missing required 'isOutput' (boolean)");
  }
  if (variable.dataType === "SObject" && !variable.objectType) {
    errors.push("Variable with dataType 'SObject' must have an 'objectType'");
  }

  return { valid: errors.length === 0, errors };
}

export function validateFlowMetadata(metadata: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (!metadata.apiName || typeof metadata.apiName !== "string") {
    errors.push("Metadata missing required 'apiName' (string)");
  }
  if (!metadata.label || typeof metadata.label !== "string") {
    errors.push("Metadata missing required 'label' (string)");
  }
  if (!metadata.processType || typeof metadata.processType !== "string") {
    errors.push("Metadata missing required 'processType' (string)");
  } else if (!["Screen", "AutoLaunchedFlow", "Flow"].includes(metadata.processType as string)) {
    errors.push(`Invalid processType: '${metadata.processType}'`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateConnectorIntegrity(flow: FlowDefinition): ValidationResult {
  const errors: string[] = [];
  const elementIds = new Set(flow.elements.keys());

  for (const [id, element] of flow.elements) {
    // Check connector targets exist
    if ("connector" in element && element.connector && !elementIds.has(element.connector)) {
      errors.push(`Element '${id}' connector references non-existent element '${element.connector}'`);
    }
    if ("faultConnector" in element && element.faultConnector && !elementIds.has(element.faultConnector)) {
      errors.push(`Element '${id}' faultConnector references non-existent element '${element.faultConnector}'`);
    }
    if ("defaultConnector" in element && element.defaultConnector && !elementIds.has(element.defaultConnector)) {
      errors.push(`Element '${id}' defaultConnector references non-existent element '${element.defaultConnector}'`);
    }

    if (element.type === "Decision") {
      for (const rule of element.rules) {
        if (rule.connector && !elementIds.has(rule.connector)) {
          errors.push(`Decision '${id}' rule '${rule.name}' connector references non-existent element '${rule.connector}'`);
        }
      }
    }

    if (element.type === "Loop") {
      if (element.nextValueConnector && !elementIds.has(element.nextValueConnector)) {
        errors.push(`Loop '${id}' nextValueConnector references non-existent element '${element.nextValueConnector}'`);
      }
      if (element.noMoreValuesConnector && !elementIds.has(element.noMoreValuesConnector)) {
        errors.push(`Loop '${id}' noMoreValuesConnector references non-existent element '${element.noMoreValuesConnector}'`);
      }
    }

    if (element.type === "Wait") {
      for (const event of element.waitEvents) {
        if (event.connector && !elementIds.has(event.connector)) {
          errors.push(`Wait '${id}' event '${event.name}' connector references non-existent element '${event.connector}'`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
