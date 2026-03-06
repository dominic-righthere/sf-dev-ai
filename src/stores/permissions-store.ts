import { create } from "zustand";

export interface PermissionListItem {
  fullName: string;
  type: "PermissionSet" | "Profile";
  lastModifiedDate?: string;
  lastModifiedByName?: string;
  manageableState?: string;
}

export interface ObjectPermission {
  object: string;
  allowCreate: boolean;
  allowRead: boolean;
  allowEdit: boolean;
  allowDelete: boolean;
  viewAllRecords: boolean;
  modifyAllRecords: boolean;
}

export interface FieldPermission {
  field: string;
  readable: boolean;
  editable: boolean;
}

export interface PermissionDetail {
  fullName: string;
  label?: string;
  description?: string;
  objectPermissions: ObjectPermission[];
  fieldPermissions: FieldPermission[];
}

type DetailTab = "objectPermissions" | "fieldPermissions";

interface PermissionsState {
  permissionSets: PermissionListItem[];
  profiles: PermissionListItem[];
  selectedName: string | null;
  selectedType: "PermissionSet" | "Profile" | null;
  selectedDetail: PermissionDetail | null;
  search: string;
  detailTab: DetailTab;
  isLoadingList: boolean;
  isLoadingDetail: boolean;
  error: string | null;

  setPermissionSets: (items: PermissionListItem[]) => void;
  setProfiles: (items: PermissionListItem[]) => void;
  setSelected: (name: string, type: "PermissionSet" | "Profile") => void;
  setSelectedDetail: (detail: PermissionDetail | null) => void;
  setSearch: (search: string) => void;
  setDetailTab: (tab: DetailTab) => void;
  setIsLoadingList: (loading: boolean) => void;
  setIsLoadingDetail: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePermissionsStore = create<PermissionsState>((set) => ({
  permissionSets: [],
  profiles: [],
  selectedName: null,
  selectedType: null,
  selectedDetail: null,
  search: "",
  detailTab: "objectPermissions",
  isLoadingList: false,
  isLoadingDetail: false,
  error: null,

  setPermissionSets: (items) => set({ permissionSets: items }),
  setProfiles: (items) => set({ profiles: items }),
  setSelected: (name, type) => set({ selectedName: name, selectedType: type, selectedDetail: null, detailTab: "objectPermissions" }),
  setSelectedDetail: (detail) => set({ selectedDetail: detail }),
  setSearch: (search) => set({ search }),
  setDetailTab: (tab) => set({ detailTab: tab }),
  setIsLoadingList: (loading) => set({ isLoadingList: loading }),
  setIsLoadingDetail: (loading) => set({ isLoadingDetail: loading }),
  setError: (error) => set({ error }),
}));
