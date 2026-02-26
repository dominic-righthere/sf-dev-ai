// THE critical type file — every system depends on this

export interface FlowDefinition {
  id: string;
  apiName: string;
  label: string;
  description: string;
  processType: FlowProcessType;
  status: "Draft" | "Active";
  startElementId: string;
  elements: Map<string, FlowElement>;
  connectors: FlowConnector[];
  variables: FlowVariable[];
}

export type FlowProcessType = "Flow" | "AutoLaunchedFlow" | "Screen";

// -- Element Types --

export type FlowElement =
  | StartElement
  | ScreenElement
  | DecisionElement
  | AssignmentElement
  | RecordCreateElement
  | RecordUpdateElement
  | RecordLookupElement
  | RecordDeleteElement
  | LoopElement
  | ActionCallElement
  | SubflowElement
  | WaitElement;

export type FlowElementType = FlowElement["type"];

interface BaseElement {
  id: string;
  name: string;
  label: string;
  description?: string;
  locationX?: number;
  locationY?: number;
}

export interface StartElement extends BaseElement {
  type: "Start";
  connector?: string; // target element id
  triggerType?: "RecordBeforeSave" | "RecordAfterSave" | "Scheduled" | "PlatformEvent" | "None";
  object?: string;
  recordTriggerType?: "Create" | "CreateAndUpdate" | "Update" | "Delete";
  filterLogic?: string;
  filters?: FlowRecordFilter[];
  schedule?: FlowSchedule;
}

export interface ScreenElement extends BaseElement {
  type: "Screen";
  connector?: string;
  allowBack: boolean;
  allowFinish: boolean;
  allowPause: boolean;
  showFooter: boolean;
  showHeader: boolean;
  fields: ScreenField[];
  rules?: ScreenRule[];
}

export interface ScreenField {
  id: string;
  name: string;
  fieldType: ScreenFieldType;
  label?: string;
  required?: boolean;
  defaultValue?: string;
  helpText?: string;
  validationRule?: string;
  errorMessage?: string;
  dataType?: FlowDataType;
  // Component-specific properties
  choices?: string[];
  inputType?: "text" | "email" | "phone" | "url" | "number" | "date" | "datetime" | "currency";
  displayText?: string; // For DisplayText fields
  objectName?: string; // For LookupField
  fields?: ScreenField[]; // For Section
  columns?: ScreenColumn[]; // For Section
}

export interface ScreenColumn {
  fields: ScreenField[];
}

export type ScreenFieldType =
  | "InputField"
  | "LargeTextArea"
  | "DisplayText"
  | "DropdownBox"
  | "MultiSelectCheckboxes"
  | "MultiSelectPicklist"
  | "RadioButtons"
  | "ToggleField"
  | "DateField"
  | "DateTimeField"
  | "NumberField"
  | "CurrencyField"
  | "LookupField"
  | "Section"
  | "ComponentInstance";

export interface ScreenRule {
  name: string;
  conditionLogic: string;
  conditions: FlowCondition[];
  actions: ScreenRuleAction[];
}

export interface ScreenRuleAction {
  attribute: string;
  value: string;
  fieldReference: string;
}

export interface DecisionElement extends BaseElement {
  type: "Decision";
  defaultConnector?: string;
  defaultConnectorLabel: string;
  rules: DecisionRule[];
}

export interface DecisionRule {
  name: string;
  label: string;
  conditionLogic: string;
  conditions: FlowCondition[];
  connector?: string; // target element id
}

export interface AssignmentElement extends BaseElement {
  type: "Assignment";
  connector?: string;
  assignmentItems: AssignmentItem[];
}

export interface AssignmentItem {
  assignToReference: string;
  operator: AssignmentOperator;
  value: FlowValue;
}

export type AssignmentOperator =
  | "Assign"
  | "Add"
  | "Subtract"
  | "AddItem"
  | "RemoveFirst"
  | "RemoveAll"
  | "RemoveAfterFirst"
  | "RemoveBeforeFirst"
  | "RemovePosition";

export interface RecordCreateElement extends BaseElement {
  type: "RecordCreate";
  connector?: string;
  faultConnector?: string;
  object: string;
  inputAssignments: InputAssignment[];
  storeOutputAutomatically?: boolean;
  assignRecordIdToReference?: string;
}

export interface RecordUpdateElement extends BaseElement {
  type: "RecordUpdate";
  connector?: string;
  faultConnector?: string;
  object: string;
  filterLogic?: string;
  filters?: FlowRecordFilter[];
  inputAssignments: InputAssignment[];
}

