import { XMLBuilder, XMLParser } from "fast-xml-parser";
import type { Node, Edge } from "@xyflow/react";
import type {
  FlowDefinition,
  FlowElement,
  FlowConnector,
  FlowVariable,
  DecisionElement,
  LoopElement,
  WaitElement,
} from "./types";
import { layoutFlow } from "./layout";

// -- Internal → React Flow --

export function flowToReactFlow(flow: FlowDefinition): {
  nodes: Node[];
  edges: Edge[];
} {
  const layout = layoutFlow(flow);
  const layoutMap = new Map(layout.nodes.map((n) => [n.id, n]));

  const nodes: Node[] = [];

  for (const [id, element] of flow.elements) {
    const pos = layoutMap.get(id);
    nodes.push({
      id,
      type: element.type.toLowerCase(),
      position: {
        x: pos?.x ?? element.locationX ?? 0,
        y: pos?.y ?? element.locationY ?? 0,
      },
      data: { element, label: element.label },
    });
  }

  const edges: Edge[] = flow.connectors.map((c, i) => ({
    id: `edge-${i}`,
    source: c.sourceId,
    target: c.targetId,
    label: c.label,
    type: "smoothstep",
    animated: c.type === "fault",
    style: c.type === "fault" ? { stroke: "#ef4444" } : undefined,
    data: { connectorType: c.type },
  }));

  return { nodes, edges };
}

// -- Build connectors from element references --

export function buildConnectors(elements: Map<string, FlowElement>): FlowConnector[] {
  const connectors: FlowConnector[] = [];

  for (const [id, el] of elements) {
    if ("connector" in el && el.connector) {
      connectors.push({
        sourceId: id,
        targetId: el.connector,
        type: "default",
      });
    }

    if ("faultConnector" in el && el.faultConnector) {
      connectors.push({
        sourceId: id,
        targetId: el.faultConnector,
        label: "Fault",
        type: "fault",
      });
    }

    if ("defaultConnector" in el && el.defaultConnector) {
      const defaultLabel =
        (el as DecisionElement).defaultConnectorLabel ||
        (el as WaitElement).defaultConnectorLabel ||
        "Default";
      connectors.push({
        sourceId: id,
        targetId: el.defaultConnector,
        label: defaultLabel,
        type: "default",
      });
    }

    if (el.type === "Decision") {
      for (let i = 0; i < el.rules.length; i++) {
        const rule = el.rules[i]!;
        if (rule.connector) {
          connectors.push({
            sourceId: id,
            targetId: rule.connector,
            label: rule.label,
            type: "rule",
            ruleIndex: i,
          });
        }
      }
    }

    if (el.type === "Loop") {
      if (el.nextValueConnector) {
        connectors.push({
          sourceId: id,
          targetId: el.nextValueConnector,
          label: "For Each",
          type: "nextValue",
        });
      }
      if (el.noMoreValuesConnector) {
        connectors.push({
          sourceId: id,
          targetId: el.noMoreValuesConnector,
          label: "After Last",
          type: "noMoreValues",
        });
      }
    }

    if (el.type === "Wait") {
      for (const event of el.waitEvents) {
        if (event.connector) {
          connectors.push({
            sourceId: id,
            targetId: event.connector,
            label: event.label,
            type: "rule",
          });
        }
      }
    }
  }

  return connectors;
}

// -- Internal → Salesforce Metadata XML --

export function flowToMetadataXml(flow: FlowDefinition): string {
  const metadata: Record<string, unknown> = {
    "?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
    Flow: {
      "@_xmlns": "http://soap.sforce.com/2006/04/metadata",
      apiVersion: "62.0",
      label: flow.label,
      description: flow.description,
      processType: flow.processType,
      status: flow.status,
      start: buildStartXml(flow),
      ...buildElementsXml(flow),
      ...buildVariablesXml(flow),
    },
  };

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    format: true,
    indentBy: "    ",
    suppressEmptyNode: true,
  });

  return builder.build(metadata);
}

