import { create } from "zustand";
import type { UserAssignment, ObjectAccessEntry, FieldAccessEntry, PermissionSetGroupInfo } from "@/lib/salesforce/rbac";

type ViewMode = "users" | "objectAudit" | "fieldAudit" | "comparison" | "unassigned";

interface RbacState {
  viewMode: ViewMode;
  users: UserAssignment[];
  selectedUserId: string | null;
  selectedUser: UserAssignment | null;
  objectAuditName: string;
  objectAuditEntries: ObjectAccessEntry[];
  fieldAuditObject: string;
  fieldAuditField: string;
  fieldAuditEntries: FieldAccessEntry[];
  groups: PermissionSetGroupInfo[];
  unassigned: { id: string; name: string; label: string }[];
  compareUserIds: [string | null, string | null];
  isLoading: boolean;
  error: string | null;

  setViewMode: (mode: ViewMode) => void;
  setUsers: (users: UserAssignment[]) => void;
  setSelectedUserId: (id: string | null) => void;
  setObjectAudit: (name: string, entries: ObjectAccessEntry[]) => void;
  setFieldAudit: (object: string, field: string, entries: FieldAccessEntry[]) => void;
  setGroups: (groups: PermissionSetGroupInfo[]) => void;
  setUnassigned: (items: { id: string; name: string; label: string }[]) => void;
  setCompareUserIds: (ids: [string | null, string | null]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useRbacStore = create<RbacState>((set, get) => ({
  viewMode: "users",
  users: [],
  selectedUserId: null,
  selectedUser: null,
  objectAuditName: "",
  objectAuditEntries: [],
  fieldAuditObject: "",
  fieldAuditField: "",
  fieldAuditEntries: [],
  groups: [],
  unassigned: [],
  compareUserIds: [null, null],
  isLoading: false,
  error: null,

  setViewMode: (mode) => set({ viewMode: mode }),
  setUsers: (users) => set({ users }),
  setSelectedUserId: (id) => {
    const user = id ? get().users.find((u) => u.userId === id) || null : null;
    set({ selectedUserId: id, selectedUser: user });
  },
  setObjectAudit: (name, entries) => set({ objectAuditName: name, objectAuditEntries: entries }),
  setFieldAudit: (object, field, entries) =>
    set({ fieldAuditObject: object, fieldAuditField: field, fieldAuditEntries: entries }),
  setGroups: (groups) => set({ groups }),
  setUnassigned: (items) => set({ unassigned: items }),
  setCompareUserIds: (ids) => set({ compareUserIds: ids }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
