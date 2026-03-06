import { create } from "zustand";

export interface SObjectListItem {
  name: string;
  label: string;
  keyPrefix: string | null;
  custom: boolean;
  queryable: boolean;
  createable: boolean;
  updateable: boolean;
  deletable: boolean;
  fieldCount?: number;
}

export interface FieldDetail {
  name: string;
  label: string;
  type: string;
  length: number;
  custom: boolean;
  required: boolean;
  unique: boolean;
  externalId: boolean;
  nillable: boolean;
  defaultValue: unknown;
  picklistValues?: { value: string; label: string; active: boolean }[];
  referenceTo?: string[];
  relationshipName?: string;
  calculatedFormula?: string;
  inlineHelpText?: string;
}

export interface ValidationRule {
  fullName: string;
  active: boolean;
  description?: string;
  errorConditionFormula: string;
  errorDisplayField?: string;
  errorMessage: string;
}

export interface ObjectDetail {
  name: string;
  label: string;
  labelPlural: string;
  keyPrefix: string | null;
  custom: boolean;
  fields: FieldDetail[];
  validationRules: ValidationRule[];
  childRelationships: { childSObject: string; field: string; relationshipName: string | null }[];
}

type FilterMode = "all" | "standard" | "custom";
type DetailTab = "fields" | "validationRules" | "relationships";

interface ObjectsState {
  objects: SObjectListItem[];
  filteredObjects: SObjectListItem[];
  selectedObjectName: string | null;
  selectedObjectDetail: ObjectDetail | null;
  search: string;
  filter: FilterMode;
  detailTab: DetailTab;
  isLoadingList: boolean;
  isLoadingDetail: boolean;
  error: string | null;

  setObjects: (objects: SObjectListItem[]) => void;
  setSelectedObjectName: (name: string | null) => void;
  setSelectedObjectDetail: (detail: ObjectDetail | null) => void;
  setSearch: (search: string) => void;
  setFilter: (filter: FilterMode) => void;
  setDetailTab: (tab: DetailTab) => void;
  setIsLoadingList: (loading: boolean) => void;
  setIsLoadingDetail: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

function applyFilters(objects: SObjectListItem[], search: string, filter: FilterMode): SObjectListItem[] {
  let result = objects;
  if (filter === "custom") result = result.filter((o) => o.custom);
  else if (filter === "standard") result = result.filter((o) => !o.custom);
  if (search) {
    const q = search.toLowerCase();
    result = result.filter((o) => o.name.toLowerCase().includes(q) || o.label.toLowerCase().includes(q));
  }
  return result;
}

export const useObjectsStore = create<ObjectsState>((set, get) => ({
  objects: [],
  filteredObjects: [],
  selectedObjectName: null,
  selectedObjectDetail: null,
  search: "",
  filter: "all",
  detailTab: "fields",
  isLoadingList: false,
  isLoadingDetail: false,
  error: null,

  setObjects: (objects) => set({ objects, filteredObjects: applyFilters(objects, get().search, get().filter) }),
  setSelectedObjectName: (name) => set({ selectedObjectName: name, selectedObjectDetail: null, detailTab: "fields" }),
  setSelectedObjectDetail: (detail) => set({ selectedObjectDetail: detail }),
  setSearch: (search) => set({ search, filteredObjects: applyFilters(get().objects, search, get().filter) }),
  setFilter: (filter) => set({ filter, filteredObjects: applyFilters(get().objects, get().search, filter) }),
  setDetailTab: (tab) => set({ detailTab: tab }),
  setIsLoadingList: (loading) => set({ isLoadingList: loading }),
  setIsLoadingDetail: (loading) => set({ isLoadingDetail: loading }),
  setError: (error) => set({ error }),
}));
