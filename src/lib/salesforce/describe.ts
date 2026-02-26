import type Connection from "jsforce/lib/connection";
import { db } from "@/lib/db/client";
import { schemaCache } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { SObjectDescribe } from "./types";

const COMMON_OBJECTS = [
  "Account",
  "Contact",
  "Opportunity",
  "Lead",
  "Case",
  "Task",
  "Event",
  "User",
  "Campaign",
  "CampaignMember",
  "OpportunityLineItem",
  "Product2",
  "Pricebook2",
  "PricebookEntry",
  "Contract",
  "Order",
  "OrderItem",
];

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function describeObject(
  conn: Connection,
  orgId: string,
  objectName: string
): Promise<SObjectDescribe> {
  // Check cache first
  const cached = await getCachedDescribe(orgId, objectName);
  if (cached) return cached;

  // Fetch from Salesforce
  const result = await conn.describe(objectName);

  const describe: SObjectDescribe = {
    name: result.name,
    label: result.label,
    labelPlural: result.labelPlural,
    keyPrefix: result.keyPrefix || "",
    custom: result.custom,
    fields: result.fields.map((f) => ({
      name: f.name,
      label: f.label,
      type: f.type,
      length: f.length,
      precision: f.precision,
      scale: f.scale,
      nillable: f.nillable,
      unique: f.unique,
      createable: f.createable,
      updateable: f.updateable,
      defaultValue: f.defaultValue,
      picklistValues: (f.picklistValues || []).map((p) => ({
        value: p.value,
        label: p.label,
        active: p.active,
        defaultValue: p.defaultValue,
      })),
      referenceTo: f.referenceTo || [],
      relationshipName: f.relationshipName || null,
      calculated: f.calculated,
      custom: f.custom,
      externalId: f.externalId,
    })),
    recordTypeInfos: (result.recordTypeInfos || []).map((r) => ({
      recordTypeId: r.recordTypeId,
      name: r.name,
      available: r.available,
      defaultRecordTypeMapping: r.defaultRecordTypeMapping,
    })),
    childRelationships: (result.childRelationships || []).map((c) => ({
      childSObject: c.childSObject,
      field: c.field,
      relationshipName: c.relationshipName || null,
    })),
  };

  // Cache the result
  await cacheDescribe(orgId, objectName, describe);

  return describe;
}

export async function describeCommonObjects(
  conn: Connection,
  orgId: string
): Promise<void> {
  const promises = COMMON_OBJECTS.map((obj) =>
    describeObject(conn, orgId, obj).catch(() => null)
  );
  await Promise.allSettled(promises);
}

export async function getCachedDescribe(
  orgId: string,
  objectName: string
): Promise<SObjectDescribe | null> {
  const results = db
    .select()
    .from(schemaCache)
    .where(
      and(
        eq(schemaCache.orgId, orgId),
        eq(schemaCache.objectName, objectName)
      )
    )
    .all();

  if (results.length === 0) return null;

  const row = results[0]!;
  const age = Date.now() - row.cachedAt.getTime();
  if (age > CACHE_TTL_MS) return null;

  return JSON.parse(row.describeJson) as SObjectDescribe;
}

async function cacheDescribe(
  orgId: string,
  objectName: string,
  describe: SObjectDescribe
): Promise<void> {
  const id = `${orgId}:${objectName}`;
  const now = new Date();

  db.insert(schemaCache)
    .values({
      id,
      orgId,
      objectName,
      describeJson: JSON.stringify(describe),
      cachedAt: now,
    })
    .onConflictDoUpdate({
      target: schemaCache.id,
      set: {
        describeJson: JSON.stringify(describe),
        cachedAt: now,
      },
    })
    .run();
}

export async function searchSchema(
  orgId: string,
  query: string
): Promise<Array<{ objectName: string; fields: Array<{ name: string; label: string; type: string }> }>> {
  const allCached = db
    .select()
    .from(schemaCache)
    .where(eq(schemaCache.orgId, orgId))
    .all();

  const q = query.toLowerCase();
  const results: Array<{
    objectName: string;
    fields: Array<{ name: string; label: string; type: string }>;
  }> = [];

  for (const row of allCached) {
    const describe = JSON.parse(row.describeJson) as SObjectDescribe;
    const matchingFields = describe.fields.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.label.toLowerCase().includes(q)
    );

    if (
      describe.name.toLowerCase().includes(q) ||
      describe.label.toLowerCase().includes(q) ||
      matchingFields.length > 0
    ) {
      results.push({
        objectName: describe.name,
        fields: (matchingFields.length > 0 ? matchingFields : describe.fields.slice(0, 10)).map(
          (f) => ({ name: f.name, label: f.label, type: f.type })
        ),
      });
    }
  }

  return results;
}

export function buildSchemaContext(
  orgId: string,
  objectNames: string[]
): string {
  const allCached = db
    .select()
    .from(schemaCache)
    .where(eq(schemaCache.orgId, orgId))
    .all();

  const cachedMap = new Map(
    allCached.map((r) => [r.objectName, JSON.parse(r.describeJson) as SObjectDescribe])
  );

  const lines: string[] = ["## Available Salesforce Objects\n"];

  for (const name of objectNames) {
    const desc = cachedMap.get(name);
    if (!desc) continue;

    lines.push(`### ${desc.name} (${desc.label})`);
    lines.push("Fields:");
    for (const f of desc.fields.slice(0, 30)) {
      const attrs = [f.type];
      if (!f.nillable) attrs.push("required");
      if (f.referenceTo.length > 0) attrs.push(`ref:${f.referenceTo.join(",")}`);
      lines.push(`  - ${f.name} (${f.label}) [${attrs.join(", ")}]`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
