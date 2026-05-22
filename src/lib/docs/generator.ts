import type Connection from "jsforce/lib/connection";
import type { SessionData } from "@/lib/session";
import { getAnthropicClient, MODEL } from "@/lib/ai/client";
import type { DocType } from "./types";

const SYSTEM_PROMPT = `You are a senior Salesforce solutions architect writing internal technical documentation for an org's development team.

Write clear, structured markdown documentation. Use ## headings, bullet lists, and code blocks where relevant. Be specific — name actual flows, objects, classes, and profiles from the data provided. Highlight risks, anti-patterns, and improvement opportunities. Write as if you're the person who built the org and are handing it off to a new architect.

Do not pad the document with generic advice. Every sentence should reference specific metadata from the org.`;

async function toolingRecords<T>(conn: Connection, soql: string): Promise<T[]> {
  try {
    const r = await conn.tooling.query(soql);
    return ((r as unknown) as { records: T[] }).records ?? [];
  } catch {
    return [];
  }
}

async function soqlRecords<T extends object>(conn: Connection, soql: string): Promise<T[]> {
  try {
    const r = await conn.query<T>(soql);
    return r.records;
  } catch {
    return [];
  }
}

// ─── Data collectors ─────────────────────────────────────────────────────────

async function collectOrgOverview(conn: Connection, session: SessionData) {
  const [identity, flows, permSets, users, apexClasses, apexTriggers] = await Promise.all([
    conn.identity().catch(() => null),
    soqlRecords<{
      DeveloperName: string;
      Label: string;
      ProcessType: string;
      TriggerType?: string;
      ActiveVersionId: string | null;
    }>(
      conn,
      "SELECT DeveloperName, Label, ProcessType, TriggerType, ActiveVersionId FROM FlowDefinition"
    ),
    soqlRecords<{ Name: string; Label: string }>(
      conn,
      "SELECT Name, Label FROM PermissionSet WHERE IsOwnedByProfile = false AND IsCustom = true ORDER BY Label LIMIT 100"
    ),
    soqlRecords<{ Id: string; Profile: { Name: string } }>(
      conn,
      "SELECT Id, Profile.Name FROM User WHERE IsActive = true LIMIT 200"
    ),
    toolingRecords<{ Name: string; ApiVersion: number }>(
      conn,
      "SELECT Name, ApiVersion FROM ApexClass WHERE Status = 'Active' ORDER BY Name"
    ),
    toolingRecords<{ Name: string; TableEnumOrId: string }>(
      conn,
      "SELECT Name, TableEnumOrId FROM ApexTrigger WHERE Status = 'Active' ORDER BY Name"
    ),
  ]);

  const activeFlows = flows.filter((f) => f.ActiveVersionId !== null);
  const inactiveFlows = flows.filter((f) => f.ActiveVersionId === null);

  const flowByType = activeFlows.reduce<Record<string, string[]>>((acc, f) => {
    const key = f.TriggerType || f.ProcessType || "Other";
    (acc[key] = acc[key] || []).push(f.Label || f.DeveloperName);
    return acc;
  }, {});

  const profileCounts = users.reduce<Record<string, number>>((acc, u) => {
    const p = u.Profile?.Name || "Unknown";
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  const triggersByObject = apexTriggers.reduce<Record<string, string[]>>((acc, t) => {
    (acc[t.TableEnumOrId] = acc[t.TableEnumOrId] || []).push(t.Name);
    return acc;
  }, {});

  return {
    org: {
      type: session.orgType,
      instanceUrl: session.instanceUrl,
      username: identity?.username,
      displayName: identity?.display_name,
      orgId: identity?.organization_id,
    },
    automation: {
      activeFlows: activeFlows.length,
      inactiveFlows: inactiveFlows.length,
      flowsByType: flowByType,
      apexTriggerCount: apexTriggers.length,
      triggersByObject,
    },
    code: {
      apexClassCount: apexClasses.length,
      apexClasses: apexClasses.slice(0, 40).map((c) => `${c.Name} (v${c.ApiVersion})`),
    },
    access: {
      activeUsers: users.length,
      profileDistribution: profileCounts,
      permissionSetCount: permSets.length,
      permissionSets: permSets.slice(0, 30).map((p) => p.Label),
    },
  };
}

async function collectAutomationLandscape(conn: Connection) {
  const [flows, apexTriggers, validationRules] = await Promise.all([
    soqlRecords<{
      DeveloperName: string;
      Label: string;
      ProcessType: string;
      TriggerType?: string;
      ActiveVersionId: string | null;
      Description?: string;
    }>(
      conn,
      "SELECT DeveloperName, Label, ProcessType, TriggerType, ActiveVersionId, Description FROM FlowDefinition ORDER BY Label"
    ),
    toolingRecords<{ Name: string; TableEnumOrId: string; Status: string }>(
      conn,
      "SELECT Name, TableEnumOrId, Status FROM ApexTrigger ORDER BY TableEnumOrId, Name"
    ),
    toolingRecords<{ ValidationName: string; EntityDefinitionId: string; Active: boolean }>(
      conn,
      "SELECT ValidationName, EntityDefinitionId, Active FROM ValidationRule ORDER BY EntityDefinitionId LIMIT 500"
    ),
  ]);

  const activeFlows = flows.filter((f) => f.ActiveVersionId !== null);
  const inactiveFlows = flows.filter((f) => f.ActiveVersionId === null);

  const flowsByObject: Record<string, string[]> = {};
  const flowsByType = activeFlows.reduce<Record<string, { name: string; hasDesc: boolean }[]>>(
    (acc, f) => {
      const key = f.TriggerType || f.ProcessType || "Other";
      (acc[key] = acc[key] || []).push({
        name: f.Label || f.DeveloperName,
        hasDesc: !!f.Description?.trim(),
      });
      return acc;
    },
    {}
  );

  const triggersByObject = apexTriggers.reduce<Record<string, string[]>>((acc, t) => {
    (acc[t.TableEnumOrId] = acc[t.TableEnumOrId] || []).push(t.Name);
    if (!flowsByObject[t.TableEnumOrId]) flowsByObject[t.TableEnumOrId] = [];
    return acc;
  }, {});

  const multiTriggerObjects = Object.entries(triggersByObject)
    .filter(([, triggers]) => triggers.length > 1)
    .map(([obj, triggers]) => ({ obj, triggers }));

  const undocumentedFlows = activeFlows.filter((f) => !f.Description?.trim());

  const validByObject = validationRules.reduce<Record<string, number>>((acc, r) => {
    const key = r.EntityDefinitionId;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    flows: {
      total: flows.length,
      active: activeFlows.length,
      inactive: inactiveFlows.length,
      byType: flowsByType,
      undocumented: undocumentedFlows.map((f) => f.Label || f.DeveloperName),
    },
    triggers: {
      total: apexTriggers.length,
      byObject: triggersByObject,
      multiTriggerObjects,
    },
    validationRules: {
      total: validationRules.length,
      active: validationRules.filter((r) => r.Active).length,
      inactive: validationRules.filter((r) => !r.Active).length,
      objectsWithMostRules: Object.entries(validByObject)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([obj, count]) => ({ obj, count })),
    },
  };
}

async function collectSecurityModel(conn: Connection) {
  const [profiles, permSets, users, modifyAll, viewAll] = await Promise.all([
    soqlRecords<{
      Id: string;
      "Profile.Name": string;
      Label: string;
      PermissionsModifyAllData: boolean;
      PermissionsViewAllData: boolean;
      PermissionsManageUsers: boolean;
      PermissionsAuthorApex: boolean;
    }>(
      conn,
      "SELECT Id, Label, Profile.Name, PermissionsModifyAllData, PermissionsViewAllData, PermissionsManageUsers, PermissionsAuthorApex FROM PermissionSet WHERE IsOwnedByProfile = true"
    ),
    soqlRecords<{
      Id: string;
      Name: string;
      Label: string;
      PermissionsModifyAllData: boolean;
      PermissionsViewAllData: boolean;
    }>(
      conn,
      "SELECT Id, Name, Label, PermissionsModifyAllData, PermissionsViewAllData FROM PermissionSet WHERE IsOwnedByProfile = false AND IsCustom = true ORDER BY Label"
    ),
    soqlRecords<{ Id: string; Username: string; Profile: { Name: string } }>(
      conn,
      "SELECT Id, Username, Profile.Name FROM User WHERE IsActive = true ORDER BY Username LIMIT 200"
    ),
    soqlRecords<{ "Parent.Label": string; SobjectType: string }>(
      conn,
      "SELECT Parent.Label, SobjectType FROM ObjectPermissions WHERE PermissionsModifyAllRecords = true LIMIT 500"
    ),
    soqlRecords<{ "Parent.Label": string; SobjectType: string }>(
      conn,
      "SELECT Parent.Label, SobjectType FROM ObjectPermissions WHERE PermissionsViewAllRecords = true LIMIT 500"
    ),
  ]);

  const adminUsers = users.filter((u) =>
    u.Profile?.Name?.toLowerCase().includes("system administrator")
  );

  const profilesWithModifyAll = profiles.filter((p) => p.PermissionsModifyAllData);
  const profilesWithViewAll = profiles.filter((p) => p.PermissionsViewAllData);
  const permSetsWithModifyAll = permSets.filter((p) => p.PermissionsModifyAllData);
  const permSetsWithViewAll = permSets.filter((p) => p.PermissionsViewAllData);

  const modifyAllByObject = modifyAll.reduce<Record<string, number>>((acc, r) => {
    acc[r.SobjectType] = (acc[r.SobjectType] || 0) + 1;
    return acc;
  }, {});

  return {
    profiles: {
      total: profiles.length,
      withModifyAll: profilesWithModifyAll.map((p) => p["Profile.Name"] || p.Label),
      withViewAll: profilesWithViewAll.map((p) => p["Profile.Name"] || p.Label),
    },
    permissionSets: {
      total: permSets.length,
      withModifyAll: permSetsWithModifyAll.map((p) => p.Label),
      withViewAll: permSetsWithViewAll.map((p) => p.Label),
      all: permSets.map((p) => p.Label),
    },
    users: {
      total: users.length,
      admins: adminUsers.map((u) => u.Username),
    },
    objectAccess: {
      modifyAllByObject: Object.entries(modifyAllByObject)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20),
      viewAllTotal: viewAll.length,
    },
  };
}

async function collectObjectInventory(conn: Connection) {
  const [globalDesc, flows, apexTriggers, validationRules] = await Promise.all([
    conn.describeGlobal().catch(() => ({ sobjects: [] })),
    soqlRecords<{
      DeveloperName: string;
      Label: string;
      ProcessType: string;
      TriggerType?: string;
      ActiveVersionId: string | null;
    }>(conn, "SELECT DeveloperName, Label, ProcessType, TriggerType, ActiveVersionId FROM FlowDefinition"),
    toolingRecords<{ Name: string; TableEnumOrId: string }>(
      conn,
      "SELECT Name, TableEnumOrId FROM ApexTrigger WHERE Status = 'Active'"
    ),
    toolingRecords<{ ValidationName: string; EntityDefinitionId: string; Active: boolean }>(
      conn,
      "SELECT ValidationName, EntityDefinitionId, Active FROM ValidationRule LIMIT 500"
    ),
  ]);

  const customObjects = globalDesc.sobjects
    .filter((o) => o.custom && o.queryable && !o.name.endsWith("__Share") && !o.name.endsWith("__History") && !o.name.endsWith("__Feed"))
    .map((o) => ({
      name: o.name,
      label: o.label,
      triggers: apexTriggers
        .filter((t) => t.TableEnumOrId === o.name)
        .map((t) => t.Name),
      activeFlows: flows
        .filter(
          (f) =>
            f.ActiveVersionId !== null &&
            (f.DeveloperName.toLowerCase().includes(o.name.replace("__c", "").toLowerCase()) ||
              f.Label.toLowerCase().includes(o.label.toLowerCase()))
        )
        .map((f) => f.Label || f.DeveloperName),
      validationRuleCount: validationRules.filter(
        (r) => r.EntityDefinitionId === o.name
      ).length,
    }));

  return { customObjects: customObjects.slice(0, 60) };
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildPrompt(docType: DocType, data: unknown): string {
  const json = JSON.stringify(data, null, 2);

  const instructions: Record<DocType, string> = {
    "org-overview": `Write a comprehensive **Org Overview** document for this Salesforce org based on the metadata below.

Cover:
1. **Org Identity** — type (production/sandbox), key stats (user count, active flows, Apex classes)
2. **Automation Summary** — how many flows by type, Apex trigger coverage, what's automated vs manual
3. **Team & Access Structure** — profile distribution, how many users are admins, permission set architecture
4. **Code Footprint** — Apex class inventory overview, API versions in use
5. **Key Observations** — notable patterns, risks, or things a new architect should know immediately
6. **Open Questions** — what this metadata doesn't tell us, what a follow-up review should investigate

Write as if handing this to a new Salesforce architect joining the team.`,

    "automation-landscape": `Write a detailed **Automation Landscape** document for this Salesforce org based on the metadata below.

Cover:
1. **Flow Inventory** — breakdown by type (record-triggered before/after save, screen flows, scheduled, platform events). List notable flows by name.
2. **Apex Trigger Coverage** — which objects have triggers, which have multiple (execution order risk)
3. **Validation Rules** — how many per key objects, how many inactive rules are still deployed
4. **Undocumented Flows** — flows with no description (list them)
5. **Interaction Risks** — objects where flows AND triggers both run, potential order-of-execution issues
6. **Consolidation Opportunities** — where automation could be simplified
7. **Recommended Actions** — prioritized list of what to fix first

Be specific — name actual flows, triggers, and objects from the data.`,

    "security-model": `Write a detailed **Security Model** document for this Salesforce org based on the metadata below.

Cover:
1. **Admin Footprint** — how many System Administrator users, is this appropriate for the org size
2. **Profile Architecture** — which profiles have dangerous system permissions (Modify All Data, View All Data, Manage Users), flag as critical if non-admin profiles have these
3. **Permission Set Architecture** — total count, any with broad data access permissions, overall strategy
4. **Object-Level Access** — which objects have ModifyAll granted to many profiles/permission sets
5. **Risk Summary** — severity-ordered list of permission model risks
6. **Recommended Hardening** — specific steps to reduce the attack surface

Flag critical findings prominently. Be specific about profile names, permission set names, and user counts.`,

    "object-inventory": `Write a comprehensive **Custom Object Inventory** document for this Salesforce org based on the metadata below.

For each custom object, describe:
- Its apparent business purpose (inferred from the name)
- What automation is attached (flows, triggers, validation rules)
- Any notable patterns or concerns

Then provide:
1. **Objects with the Most Automation** — highlight complexity hotspots
2. **Objects with No Automation** — potentially missing business rules
3. **Naming Pattern Analysis** — are naming conventions consistent?
4. **Overall Schema Assessment** — size, complexity, maintainability

Be specific about object names and the automation attached.`,
  };

  return `${instructions[docType]}

---

## Org Metadata

\`\`\`json
${json}
\`\`\``;
}

// ─── Public generator ─────────────────────────────────────────────────────────

export interface GeneratedDoc {
  title: string;
  content: string;
}

const DOC_TITLES: Record<DocType, string> = {
  "org-overview": "Org Architecture Overview",
  "automation-landscape": "Automation Landscape",
  "security-model": "Security Model",
  "object-inventory": "Custom Object Inventory",
};

export async function generateDocument(
  conn: Connection,
  session: SessionData,
  docType: DocType
): Promise<GeneratedDoc> {
  let data: unknown;

  switch (docType) {
    case "org-overview":
      data = await collectOrgOverview(conn, session);
      break;
    case "automation-landscape":
      data = await collectAutomationLandscape(conn);
      break;
    case "security-model":
      data = await collectSecurityModel(conn);
      break;
    case "object-inventory":
      data = await collectObjectInventory(conn);
      break;
  }

  const ai = getAnthropicClient();
  const response = await ai.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPrompt(docType, data) }],
  });

  const content =
    response.content[0]?.type === "text" ? response.content[0].text : "(No content generated)";

  return { title: DOC_TITLES[docType], content };
}
