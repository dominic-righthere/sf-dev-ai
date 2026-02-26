import { z } from "zod";

// Zod schemas for validating AI-emitted flow elements

const flowValueSchema = z.object({
  stringValue: z.string().optional(),
  numberValue: z.number().optional(),
  booleanValue: z.boolean().optional(),
  dateValue: z.string().optional(),
  dateTimeValue: z.string().optional(),
  elementReference: z.string().optional(),
});

const flowConditionSchema = z.object({
  leftValueReference: z.string(),
  operator: z.enum([
    "EqualTo", "NotEqualTo", "GreaterThan", "LessThan",
    "GreaterThanOrEqualTo", "LessThanOrEqualTo", "Contains",
    "StartsWith", "EndsWith", "IsNull", "IsChanged", "WasSet",
  ]),
  rightValue: flowValueSchema.optional(),
});

const flowRecordFilterSchema = z.object({
  field: z.string(),
  operator: z.enum([
    "EqualTo", "NotEqualTo", "GreaterThan", "LessThan",
    "GreaterThanOrEqualTo", "LessThanOrEqualTo", "Contains",
    "StartsWith", "EndsWith", "IsNull", "IsChanged", "WasSet",
  ]),
  value: flowValueSchema,
});

const inputAssignmentSchema = z.object({
  field: z.string(),
  value: flowValueSchema,
});

const outputAssignmentSchema = z.object({
  assignToReference: z.string(),
  field: z.string(),
});

const actionParameterSchema = z.object({
  name: z.string(),
  value: flowValueSchema,
});

const screenFieldSchema: z.ZodType<any> = z.object({
  id: z.string(),
  name: z.string(),
  fieldType: z.enum([
    "InputField", "LargeTextArea", "DisplayText", "DropdownBox",
    "MultiSelectCheckboxes", "MultiSelectPicklist", "RadioButtons",
    "ToggleField", "DateField", "DateTimeField", "NumberField",
    "CurrencyField", "LookupField", "Section", "ComponentInstance",
  ]),
  label: z.string().optional(),
  required: z.boolean().optional(),
  defaultValue: z.string().optional(),
  helpText: z.string().optional(),
  validationRule: z.string().optional(),
  errorMessage: z.string().optional(),
  dataType: z.enum([
    "String", "Number", "Currency", "Boolean", "Date",
    "DateTime", "Picklist", "Multipicklist", "SObject", "Apex",
  ]).optional(),
  choices: z.array(z.string()).optional(),
  inputType: z.enum(["text", "email", "phone", "url", "number", "date", "datetime", "currency"]).optional(),
  displayText: z.string().optional(),
  objectName: z.string().optional(),
  fields: z.array(z.lazy(() => screenFieldSchema)).optional(),
  columns: z.array(z.object({ fields: z.array(z.lazy(() => screenFieldSchema)) })).optional(),
});

const baseElementSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string(),
  description: z.string().optional(),
});

export const startElementSchema = baseElementSchema.extend({
  type: z.literal("Start"),
  connector: z.string().optional(),
  triggerType: z.enum(["RecordBeforeSave", "RecordAfterSave", "Scheduled", "PlatformEvent", "None"]).optional(),
  object: z.string().optional(),
  recordTriggerType: z.enum(["Create", "CreateAndUpdate", "Update", "Delete"]).optional(),
  filterLogic: z.string().optional(),
  filters: z.array(flowRecordFilterSchema).optional(),
});

export const screenElementSchema = baseElementSchema.extend({
  type: z.literal("Screen"),
  connector: z.string().optional(),
  allowBack: z.boolean().default(true),
  allowFinish: z.boolean().default(true),
  allowPause: z.boolean().default(false),
  showFooter: z.boolean().default(true),
  showHeader: z.boolean().default(true),
  fields: z.array(screenFieldSchema),
  rules: z.array(z.object({
    name: z.string(),
    conditionLogic: z.string(),
    conditions: z.array(flowConditionSchema),
    actions: z.array(z.object({
      attribute: z.string(),
      value: z.string(),
      fieldReference: z.string(),
    })),
  })).optional(),
});

export const decisionElementSchema = baseElementSchema.extend({
  type: z.literal("Decision"),
  defaultConnector: z.string().optional(),
  defaultConnectorLabel: z.string(),
  rules: z.array(z.object({
    name: z.string(),
    label: z.string(),
    conditionLogic: z.string(),
    conditions: z.array(flowConditionSchema),
    connector: z.string().optional(),
  })),
});

