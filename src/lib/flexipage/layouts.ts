export interface LayoutDefinition {
  gridTemplate: string;
  gridAreas: Record<string, string>;
}

const LAYOUTS: Record<string, LayoutDefinition> = {
  HeaderAndTwoColumns: {
    gridTemplate: `
      "header header" auto
      "left right" 1fr
      / 1fr 1fr
    `,
    gridAreas: {
      header: "header",
      Facet: "header",
      top: "header",
      left: "left",
      main: "left",
      bottomLeft: "left",
      right: "right",
      sidebar: "right",
      bottomRight: "right",
    },
  },
  HeaderAndRightSidebar: {
    gridTemplate: `
      "header header header" auto
      "main main sidebar" 1fr
      / 2fr 0 1fr
    `,
    gridAreas: {
      header: "header",
      Facet: "header",
      main: "main",
      left: "main",
      right: "sidebar",
      sidebar: "sidebar",
    },
  },
  HomeDesktop: {
    gridTemplate: `
      "top top sidebar" auto
      "bleft bright sidebar" 1fr
      / 1fr 1fr 1fr
    `,
    gridAreas: {
      top: "top",
      header: "top",
      bottomLeft: "bleft",
      bottomRight: "bright",
      sidebar: "sidebar",
      main: "top",
    },
  },
  OneColumn: {
    gridTemplate: `
      "main" 1fr
      / 1fr
    `,
    gridAreas: {
      header: "main",
      main: "main",
      Facet: "main",
    },
  },
};

const TEMPLATE_NAME_MAP: Record<string, string> = {
  // flexipagedesigner__ prefixed (App Builder internal)
  flexipagedesigner__DefaultMainTwoColTemplate: "HeaderAndTwoColumns",
  flexipagedesigner__DefaultRecordPage: "HeaderAndRightSidebar",
  flexipagedesigner__RecordPage_Header_Sidebar: "HeaderAndRightSidebar",
  flexipagedesigner__DefaultHomePage: "HeaderAndTwoColumns",
  flexipagedesigner__RecordPage_TwoColumnsEqualWidth: "HeaderAndTwoColumns",
  flexipagedesigner__AppPage_OneColumn: "OneColumn",
  // flexipage: prefixed (standard templates)
  "flexipage:recordHomeTemplateDesktop": "HeaderAndRightSidebar",
  "flexipage:appHomeTemplateTwoColumns": "HeaderAndTwoColumns",
  "flexipage:defaultAppHomeTemplate": "OneColumn",
  // home: prefixed (home page templates)
  "home:desktopTemplate": "HomeDesktop",
};

/** Heuristic: map unknown region names to a grid area based on naming patterns */
function inferGridArea(regionName: string, layoutType: string): string {
  const lower = regionName.toLowerCase();

  // Header/top patterns
  if (lower === "top" || lower === "header" || lower === "banner" || lower.startsWith("header")) {
    const layout = LAYOUTS[layoutType];
    if (layout) {
      // Find the first "header-like" grid area in this layout
      for (const area of ["header", "top"]) {
        if (Object.values(layout.gridAreas).includes(area)) return area;
      }
    }
    return "header";
  }

  // Sidebar/right patterns
  if (lower === "sidebar" || lower === "right" || lower.includes("sidebar") || lower.includes("right")) {
    return "sidebar";
  }

  // Left/main patterns
  if (lower === "left" || lower === "main" || lower.includes("left") || lower.includes("main") || lower.includes("content") || lower.includes("center")) {
    return "main";
  }

  // Bottom patterns — map to main area
  if (lower.startsWith("bottom") || lower.startsWith("footer")) {
    return "main";
  }

  // Column patterns (column1, column2, etc.)
  if (lower.startsWith("column")) {
    return "main";
  }

  // Unknown — fall back to main
  return "main";
}

export function detectLayout(templateName: string, regionNames: string[]): string {
  // Match by template name
  if (templateName && TEMPLATE_NAME_MAP[templateName]) {
    return TEMPLATE_NAME_MAP[templateName];
  }

  // Infer from region names
  const has = (n: string) => regionNames.includes(n);

  if (has("top") && (has("bottomLeft") || has("bottomRight")) && has("sidebar")) {
    return "HomeDesktop";
  }
  if (has("sidebar") || has("right")) {
    return "HeaderAndRightSidebar";
  }
  if (has("left") && has("right")) {
    return "HeaderAndTwoColumns";
  }

  return "OneColumn";
}

export function getLayoutDefinition(layoutType: string): LayoutDefinition {
  return LAYOUTS[layoutType] ?? LAYOUTS.OneColumn!;
}

export function getGridArea(layoutType: string, regionName: string): string {
  const layout = getLayoutDefinition(layoutType);
  // Exact match first
  if (layout.gridAreas[regionName]) {
    return layout.gridAreas[regionName];
  }
  // Heuristic fallback for unknown region names
  return inferGridArea(regionName, layoutType);
}

/** Register a template → layout mapping at runtime (from org introspection) */
export function registerTemplate(templateName: string, layoutType: string): void {
  TEMPLATE_NAME_MAP[templateName] = layoutType;
}

/** Get all known template mappings (for diagnostics/introspection) */
export function getTemplateMappings(): Record<string, string> {
  return { ...TEMPLATE_NAME_MAP };
}