function buildStartXml(flow: FlowDefinition): Record<string, unknown> {
  const start = flow.elements.get(flow.startElementId);
  if (!start || start.type !== "Start") return {};

  const xml: Record<string, unknown> = {
    locationX: start.locationX ?? 50,
    locationY: start.locationY ?? 0,
  };

  if (start.connector) {
    xml.connector = { targetReference: start.connector };
  }

  if (start.triggerType && start.triggerType !== "None") {
    xml.triggerType = start.triggerType;
    if (start.object) xml.object = start.object;
    if (start.recordTriggerType) xml.recordTriggerType = start.recordTriggerType;
  }

  return xml;
}

function buildElementsXml(flow: FlowDefinition): Record<string, unknown[]> {
  const result: Record<string, unknown[]> = {};

  for (const [, el] of flow.elements) {
    if (el.type === "Start") continue;

    const xmlKey = getXmlKey(el.type);
    if (!result[xmlKey]) result[xmlKey] = [];

    result[xmlKey].push(elementToXml(el));
  }

  return result;
}

function getXmlKey(type: string): string {
  const map: Record<string, string> = {
    Screen: "screens",
    Decision: "decisions",
    Assignment: "assignments",
    RecordCreate: "recordCreates",
    RecordUpdate: "recordUpdates",
    RecordLookup: "recordLookups",
    RecordDelete: "recordDeletes",
    Loop: "loops",
    ActionCall: "actionCalls",
    Subflow: "subflows",
    Wait: "waits",
  };
  return map[type] || "actionCalls";
}

function elementToXml(el: FlowElement): Record<string, unknown> {
  const base: Record<string, unknown> = {
    name: el.name,
    label: el.label,
    locationX: el.locationX ?? 176,
    locationY: el.locationY ?? 176,
  };

  if (el.description) base.description = el.description;

  if ("connector" in el && el.connector) {
    base.connector = { targetReference: el.connector };
  }

  if ("faultConnector" in el && el.faultConnector) {
    base.faultConnector = { targetReference: el.faultConnector };
  }

  switch (el.type) {
    case "Screen":
      base.allowBack = el.allowBack;
      base.allowFinish = el.allowFinish;
      base.allowPause = el.allowPause;
      base.showFooter = el.showFooter;
      base.showHeader = el.showHeader;
      if (el.fields.length > 0) {
        base.fields = el.fields.map(screenFieldToXml);
      }
      break;

    case "Decision":
      if (el.defaultConnector) {
        base.defaultConnector = { targetReference: el.defaultConnector };
      }
      base.defaultConnectorLabel = el.defaultConnectorLabel;
      base.rules = el.rules.map((r) => ({
        name: r.name,
        label: r.label,
        conditionLogic: r.conditionLogic,
        conditions: r.conditions.map(conditionToXml),
        ...(r.connector ? { connector: { targetReference: r.connector } } : {}),
      }));
      break;

    case "Assignment":
      base.assignmentItems = el.assignmentItems.map((a) => ({
        assignToReference: a.assignToReference,
        operator: a.operator,
        value: flowValueToXml(a.value),
      }));
      break;

    case "RecordCreate":
      base.object = el.object;
      base.inputAssignments = el.inputAssignments.map(inputAssignmentToXml);
      if (el.storeOutputAutomatically) base.storeOutputAutomatically = true;
      if (el.assignRecordIdToReference)
        base.assignRecordIdToReference = el.assignRecordIdToReference;
      break;

    case "RecordUpdate":
      base.object = el.object;
      base.inputAssignments = el.inputAssignments.map(inputAssignmentToXml);
      if (el.filters) base.filters = el.filters.map(filterToXml);
      if (el.filterLogic) base.filterLogic = el.filterLogic;
      break;

    case "RecordLookup":
      base.object = el.object;
      base.filters = el.filters.map(filterToXml);
      base.getFirstRecordOnly = el.getFirstRecordOnly;
      if (el.filterLogic) base.filterLogic = el.filterLogic;
      if (el.storeOutputAutomatically) base.storeOutputAutomatically = true;
      if (el.outputReference) base.outputReference = el.outputReference;
      if (el.queriedFields) base.queriedFields = el.queriedFields;
      if (el.sortField) base.sortField = el.sortField;
      if (el.sortOrder) base.sortOrder = el.sortOrder;
      break;

    case "RecordDelete":
      base.object = el.object;
      base.filters = el.filters.map(filterToXml);
      if (el.filterLogic) base.filterLogic = el.filterLogic;
      break;

    case "Loop":
      base.collectionReference = el.collectionReference;
      base.iterationOrder = el.iterationOrder;
      if (el.nextValueConnector) {
        base.nextValueConnector = { targetReference: el.nextValueConnector };
      }
      if (el.noMoreValuesConnector) {
        base.noMoreValuesConnector = { targetReference: el.noMoreValuesConnector };
      }
      break;

    case "ActionCall":
      base.actionName = el.actionName;
      base.actionType = el.actionType;
      if (el.inputParameters.length > 0) base.inputParameters = el.inputParameters;
      if (el.outputParameters.length > 0) base.outputParameters = el.outputParameters;
      break;

    case "Subflow":
      base.flowName = el.flowName;
      if (el.inputAssignments.length > 0)
        base.inputAssignments = el.inputAssignments.map(inputAssignmentToXml);
      if (el.outputAssignments.length > 0)
        base.outputAssignments = el.outputAssignments;
      break;

    case "Wait":
      if (el.defaultConnector) {
        base.defaultConnector = { targetReference: el.defaultConnector };
      }
      base.defaultConnectorLabel = el.defaultConnectorLabel;
      base.waitEvents = el.waitEvents;
      break;
  }

  return base;
}

