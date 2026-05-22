import { db } from "./client";
import { metadataCache } from "./schema";
import { eq, and } from "drizzle-orm";

type CacheType =
  | "objectList"
  | "permissionSets"
  | "profiles"
  | "flows"
  | "flexiPages"
  | "orgInfo"
  | "orgLimits"
  | "rbacAssignments"
  | "healthScan"
  | "technicalDebt";

const TTL_MS: Record<CacheType, number> = {
  orgLimits: 5 * 60 * 1000,
  orgInfo: 30 * 60 * 1000,
  objectList: 60 * 60 * 1000,
  permissionSets: 60 * 60 * 1000,
  profiles: 60 * 60 * 1000,
  flows: 60 * 60 * 1000,
  flexiPages: 60 * 60 * 1000,
  rbacAssignments: 60 * 60 * 1000,
  healthScan: 30 * 60 * 1000,
  technicalDebt: 30 * 60 * 1000,
};

function cacheId(orgId: string, cacheType: string, cacheKey?: string): string {
  return cacheKey ? `${orgId}:${cacheType}:${cacheKey}` : `${orgId}:${cacheType}`;
}

export async function getCached<T>(
  orgId: string,
  cacheType: CacheType,
  cacheKey?: string
): Promise<T | null> {
  const id = cacheId(orgId, cacheType, cacheKey);
  const rows = await db
    .select()
    .from(metadataCache)
    .where(eq(metadataCache.id, id));

  if (rows.length === 0) return null;

  const row = rows[0]!;
  const age = Date.now() - row.cachedAt.getTime();
  if (age > TTL_MS[cacheType]) return null;

  return JSON.parse(row.dataJson) as T;
}

export async function setCache(
  orgId: string,
  cacheType: CacheType,
  data: unknown,
  cacheKey?: string
): Promise<void> {
  const id = cacheId(orgId, cacheType, cacheKey);
  const now = new Date();
  const dataJson = JSON.stringify(data);

  await db
    .insert(metadataCache)
    .values({ id, orgId, cacheType, cacheKey: cacheKey ?? null, dataJson, cachedAt: now })
    .onConflictDoUpdate({
      target: metadataCache.id,
      set: { dataJson, cachedAt: now },
    });
}

export async function invalidateCache(
  orgId: string,
  cacheType?: CacheType
): Promise<void> {
  if (cacheType) {
    await db
      .delete(metadataCache)
      .where(
        and(
          eq(metadataCache.orgId, orgId),
          eq(metadataCache.cacheType, cacheType)
        )
      );
  } else {
    await db
      .delete(metadataCache)
      .where(eq(metadataCache.orgId, orgId));
  }
}
