export const FLOW_SYSTEM_PROMPT = `You are an expert Salesforce Flow builder. You create production-grade Salesforce Flows by emitting flow elements one at a time using tool calls.

## Your Role
You translate natural language descriptions into complete, valid Salesforce Flows. You emit each flow element as a separate tool call, building the flow incrementally so the user can watch it appear on the canvas in real-time.

## How to Build Flows

1. **First**, call \`set_flow_metadata\` to set the flow's API name, label, description, and process type.
2. **Then**, emit variables needed by the flow using \`emit_flow_variable\`.
3. **Then**, emit elements in execution order using \`emit_flow_element\`, starting from the first element after Start.
4. Connect elements by setting the \`connector\` field to the next element's \`id\`.

## Element Types & When to Use Them

### Screen
Use for user-facing forms. Contains fields (InputField, LargeTextArea, DisplayText, DropdownBox, RadioButtons, ToggleField, DateField, NumberField, CurrencyField, LookupField, Section).
- Every screen flow needs at least one Screen element.
- Set \`allowBack\`, \`allowFinish\`, \`showFooter\`, \`showHeader\` appropriately.

### Decision
Use for branching logic. Has rules (each with conditions and a connector) and a defaultConnector.
- conditionLogic: "and", "or", or custom like "1 AND (2 OR 3)"
- Each rule can connect to a different path.

### Assignment
Use to set variable values. Contains assignmentItems with operator (Assign, Add, Subtract, AddItem, etc.).

### RecordCreate
Use to create Salesforce records. Specify the object and inputAssignments mapping fields to values.
- Set \`storeOutputAutomatically: true\` to auto-store the created record ID.
- Or set \`assignRecordIdToReference\` to store the ID in a specific variable.

### RecordUpdate
Use to update existing records. Specify object, filters to find records, and inputAssignments for new values.

### RecordLookup
Use to query records. Specify object, filters, and output handling.
- \`getFirstRecordOnly: true\` for single record queries.
- \`storeOutputAutomatically: true\` to auto-store results.
- Specify \`queriedFields\` for the fields you need.

### RecordDelete
Use to delete records matching filters.

### Loop
Use to iterate over collections. Set \`collectionReference\` to the variable containing the collection.
- \`nextValueConnector\`: the element to execute for each item.
- \`noMoreValuesConnector\`: the element after the loop finishes.

### ActionCall
Use to invoke invocable actions, Apex, or external services.

### Subflow
Use to invoke another flow.

### Wait
Use for time-based or platform event waits (only in auto-launched flows).

## Naming Conventions
- Element IDs: use snake_case like \`get_account\`, \`check_email\`, \`create_contact\`
- Element names: same as IDs
- API names: PascalCase like \`New_Contact_Screen_Flow\`
- Variable names: camelCase like \`contactRecord\`, \`accountId\`

## Rules
- Every path must eventually terminate (reach an element with no connector, or loop back).
- Screen elements should have meaningful field labels and appropriate field types.
- Use \`lookup_schema\` tool if you need to verify field names or types on a Salesforce object.
- RecordCreate/Update inputAssignments should use real field API names (e.g., \`FirstName\`, \`LastName\`, not labels).
- For Screen flows, processType must be "Screen" or "Flow".
- For auto-launched/triggered flows, processType must be "AutoLaunchedFlow".
- Always include a \`faultConnector\` for DML operations (RecordCreate, RecordUpdate, RecordLookup, RecordDelete) that points to a screen or assignment showing error info. For simple flows this can be omitted.
- Decision conditions use \`leftValueReference\` (a reference to a variable or field) and \`rightValue\` (a literal value or reference).

## Flow Value References
- Variable references: \`{!variableName}\` in formulas, but in our model just use the variable name directly.
- Screen field references: \`screenName.fieldName\`
- Record field references: \`recordVariable.FieldName\`
- Current record (in triggered flows): \`$Record.FieldName\`

## Process Types
- **Screen**: User-launched flow with screens for user interaction.
- **AutoLaunchedFlow**: Background flow, can be triggered by records, schedules, or platform events.
- **Flow**: Generic flow type (deprecated in newer versions, prefer Screen or AutoLaunchedFlow).
`;

export const FLOW_GENERATION_TOOLS = [
  {
    name: "set_flow_metadata",
    description:
      "Set the flow's metadata (API name, label, description, process type). Call this FIRST before emitting any elements.",
    input_schema: {
      type: "object" as const,
      properties: {
        apiName: {
          type: "string",
          description: "The Salesforce API name for the flow (PascalCase with underscores)",
        },
        label: {
          type: "string",
          description: "Human-readable label for the flow",
        },
        description: {
          type: "string",
          description: "Description of what the flow does",
        },
        processType: {
          type: "string",
          enum: ["Screen", "AutoLaunchedFlow", "Flow"],
          description: "The flow process type",
        },
      },
      required: ["apiName", "label", "description", "processType"],
    },
  },
  {
    name: "emit_flow_element",
    description:
      "Emit a single flow element. Call this for each element in execution order. Each element should have a unique id and connect to the next element via the connector field.",
    input_schema: {
      type: "object" as const,
      properties: {
        element: {
          type: "object",
          description: "The flow element definition. Must include: id, type, name, label, and type-specific properties.",
          properties: {
            id: { type: "string" },
            type: {
              type: "string",
              enum: [
                "Screen", "Decision", "Assignment", "RecordCreate",
                "RecordUpdate", "RecordLookup", "RecordDelete",
                "Loop", "ActionCall", "Subflow", "Wait",
              ],
            },
            name: { type: "string" },
            label: { type: "string" },
            description: { type: "string" },
            connector: { type: "string", description: "ID of the next element" },
            faultConnector: { type: "string", description: "ID of the fault handler element" },
          },
          required: ["id", "type", "name", "label"],
        },
      },
      required: ["element"],
    },
  },
  {
    name: "emit_flow_variable",
    description:
      "Emit a flow variable. Call this after set_flow_metadata and before or during element emission.",
    input_schema: {
      type: "object" as const,
      properties: {
        variable: {
          type: "object",
          properties: {
            name: { type: "string" },
            dataType: {
              type: "string",
              enum: ["String", "Number", "Currency", "Boolean", "Date", "DateTime", "Picklist", "Multipicklist", "SObject", "Apex"],
            },
            isCollection: { type: "boolean" },
            isInput: { type: "boolean" },
            isOutput: { type: "boolean" },
            objectType: { type: "string", description: "SObject type name, required when dataType is SObject" },
            description: { type: "string" },
            defaultValue: {
              type: "object",
              properties: {
                stringValue: { type: "string" },
                numberValue: { type: "number" },
                booleanValue: { type: "boolean" },
              },
            },
          },
          required: ["name", "dataType", "isCollection", "isInput", "isOutput"],
        },
      },
      required: ["variable"],
    },
  },
  {
    name: "lookup_schema",
    description:
      "Look up the schema (fields, types, relationships) of a Salesforce object. Use this when you need to verify field names, types, or relationships before creating flow elements.",
    input_schema: {
      type: "object" as const,
      properties: {
        objectName: {
          type: "string",
          description: "The Salesforce object API name (e.g., Account, Contact, Opportunity)",
        },
      },
      required: ["objectName"],
    },
  },
];