function screenFieldToXml(field: any): Record<string, unknown> {
  const xml: Record<string, unknown> = {
    name: field.name,
    fieldType: field.fieldType,
  };
  if (field.label) xml.fieldText = field.label;
  if (field.required) xml.isRequired = field.required;
  if (field.defaultValue) xml.defaultValue = { stringValue: field.defaultValue };
  if (field.helpText) xml.helpText = field.helpText;
  if (field.displayText) xml.fieldText = field.displayText;
  if (field.dataType) xml.dataType = field.dataType;
  if (field.fields) xml.fields = field.fields.map(screenFieldToXml);
  return xml;
}

function conditionToXml(c: { leftValueReference: string; operator: string; rightValue?: any }) {
  const xml: Record<string, unknown> = {
    leftValueReference: c.leftValueReference,
    operator: c.operator,
  };
  if (c.rightValue) xml.rightValue = flowValueToXml(c.rightValue);
  return xml;
}

function flowValueToXml(v: any): Record<string, unknown> {
  if (v.elementReference) return { elementReference: v.elementReference };
  if (v.stringValue !== undefined) return { stringValue: v.stringValue };
  if (v.numberValue !== undefined) return { numberValue: v.numberValue };
  if (v.booleanValue !== undefined) return { booleanValue: v.booleanValue };
  return {};
}

function inputAssignmentToXml(a: { field: string; value: any }) {
  return { field: a.field, value: flowValueToXml(a.value) };
}

function filterToXml(f: { field: string; operator: string; value: any }) {
  return { field: f.field, operator: f.operator, value: flowValueToXml(f.value) };
}

function buildVariablesXml(flow: FlowDefinition): Record<string, unknown> {
  if (flow.variables.length === 0) return {};

  return {
    variables: flow.variables.map((v) => {
      const xml: Record<string, unknown> = {
        name: v.name,
        dataType: v.dataType,
        isCollection: v.isCollection,
        isInput: v.isInput,
        isOutput: v.isOutput,
      };
      if (v.objectType) xml.objectType = v.objectType;
      if (v.description) xml.description = v.description;
      if (v.defaultValue) xml.value = flowValueToXml(v.defaultValue);
      return xml;
    }),
  };
}

