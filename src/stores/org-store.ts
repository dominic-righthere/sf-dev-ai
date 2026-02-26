import { create } from "zustand";

interface OrgState {
  isConnected: boolean;
  username: string | null;
  orgId: string | null;
  orgType: "production" | "sandbox" | null;
  instanceUrl: string | null;
  displayName: string | null;
  schemaLoaded: boolean;

  setOrg: (org: {
    username: string;
    orgId: string;
    orgType: "production" | "sandbox";
    instanceUrl: string;
    displayName: string;
  }) => void;
  setSchemaLoaded: (loaded: boolean) => void;
  disconnect: () => void;
}

export const useOrgStore = create<OrgState>((set) => ({
  isConnected: false,
  username: null,
  orgId: null,
  orgType: null,
  instanceUrl: null,
  displayName: null,
  schemaLoaded: false,

  setOrg: (org) =>
    set({
      isConnected: true,
      ...org,
    }),

  setSchemaLoaded: (loaded) => set({ schemaLoaded: loaded }),

  disconnect: () =>
    set({
      isConnected: false,
      username: null,
      orgId: null,
      orgType: null,
      instanceUrl: null,
      displayName: null,
      schemaLoaded: false,
    }),
}));