export interface RecordLookupElement extends BaseElement {
  type: "RecordLookup";
  connector?: string;
  faultConnector?: string;
  object: string;
  filterLogic?: string;
  filters: FlowRecordFilter[];
  outputAssignments?: OutputAssignment[];
  outputReference?: string;
  getFirstRecordOnly: boolean;
  storeOutputAutomatically?: boolean;
  queriedFields?: string[];
  sortField?: string;
  sortOrder?: "Asc" | "Desc";
}

export interface RecordDeleteElement extends BaseElement {
  type: "RecordDelete";
  connector?: string;
  faultConnector?: string;
  object: string;
  filterLogic?: string;
  filters: FlowRecordFilter[];
}

export interface LoopElement extends BaseElement {
  type: "Loop";
  nextValueConnector?: string;
  noMoreValuesConnector?: string;
  collectionReference: string;
  iterationOrder: "Asc" | "Desc";
  assignNextValueToReference?: string;
}

export interface ActionCallElement extends BaseElement {
  type: "ActionCall";
  connector?: string;
  faultConnector?: string;
  actionName: string;
  actionType: string;
  inputParameters: ActionParameter[];
  outputParameters: ActionParameter[];
}

export interface SubflowElement extends BaseElement {
  type: "Subflow";
  connector?: string;
  faultConnector?: string;
  flowName: string;
  inputAssignments: InputAssignment[];
  outputAssignments: OutputAssignment[];
}

export interface WaitElement extends BaseElement {
  type: "Wait";
  defaultConnector?: string;
  defaultConnectorLabel: string;
  waitEvents: WaitEvent[];
}

export interface WaitEvent {
  name: string;
  label: string;
  conditionLogic: string;
  conditions: FlowCondition[];
  connector?: string;
  eventType: string;
  inputParameters: ActionParameter[];
  outputParameters: ActionParameter[];
}

// -- Shared Types --

export interface FlowConnector {
  sourceId: string;
  targetId: string;
  label?: string;
  type: "default" | "fault" | "nextValue" | "noMoreValues" | "rule";
  ruleIndex?: number; // For decision rules
}

export interface FlowVariable {
  id: string;
  name: string;
  dataType: FlowDataType;
  isCollection: boolean;
  isInput: boolean;
  isOutput: boolean;
  objectType?: string;
  defaultValue?: FlowValue;
  description?: string;
}

export type FlowDataType =
  | "String"
  | "Number"
  | "Currency"
  | "Boolean"
  | "Date"
  | "DateTime"
  | "Picklist"
  | "Multipicklist"
  | "SObject"
  | "Apex";

export interface FlowValue {
  stringValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
  dateValue?: string;
  dateTimeValue?: string;
  elementReference?: string;
}

export interface FlowCondition {
  leftValueReference: string;
  operator: FlowOperator;
  rightValue?: FlowValue;
}

export type FlowOperator =
  | "EqualTo"
  | "NotEqualTo"
  | "GreaterThan"
  | "LessThan"
  | "GreaterThanOrEqualTo"
  | "LessThanOrEqualTo"
  | "Contains"
  | "StartsWith"
  | "EndsWith"
  | "IsNull"
  | "IsChanged"
  | "WasSet";

export interface FlowRecordFilter {
  field: string;
  operator: FlowOperator;
  value: FlowValue;
}

export interface InputAssignment {
  field: string;
  value: FlowValue;
}

export interface OutputAssignment {
  assignToReference: string;
  field: string;
}

export interface ActionParameter {
  name: string;
  value: FlowValue;
}

export interface FlowSchedule {
  frequency: "Once" | "Daily" | "Weekly";
  startDate?: string;
  startTime?: string;
}

// -- Serialization helpers --

export function serializeFlowDefinition(flow: FlowDefinition): string {
  return JSON.stringify({
    ...flow,
    elements: Array.from(flow.elements.entries()),
  });
}

export function deserializeFlowDefinition(json: string): FlowDefinition {
  const parsed = JSON.parse(json);
  return {
    ...parsed,
    elements: new Map(parsed.elements),
  };
}

// -- Factory --

export function createEmptyFlow(
  apiName: string,
  label: string,
  processType: FlowProcessType = "Screen"
): FlowDefinition {
  const startId = "start_element";

  const startElement: StartElement = {
    id: startId,
    type: "Start",
    name: "Start",
    label: "Start",
  };

  return {
    id: crypto.randomUUID(),
    apiName,
    label,
    description: "",
    processType,
    status: "Draft",
    startElementId: startId,
    elements: new Map([[startId, startElement]]),
    connectors: [],
    variables: [],
  };
}