// -- Salesforce Metadata XML → Internal --

export function metadataXmlToFlow(xml: string, flowId?: string): FlowDefinition {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (name) => {
      const arrayFields = [
        "fields", "rules", "conditions", "assignmentItems",
        "inputAssignments", "outputAssignments", "filters",
        "inputParameters", "outputParameters", "waitEvents",
        "variables", "screens", "decisions", "assignments",
        "recordCreates", "recordUpdates", "recordLookups",
        "recordDeletes", "loops", "actionCalls", "subflows", "waits",
        "queriedFields", "columns", "choices", "picklistValues",
      ];
      return arrayFields.includes(name);
    },
  });

  const parsed = parser.parse(xml);
  const flowXml = parsed.Flow;

  const elements = new Map<string, FlowElement>();
  const startId = "start_element";

  // Parse start
  if (flowXml.start) {
    elements.set(startId, {
      id: startId,
      type: "Start",
      name: "Start",
      label: "Start",
      connector: flowXml.start.connector?.targetReference,
      triggerType: flowXml.start.triggerType,
      object: flowXml.start.object,
      recordTriggerType: flowXml.start.recordTriggerType,
      locationX: flowXml.start.locationX,
      locationY: flowXml.start.locationY,
    });
  }

  // Parse all element types
  const elementParsers: Record<string, (items: any[]) => void> = {
    screens: (items) => items.forEach((s) => parseScreen(s, elements)),
    decisions: (items) => items.forEach((d) => parseDecision(d, elements)),
    assignments: (items) => items.forEach((a) => parseAssignment(a, elements)),
    recordCreates: (items) => items.forEach((r) => parseRecordCreate(r, elements)),
    recordUpdates: (items) => items.forEach((r) => parseRecordUpdate(r, elements)),
    recordLookups: (items) => items.forEach((r) => parseRecordLookup(r, elements)),
    recordDeletes: (items) => items.forEach((r) => parseRecordDelete(r, elements)),
    loops: (items) => items.forEach((l) => parseLoop(l, elements)),
    actionCalls: (items) => items.forEach((a) => parseActionCall(a, elements)),
    subflows: (items) => items.forEach((s) => parseSubflow(s, elements)),
    waits: (items) => items.forEach((w) => parseWait(w, elements)),
  };

  for (const [key, parser] of Object.entries(elementParsers)) {
    if (flowXml[key]) {
      const items = Array.isArray(flowXml[key]) ? flowXml[key] : [flowXml[key]];
      parser(items);
    }
  }

  // Parse variables
  const variables: FlowVariable[] = [];
  if (flowXml.variables) {
    const vars = Array.isArray(flowXml.variables) ? flowXml.variables : [flowXml.variables];
    for (const v of vars) {
      variables.push({
        id: v.name,
        name: v.name,
        dataType: v.dataType,
        isCollection: v.isCollection === true || v.isCollection === "true",
        isInput: v.isInput === true || v.isInput === "true",
        isOutput: v.isOutput === true || v.isOutput === "true",
        objectType: v.objectType,
        description: v.description,
      });
    }
  }

  const flow: FlowDefinition = {
    id: flowId || crypto.randomUUID(),
    apiName: flowXml.fullName || flowXml.label?.replace(/\s+/g, "_") || "Untitled_Flow",
    label: flowXml.label || "Untitled Flow",
    description: flowXml.description || "",
    processType: flowXml.processType || "Screen",
    status: flowXml.status || "Draft",
    startElementId: startId,
    elements,
    connectors: [],
    variables,
  };

  // Build connectors from element references
  flow.connectors = buildConnectors(flow.elements);

  return flow;
}

