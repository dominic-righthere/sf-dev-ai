import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";
import { getCached, setCache } from "@/lib/db/cache";
import type { FlexiPageMetadata, FlexiPageRegion, ComponentInstance, ItemInstance } from "@/lib/flexipage/types";

interface TemplateInfo {
  templateName: string;
  regionNames: string[];
  regionTypes: string[];
  pageCount: number;
  examplePages: string[];
}

interface ComponentInfo {
  componentName: string;
  count: number;
  facetProperties: string[];
  examplePages: string[];
}

interface IntrospectionResult {
  totalPages: number;
  templates: TemplateInfo[];
  components: ComponentInfo[];
  regionNamePatterns: Record<string, string[]>; // regionName → which templates use it
  unknownTemplates: string[];
}

function toArray<T>(value: T[] | T | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getInstances(region: FlexiPageRegion): ComponentInstance[] {
  const direct = toArray(region.componentInstances as ComponentInstance[] | ComponentInstance | undefined);
  if (direct.length > 0) return direct;
  const items = toArray(region.itemInstances as ItemInstance[] | ItemInstance | undefined);
  return items
    .filter((item): item is ItemInstance & { componentInstance: ComponentInstance } => !!item.componentInstance)
    .map((item) => item.componentInstance);
}

function extractFacetProps(instance: ComponentInstance, facetNames: Set<string>): string[] {
  const props = toArray(instance.componentInstanceProperties);
  return props
    .filter((p) => p.value && facetNames.has(String(p.value)))
    .map((p) => p.name);
}

function analyzePage(
  page: FlexiPageMetadata,
  templates: Map<string, TemplateInfo>,
  components: Map<string, ComponentInfo>,
  regionPatterns: Map<string, Set<string>>
): void {
  const templateName = page.template?.name || "(none)";
  const regions = toArray(page.flexiPageRegions);

  // Collect facet names for reference detection
  const facetNames = new Set<string>();
  for (const r of regions) {
    if (r.type === "Facet") facetNames.add(r.name);
  }

  // Template info
  const topLevelRegions = regions.filter((r) => r.type !== "Facet");
  const tplKey = templateName;
  const tpl = templates.get(tplKey) || {
    templateName,
    regionNames: [],
    regionTypes: [],
    pageCount: 0,
    examplePages: [],
  };
  tpl.pageCount++;
  if (tpl.examplePages.length < 3) tpl.examplePages.push(page.fullName);

  for (const r of topLevelRegions) {
    if (!tpl.regionNames.includes(r.name)) tpl.regionNames.push(r.name);
    if (r.type && !tpl.regionTypes.includes(r.type)) tpl.regionTypes.push(r.type);

    // Track region name → template mapping
    const patternSet = regionPatterns.get(r.name) || new Set();
    patternSet.add(templateName);
    regionPatterns.set(r.name, patternSet);
  }
  templates.set(tplKey, tpl);

  // Component info
  for (const r of regions) {
    for (const inst of getInstances(r)) {
      const key = inst.componentName;
      const comp = components.get(key) || {
        componentName: key,
        count: 0,
        facetProperties: [],
        examplePages: [],
      };
      comp.count++;
      if (comp.examplePages.length < 2 && !comp.examplePages.includes(page.fullName)) {
        comp.examplePages.push(page.fullName);
      }

      const facetProps = extractFacetProps(inst, facetNames);
      for (const fp of facetProps) {
        if (!comp.facetProperties.includes(fp)) comp.facetProperties.push(fp);
      }

      components.set(key, comp);
    }
  }
}

const KNOWN_TEMPLATES = new Set([
  "flexipagedesigner__DefaultMainTwoColTemplate",
  "flexipagedesigner__DefaultRecordPage",
  "flexipagedesigner__RecordPage_Header_Sidebar",
  "flexipagedesigner__DefaultHomePage",
  "flexipagedesigner__RecordPage_TwoColumnsEqualWidth",
  "flexipagedesigner__AppPage_OneColumn",
  "flexipage:recordHomeTemplateDesktop",
  "flexipage:appHomeTemplateTwoColumns",
  "flexipage:defaultAppHomeTemplate",
  "home:desktopTemplate",
]);

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const orgId = session.orgId || "unknown";

  // Check cache first (reuse flexiPages cache for the page list)
  const cachedResult = await getCached<IntrospectionResult>(orgId, "flexiPages", "introspect");
  if (cachedResult) return Response.json(cachedResult);

  const conn = createConnection(session);

  // Step 1: Get all page names
  const listResult = await conn.metadata.list([{ type: "FlexiPage" }]);
  const items = Array.isArray(listResult) ? listResult : listResult ? [listResult] : [];
  const pageNames = items.map((p: { fullName: string }) => p.fullName);

  // Step 2: Batch-read all pages (metadata.read supports up to 10 at a time)
  const templates = new Map<string, TemplateInfo>();
  const components = new Map<string, ComponentInfo>();
  const regionPatterns = new Map<string, Set<string>>();
  const BATCH_SIZE = 10;

  for (let i = 0; i < pageNames.length; i += BATCH_SIZE) {
    const batch = pageNames.slice(i, i + BATCH_SIZE);
    try {
      const results = await conn.metadata.read("FlexiPage", batch);
      const pages = Array.isArray(results) ? results : [results];
      for (const page of pages) {
        if (page && page.fullName) {
          analyzePage(page as unknown as FlexiPageMetadata, templates, components, regionPatterns);
        }
      }
    } catch {
      // If a batch fails, skip it and continue
    }
  }

  // Build result
  const result: IntrospectionResult = {
    totalPages: pageNames.length,
    templates: Array.from(templates.values()).sort((a, b) => b.pageCount - a.pageCount),
    components: Array.from(components.values()).sort((a, b) => b.count - a.count),
    regionNamePatterns: Object.fromEntries(
      Array.from(regionPatterns.entries()).map(([k, v]) => [k, Array.from(v)])
    ),
    unknownTemplates: Array.from(templates.values())
      .filter((t) => !KNOWN_TEMPLATES.has(t.templateName))
      .map((t) => t.templateName),
  };

  await setCache(orgId, "flexiPages", result, "introspect");
  return Response.json(result);
}
