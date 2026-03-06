import { buildSchemaContext } from "@/lib/salesforce/describe";
import type { FlowDefinition } from "@/lib/flow/types";
import { serializeFlowDefinition } from "@/lib/flow/types";

const COMMON_OBJECTS = [
  "Account", "Contact", "Opportunity", "Lead", "Case",
  "Task", "Event", "User", "Campaign",
];

export async function assembleFlowContext(
  orgId: string,
  currentFlow?: FlowDefinition,
  objectNames?: string[]
): Promise<string> {
  const parts: string[] = [];

  // Schema context (skip when no org is connected)
  if (orgId) {
    const objects = objectNames || COMMON_OBJECTS;
    const schemaContext = await buildSchemaContext(orgId, objects);
    if (schemaContext.trim().length > 50) {
      parts.push(schemaContext);
    }
  }

  // Current flow context (for refinement)
  if (currentFlow) {
    parts.push("## Current Flow State\n");
    parts.push(`API Name: ${currentFlow.apiName}`);
    parts.push(`Label: ${currentFlow.label}`);
    parts.push(`Process Type: ${currentFlow.processType}`);
    parts.push(`Elements: ${currentFlow.elements.size}`);
    parts.push(`Variables: ${currentFlow.variables.length}`);
    parts.push("");

    parts.push("### Elements:");
    for (const [id, el] of currentFlow.elements) {
      parts.push(`  - ${id}: ${el.type} "${el.label}"`);
      if ("connector" in el && el.connector) {
        parts.push(`    → connects to: ${el.connector}`);
      }
    }
    parts.push("");

    parts.push("### Variables:");
    for (const v of currentFlow.variables) {
      parts.push(`  - ${v.name}: ${v.dataType}${v.isCollection ? "[]" : ""} (input=${v.isInput}, output=${v.isOutput})`);
    }
  }

  return parts.join("\n");
}