function parseScreen(s: any, elements: Map<string, FlowElement>) {
  elements.set(s.name, {
    id: s.name,
    type: "Screen",
    name: s.name,
    label: s.label,
    description: s.description,
    connector: s.connector?.targetReference,
    allowBack: s.allowBack !== false,
    allowFinish: s.allowFinish !== false,
    allowPause: s.allowPause === true,
    showFooter: s.showFooter !== false,
    showHeader: s.showHeader !== false,
    fields: (s.fields || []).map(parseScreenField),
    locationX: s.locationX,
    locationY: s.locationY,
  });
}

function parseScreenField(f: any): any {
  return {
    id: f.name,
    name: f.name,
    fieldType: f.fieldType,
    label: f.fieldText || f.label,
    required: f.isRequired === true || f.isRequired === "true",
    defaultValue: f.defaultValue?.stringValue,
    helpText: f.helpText,
    dataType: f.dataType,
    displayText: f.fieldType === "DisplayText" ? f.fieldText : undefined,
    fields: f.fields?.map(parseScreenField),
  };
}

function parseDecision(d: any, elements: Map<string, FlowElement>) {
  elements.set(d.name, {
    id: d.name,
    type: "Decision",
    name: d.name,
    label: d.label,
    description: d.description,
    defaultConnector: d.defaultConnector?.targetReference,
    defaultConnectorLabel: d.defaultConnectorLabel || "Default Outcome",
    rules: (d.rules || []).map((r: any) => ({
      name: r.name,
      label: r.label,
      conditionLogic: r.conditionLogic || "and",
      conditions: (r.conditions || []).map(parseCondition),
      connector: r.connector?.targetReference,
    })),
    locationX: d.locationX,
    locationY: d.locationY,
  });
}

function parseCondition(c: any) {
  return {
    leftValueReference: c.leftValueReference,
    operator: c.operator,
    rightValue: c.rightValue ? parseFlowValue(c.rightValue) : undefined,
  };
}

function parseFlowValue(v: any) {
  return {
    stringValue: v.stringValue,
    numberValue: v.numberValue !== undefined ? Number(v.numberValue) : undefined,
    booleanValue: v.booleanValue !== undefined ? Boolean(v.booleanValue) : undefined,
    elementReference: v.elementReference,
  };
}

function parseAssignment(a: any, elements: Map<string, FlowElement>) {
  elements.set(a.name, {
    id: a.name,
    type: "Assignment",
    name: a.name,
    label: a.label,
    connector: a.connector?.targetReference,
    assignmentItems: (a.assignmentItems || []).map((ai: any) => ({
      assignToReference: ai.assignToReference,
      operator: ai.operator,
      value: parseFlowValue(ai.value),
    })),
    locationX: a.locationX,
    locationY: a.locationY,
  });
}

function parseRecordCreate(r: any, elements: Map<string, FlowElement>) {
  elements.set(r.name, {
    id: r.name,
    type: "RecordCreate",
    name: r.name,
    label: r.label,
    connector: r.connector?.targetReference,
    faultConnector: r.faultConnector?.targetReference,
    object: r.object,
    inputAssignments: (r.inputAssignments || []).map((ia: any) => ({
      field: ia.field,
      value: parseFlowValue(ia.value),
    })),
    storeOutputAutomatically: r.storeOutputAutomatically,
    assignRecordIdToReference: r.assignRecordIdToReference,
    locationX: r.locationX,
    locationY: r.locationY,
  });
}

function parseRecordUpdate(r: any, elements: Map<string, FlowElement>) {
  elements.set(r.name, {
    id: r.name,
    type: "RecordUpdate",
    name: r.name,
    label: r.label,
    connector: r.connector?.targetReference,
    faultConnector: r.faultConnector?.targetReference,
    object: r.object,
    filterLogic: r.filterLogic,
    filters: (r.filters || []).map((f: any) => ({
      field: f.field,
      operator: f.operator,
      value: parseFlowValue(f.value),
    })),
    inputAssignments: (r.inputAssignments || []).map((ia: any) => ({
      field: ia.field,
      value: parseFlowValue(ia.value),
    })),
    locationX: r.locationX,
    locationY: r.locationY,
  });
}

