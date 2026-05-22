import type {
  FlexiPageMetadata,
  FlexiPageRegion,
  ComponentInstance,
  ComponentProperty,
  ItemInstance,
  ParsedPage,
  ParsedRegion,
  ParsedComponentNode,
} from "./types";
import { STANDARD_TAB_TITLES } from "./types";
import { detectLayout, getGridArea } from "./layouts";

const COMPONENT_NAME_MAP: Record<string, string> = {
  "force:highlightsPanel": "HighlightsPanel",
  "force:detailPanel": "DetailPanel",
  "force:detailPanelMobile": "DetailPanel",
  "force:recordDetailPanel": "DetailPanel",
  "force:recordDetailPanelMobile": "DetailPanel",
  "force:relatedListContainer": "RelatedList",
  "force:relatedListSingleContainer": "RelatedList",
  "flexipage:fieldSection": "FieldSection",
  "flexipage:column": "Column",
  "flexipage:tabSet": "TabSet",
  "flexipage:tabset": "TabSet",
  "flexipage:tab": "Tab",
  "flexipage:fieldInstance": "FieldInstance",
  "runtime_sales_activities:activityPanel": "ActivityPanel",
  "force:reportChart": "ReportChart",
  "flowruntime:interview": "FlowInterview",
  "forceChatter:recordFeedContainer": "ChatterFeed",
  "flexipage:filterListCard": "FilterListCard",
  "runtime_sales_merge:mergeCandidatesPreviewCard": "MergeCandidatesPreview",
};

/** Properties that reference facets for known container components */
const FACET_PROPERTIES: Record<string, string[]> = {
  "flexipage:tabset": ["tabs"],
  "flexipage:tabSet": ["tabs"],
  "flexipage:tab": ["body"],
  "flexipage:fieldSection": ["columns"],
  "flexipage:column": ["body"],
};

function normalizeComponentName(name: string): string {
  if (COMPONENT_NAME_MAP[name]) return COMPONENT_NAME_MAP[name];
  const parts = name.split(":");
  const last = parts[parts.length - 1] || name;
  return last.charAt(0).toUpperCase() + last.slice(1);
}

function toArray<T>(value: T[] | T | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseProperties(
  props: ComponentProperty[] | ComponentProperty | undefined
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const p of toArray(props)) {
    if (p.name && p.value !== undefined) {
      result[p.name] = String(p.value);
    }
  }
  return result;
}

/** Unwrap componentInstances from a region, handling itemInstances wrapper */
function getComponentInstances(region: FlexiPageRegion): ComponentInstance[] {
  const direct = toArray(region.componentInstances);
  if (direct.length > 0) return direct;

  // API v49+ wraps in itemInstances
  const items = toArray(region.itemInstances);
  const unwrapped: ComponentInstance[] = [];
  for (const item of items) {
    if (item.componentInstance) {
      unwrapped.push(item.componentInstance);
    }
  }
  return unwrapped;
}

let idCounter = 0;

function buildNode(
  instance: ComponentInstance,
  facetMap: Map<string, ComponentInstance[]>
): ParsedComponentNode {
  const properties = parseProperties(instance.componentInstanceProperties);
  const type = normalizeComponentName(instance.componentName);
  let label = properties.label || properties.title || type;

  // Resolve standard tab titles
  if (label in STANDARD_TAB_TITLES) {
    label = STANDARD_TAB_TITLES[label]!;
  }

  const children: ParsedComponentNode[] = [];

  // Resolve facet references for known container components
  const knownFacetProps = FACET_PROPERTIES[instance.componentName];
  const resolvedFacetNames = new Set<string>();

  if (knownFacetProps) {
    for (const propName of knownFacetProps) {
      const facetName = properties[propName];
      if (facetName && facetMap.has(facetName)) {
        resolvedFacetNames.add(facetName);
        const facetInstances = facetMap.get(facetName)!;
        for (const child of facetInstances) {
          children.push(buildNode(child, facetMap));
        }
      }
    }
  }

  // Heuristic fallback: any property value that matches a facet name
  for (const [, value] of Object.entries(properties)) {
    if (value && facetMap.has(value) && !resolvedFacetNames.has(value)) {
      resolvedFacetNames.add(value);
      const facetInstances = facetMap.get(value)!;
      for (const child of facetInstances) {
        children.push(buildNode(child, facetMap));
      }
    }
  }

  return {
    id: `node-${idCounter++}`,
    type,
    originalName: instance.componentName,
    properties,
    label,
    children,
  };
}

export function parseFlexiPage(raw: FlexiPageMetadata): ParsedPage {
  idCounter = 0;
  const allRegions = toArray(raw.flexiPageRegions);
  const templateName = raw.template?.name || "";

  // Pass 1: Separate top-level Regions from Facets
  const topLevelRegions: FlexiPageRegion[] = [];
  const facetMap = new Map<string, ComponentInstance[]>();

  for (const region of allRegions) {
    if (region.type === "Facet") {
      facetMap.set(region.name, getComponentInstances(region));
    } else {
      topLevelRegions.push(region);
    }
  }

  const regionNames = topLevelRegions.map((r) => r.name);
  const layoutType = detectLayout(templateName, regionNames);

  // Pass 2: Build tree for each top-level region
  const parsedRegions: ParsedRegion[] = topLevelRegions.map((region) => {
    const instances = getComponentInstances(region);
    const components = instances.map((inst) => buildNode(inst, facetMap));
    const gridArea = getGridArea(layoutType, region.name);

    return {
      name: region.name,
      gridArea,
      components,
    };
  });

  return {
    name: raw.fullName,
    label: raw.masterLabel || raw.fullName,
    pageType: raw.type || "Unknown",
    sobjectType: raw.sobjectType,
    layoutType,
    regions: parsedRegions,
  };
}
