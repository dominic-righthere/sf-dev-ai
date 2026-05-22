import type { ComponentType } from "react";
import type { ParsedComponentNode } from "@/lib/flexipage/types";

import { HighlightsPanel } from "./highlights-panel";
import { FieldSection } from "./field-section";
import { TabSet } from "./tab-set";
import { RelatedList } from "./related-list";
import { DetailPanel } from "./detail-panel";
import { GenericComponent } from "./generic-component";
import { FieldInstance } from "./field-instance";
import { FlowInterview } from "./flow-interview";
import { ChatterFeed } from "./chatter-feed";
import { ActivityPanel } from "./activity-panel";
import { FilterListCard } from "./filter-list-card";

export const COMPONENT_REGISTRY: Record<
  string,
  ComponentType<{ component: ParsedComponentNode }>
> = {
  HighlightsPanel,
  FieldSection,
  TabSet,
  RelatedList,
  DetailPanel,
  FieldInstance,
  FlowInterview,
  ChatterFeed,
  ActivityPanel,
  FilterListCard,
  Column: FieldSection,
  Tab: GenericComponent,
  ReportChart: GenericComponent,
  MergeCandidatesPreview: GenericComponent,
};

export function getComponent(
  type: string
): ComponentType<{ component: ParsedComponentNode }> {
  return COMPONENT_REGISTRY[type] || GenericComponent;
}

export { GenericComponent };