function parseRecordLookup(r: any, elements: Map<string, FlowElement>) {
  elements.set(r.name, {
    id: r.name,
    type: "RecordLookup",
    name: r.name,
    label: r.label,
    connector: r.connector?.targetReference,
    faultConnector: r.faultConnector?.targetReference,
    object: r.object,
    filterLogic: r.filterLogic,
    filters: (r.filters || []).map((f: any) => ({
      field: f.field,
      operator: f.operator,
      value: parseFlowValue(f.value),
    })),
    getFirstRecordOnly: r.getFirstRecordOnly !== false,
    storeOutputAutomatically: r.storeOutputAutomatically,
    outputReference: r.outputReference,
    queriedFields: r.queriedFields || [],
    sortField: r.sortField,
    sortOrder: r.sortOrder,
    locationX: r.locationX,
    locationY: r.locationY,
  });
}

function parseRecordDelete(r: any, elements: Map<string, FlowElement>) {
  elements.set(r.name, {
    id: r.name,
    type: "RecordDelete",
    name: r.name,
    label: r.label,
    connector: r.connector?.targetReference,
    faultConnector: r.faultConnector?.targetReference,
    object: r.object,
    filterLogic: r.filterLogic,
    filters: (r.filters || []).map((f: any) => ({
      field: f.field,
      operator: f.operator,
      value: parseFlowValue(f.value),
    })),
    locationX: r.locationX,
    locationY: r.locationY,
  });
}

function parseLoop(l: any, elements: Map<string, FlowElement>) {
  elements.set(l.name, {
    id: l.name,
    type: "Loop",
    name: l.name,
    label: l.label,
    collectionReference: l.collectionReference,
    iterationOrder: l.iterationOrder || "Asc",
    nextValueConnector: l.nextValueConnector?.targetReference,
    noMoreValuesConnector: l.noMoreValuesConnector?.targetReference,
    assignNextValueToReference: l.assignNextValueToReference,
    locationX: l.locationX,
    locationY: l.locationY,
  });
}

function parseActionCall(a: any, elements: Map<string, FlowElement>) {
  elements.set(a.name, {
    id: a.name,
    type: "ActionCall",
    name: a.name,
    label: a.label,
    connector: a.connector?.targetReference,
    faultConnector: a.faultConnector?.targetReference,
    actionName: a.actionName,
    actionType: a.actionType,
    inputParameters: a.inputParameters || [],
    outputParameters: a.outputParameters || [],
    locationX: a.locationX,
    locationY: a.locationY,
  });
}

function parseSubflow(s: any, elements: Map<string, FlowElement>) {
  elements.set(s.name, {
    id: s.name,
    type: "Subflow",
    name: s.name,
    label: s.label,
    connector: s.connector?.targetReference,
    faultConnector: s.faultConnector?.targetReference,
    flowName: s.flowName,
    inputAssignments: (s.inputAssignments || []).map((ia: any) => ({
      field: ia.field,
      value: parseFlowValue(ia.value),
    })),
    outputAssignments: (s.outputAssignments || []).map((oa: any) => ({
      assignToReference: oa.assignToReference,
      field: oa.field,
    })),
    locationX: s.locationX,
    locationY: s.locationY,
  });
}

function parseWait(w: any, elements: Map<string, FlowElement>) {
  elements.set(w.name, {
    id: w.name,
    type: "Wait",
    name: w.name,
    label: w.label,
    defaultConnector: w.defaultConnector?.targetReference,
    defaultConnectorLabel: w.defaultConnectorLabel || "Default",
    waitEvents: (w.waitEvents || []).map((e: any) => ({
      name: e.name,
      label: e.label,
      conditionLogic: e.conditionLogic || "and",
      conditions: (e.conditions || []).map(parseCondition),
      connector: e.connector?.targetReference,
      eventType: e.eventType,
      inputParameters: e.inputParameters || [],
      outputParameters: e.outputParameters || [],
    })),
    locationX: w.locationX,
    locationY: w.locationY,
  });
}
