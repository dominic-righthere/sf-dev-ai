import { create } from "zustand";

export interface OrgConnection {
  id: string;
  orgId: string;
  sfUserId: string;
  username: string;
  displayName: string;
  instanceUrl: string;
  orgType: "production" | "sandbox";
  orgLabel: string | null;
  connectedAt: string;
  lastUsedAt: string;
}

interface OrgsState {
  orgs: OrgConnection[];
  isLoading: boolean;
  setOrgs: (orgs: OrgConnection[]) => void;
  setLoading: (loading: boolean) => void;
  updateOrgLabel: (connectionId: string, label: string | null) => void;
  removeOrg: (connectionId: string) => void;
}

export const useOrgsStore = create<OrgsState>((set) => ({
  orgs: [],
  isLoading: false,

  setOrgs: (orgs) => set({ orgs }),
  setLoading: (loading) => set({ isLoading: loading }),

  updateOrgLabel: (connectionId, label) =>
    set((state) => ({
      orgs: state.orgs.map((o) =>
        o.id === connectionId ? { ...o, orgLabel: label } : o
      ),
    })),

  removeOrg: (connectionId) =>
    set((state) => ({
      orgs: state.orgs.filter((o) => o.id !== connectionId),
    })),
}));