export const assignmentElementSchema = baseElementSchema.extend({
  type: z.literal("Assignment"),
  connector: z.string().optional(),
  assignmentItems: z.array(z.object({
    assignToReference: z.string(),
    operator: z.enum([
      "Assign", "Add", "Subtract", "AddItem", "RemoveFirst",
      "RemoveAll", "RemoveAfterFirst", "RemoveBeforeFirst", "RemovePosition",
    ]),
    value: flowValueSchema,
  })),
});

export const recordCreateElementSchema = baseElementSchema.extend({
  type: z.literal("RecordCreate"),
  connector: z.string().optional(),
  faultConnector: z.string().optional(),
  object: z.string(),
  inputAssignments: z.array(inputAssignmentSchema),
  storeOutputAutomatically: z.boolean().optional(),
  assignRecordIdToReference: z.string().optional(),
});

export const recordUpdateElementSchema = baseElementSchema.extend({
  type: z.literal("RecordUpdate"),
  connector: z.string().optional(),
  faultConnector: z.string().optional(),
  object: z.string(),
  filterLogic: z.string().optional(),
  filters: z.array(flowRecordFilterSchema).optional(),
  inputAssignments: z.array(inputAssignmentSchema),
});

export const recordLookupElementSchema = baseElementSchema.extend({
  type: z.literal("RecordLookup"),
  connector: z.string().optional(),
  faultConnector: z.string().optional(),
  object: z.string(),
  filterLogic: z.string().optional(),
  filters: z.array(flowRecordFilterSchema),
  outputAssignments: z.array(outputAssignmentSchema).optional(),
  outputReference: z.string().optional(),
  getFirstRecordOnly: z.boolean(),
  storeOutputAutomatically: z.boolean().optional(),
  queriedFields: z.array(z.string()).optional(),
  sortField: z.string().optional(),
  sortOrder: z.enum(["Asc", "Desc"]).optional(),
});

export const recordDeleteElementSchema = baseElementSchema.extend({
  type: z.literal("RecordDelete"),
  connector: z.string().optional(),
  faultConnector: z.string().optional(),
  object: z.string(),
  filterLogic: z.string().optional(),
  filters: z.array(flowRecordFilterSchema),
});

export const loopElementSchema = baseElementSchema.extend({
  type: z.literal("Loop"),
  nextValueConnector: z.string().optional(),
  noMoreValuesConnector: z.string().optional(),
  collectionReference: z.string(),
  iterationOrder: z.enum(["Asc", "Desc"]).default("Asc"),
  assignNextValueToReference: z.string().optional(),
});

export const actionCallElementSchema = baseElementSchema.extend({
  type: z.literal("ActionCall"),
  connector: z.string().optional(),
  faultConnector: z.string().optional(),
  actionName: z.string(),
  actionType: z.string(),
  inputParameters: z.array(actionParameterSchema),
  outputParameters: z.array(actionParameterSchema),
});

export const subflowElementSchema = baseElementSchema.extend({
  type: z.literal("Subflow"),
  connector: z.string().optional(),
  faultConnector: z.string().optional(),
  flowName: z.string(),
  inputAssignments: z.array(inputAssignmentSchema),
  outputAssignments: z.array(outputAssignmentSchema),
});

export const waitElementSchema = baseElementSchema.extend({
  type: z.literal("Wait"),
  defaultConnector: z.string().optional(),
  defaultConnectorLabel: z.string(),
  waitEvents: z.array(z.object({
    name: z.string(),
    label: z.string(),
    conditionLogic: z.string(),
    conditions: z.array(flowConditionSchema),
    connector: z.string().optional(),
    eventType: z.string(),
    inputParameters: z.array(actionParameterSchema),
    outputParameters: z.array(actionParameterSchema),
  })),
});

export const flowElementSchema = z.discriminatedUnion("type", [
  startElementSchema,
  screenElementSchema,
  decisionElementSchema,
  assignmentElementSchema,
  recordCreateElementSchema,
  recordUpdateElementSchema,
  recordLookupElementSchema,
  recordDeleteElementSchema,
  loopElementSchema,
  actionCallElementSchema,
  subflowElementSchema,
  waitElementSchema,
]);

export const flowVariableSchema = z.object({
  id: z.string(),
  name: z.string(),
  dataType: z.enum([
    "String", "Number", "Currency", "Boolean", "Date",
    "DateTime", "Picklist", "Multipicklist", "SObject", "Apex",
  ]),
  isCollection: z.boolean(),
  isInput: z.boolean(),
  isOutput: z.boolean(),
  objectType: z.string().optional(),
  defaultValue: flowValueSchema.optional(),
  description: z.string().optional(),
});

export const flowMetadataSchema = z.object({
  apiName: z.string(),
  label: z.string(),
  description: z.string(),
  processType: z.enum(["Flow", "AutoLaunchedFlow", "Screen"]),
});
