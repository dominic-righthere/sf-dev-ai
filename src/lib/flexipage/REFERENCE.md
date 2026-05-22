# FlexiPage Metadata Reference

Internal reference for Salesforce FlexiPage metadata patterns. Built from official docs + org introspection.
Use `/api/salesforce/pages/introspect` to discover org-specific patterns.

## Region Types

| Type | Role | Source |
|------|------|--------|
| `Region` | Top-level layout region, maps to a grid area | Official Metadata API |
| `Facet` | Named slot referenced by container components via properties | Official Metadata API |

Facets are defined as regions with `type: "Facet"` and consumed by components that reference them by name via `componentInstanceProperties`. Every facet must be both defined and referenced — Salesforce validates this on deploy.

## Page Types

| Value | Description |
|-------|-------------|
| `AppPage` | Custom app page (Lightning App Builder) |
| `RecordPage` | Object record page |
| `HomePage` | Home page |
| `UtilityBar` | Utility bar (cannot be created in App Builder) |
| `EmailTemplatePage` | Email template page |

## Template → Layout Mapping

### Known Templates (hardcoded)

| Template Name | Layout | Region Names |
|---------------|--------|-------------|
| `flexipagedesigner__DefaultRecordPage` | HeaderAndRightSidebar | header, main, sidebar |
| `flexipagedesigner__RecordPage_Header_Sidebar` | HeaderAndRightSidebar | header, main, sidebar |
| `flexipagedesigner__DefaultMainTwoColTemplate` | HeaderAndTwoColumns | header, left, right |
| `flexipagedesigner__DefaultHomePage` | HeaderAndTwoColumns | header, left, right |
| `flexipagedesigner__RecordPage_TwoColumnsEqualWidth` | HeaderAndTwoColumns | header, left, right |
| `flexipagedesigner__AppPage_OneColumn` | OneColumn | main |
| `flexipage:recordHomeTemplateDesktop` | HeaderAndRightSidebar | header, main, sidebar |
| `flexipage:appHomeTemplateTwoColumns` | HeaderAndTwoColumns | header, left, right |
| `flexipage:defaultAppHomeTemplate` | OneColumn | main |
| `home:desktopTemplate` | HomeDesktop | top, bottomLeft, bottomRight, sidebar |

### Discovery

Template names are internal Salesforce component names. No official complete list exists.
New templates are discovered by:
1. Running the introspection endpoint against connected orgs
2. Inspecting `.flexipage-meta.xml` files in SFDX projects
3. Checking the `unknownTemplates` field in introspection results

## Container Components and Facet Properties

These components use facet references (property value = facet region name):

| Component Name | Facet Property | Children Type |
|----------------|---------------|---------------|
| `flexipage:tabSet` / `flexipage:tabset` | `tabs` | `flexipage:tab` |
| `flexipage:tab` | `body` | Content components |
| `flexipage:fieldSection` | `columns` | `flexipage:column` |
| `flexipage:column` | `body` | `flexipage:fieldInstance` |

Heuristic: Any property value that matches a facet name is treated as a facet reference.

## Standard Components

### Layout Components
| Metadata Name | Display Name | Notes |
|---------------|-------------|-------|
| `flexipage:tabSet` | TabSet | Container; also seen as `flexipage:tabset` (case varies) |
| `flexipage:tab` | Tab | Child of TabSet |
| `flexipage:fieldSection` | FieldSection | Contains columns |
| `flexipage:column` | Column | Contains field instances |
| `flexipage:fieldInstance` | FieldInstance | Properties: `fieldApiName`, `uiBehavior` (required/readonly) |

### Record Components
| Metadata Name | Display Name | Notes |
|---------------|-------------|-------|
| `force:highlightsPanel` | HighlightsPanel | Compact layout header |
| `force:detailPanel` | DetailPanel | Full record detail |
| `force:recordDetailPanel` | DetailPanel | Variant of detail panel |
| `force:detailPanelMobile` | DetailPanel | Mobile variant |
| `force:recordDetailPanelMobile` | DetailPanel | Mobile variant |
| `force:relatedListContainer` | RelatedList | Related lists for object |
| `force:relatedListSingleContainer` | RelatedList | Single related list |

### Activity & Social
| Metadata Name | Display Name | Notes |
|---------------|-------------|-------|
| `runtime_sales_activities:activityPanel` | ActivityPanel | Activity timeline |
| `forceChatter:recordFeedContainer` | ChatterFeed | Chatter feed |
| `runtime_sales_merge:mergeCandidatesPreviewCard` | MergeCandidatesPreview | Merge preview |

### Other Standard
| Metadata Name | Display Name | Notes |
|---------------|-------------|-------|
| `force:reportChart` | ReportChart | Embedded report chart |
| `flowruntime:interview` | FlowInterview | Embedded screen flow; props: `flowApiName`, `flowLayout` |
| `flexipage:filterListCard` | FilterListCard | Filtered list view; props: `entityName`, `filterName` |

### Home Page Components
| Metadata Name | Display Name | Notes |
|---------------|-------------|-------|
| `home:recentRecordContainer` | Recent Records | Recent items list |
| `home:topDealsContainer` | Key Deals | Opportunity highlights |
| `objectManager` | Object Manager | Object management widget |

## Standard Tab Titles

Tab labels in metadata use internal keys. Map to display names:

| Key | Display |
|-----|---------|
| `Standard.Tab.detail` | Details |
| `Standard.Tab.relatedLists` | Related |
| `Standard.Tab.activity` | Activity |
| `Standard.Tab.news` | News |
| `Standard.Tab.chatter` | Chatter |
| `Standard.Tab.relatedListQuickLinks` | Related |

## API Version Changes

### API v49+ (Summer '20)
`componentInstances` replaced by `itemInstances` wrapper:

**Before (v48-):**
```xml
<flexiPageRegions>
  <componentInstances>
    <componentName>force:highlightsPanel</componentName>
  </componentInstances>
  <name>header</name>
  <type>Region</type>
</flexiPageRegions>
```

**After (v49+):**
```xml
<flexiPageRegions>
  <itemInstances>
    <componentInstance>
      <componentName>force:highlightsPanel</componentName>
    </componentInstance>
  </itemInstances>
  <name>header</name>
  <type>Region</type>
</flexiPageRegions>
```

Our parser handles both formats: checks `componentInstances` first, falls back to unwrapping `itemInstances`.

## Fallback Behavior

When a template name is unknown, the parser:
1. Infers layout from region names (sidebar → HeaderAndRightSidebar, etc.)
2. Maps unknown region names heuristically (top/header → header area, sidebar/right → sidebar area, everything else → main)
3. All components render via GenericComponent with humanized names and property display
