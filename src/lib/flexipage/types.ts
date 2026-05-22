// Raw metadata shape from Salesforce
export interface FlexiPageMetadata {
  fullName: string;
  masterLabel?: string;
  type?: string;
  sobjectType?: string;
  template?: { name?: string };
  flexiPageRegions?: FlexiPageRegion[] | FlexiPageRegion;
  [key: string]: unknown;
}

export interface FlexiPageRegion {
  name: string;
  type?: string;
  mode?: string;
  componentInstances?: ComponentInstance[] | ComponentInstance;
  itemInstances?: ItemInstance[] | ItemInstance;
  [key: string]: unknown;
}

export interface ItemInstance {
  componentInstance?: ComponentInstance;
  [key: string]: unknown;
}

export interface ComponentInstance {
  componentName: string;
  identifier?: string;
  componentInstanceProperties?: ComponentProperty[] | ComponentProperty;
  [key: string]: unknown;
}

export interface ComponentProperty {
  name: string;
  value?: string;
  [key: string]: unknown;
}

// Parsed types for rendering
export interface ParsedPage {
  name: string;
  label: string;
  pageType: string;
  sobjectType?: string;
  layoutType: string;
  regions: ParsedRegion[];
}

export interface ParsedRegion {
  name: string;
  gridArea: string;
  components: ParsedComponentNode[];
}

export interface ParsedComponentNode {
  id: string;
  type: string;
  originalName: string;
  properties: Record<string, string>;
  label: string;
  children: ParsedComponentNode[];
}

/** @deprecated Use ParsedComponentNode instead */
export type ParsedComponent = ParsedComponentNode;

export const STANDARD_TAB_TITLES: Record<string, string> = {
  "Standard.Tab.detail": "Details",
  "Standard.Tab.relatedLists": "Related",
  "Standard.Tab.activity": "Activity",
  "Standard.Tab.news": "News",
  "Standard.Tab.chatter": "Chatter",
  "Standard.Tab.relatedListQuickLinks": "Related",
};
