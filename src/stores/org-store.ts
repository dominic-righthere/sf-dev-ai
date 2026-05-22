import { create } from "zustand";

interface OrgState {
  isConnected: boolean;
  username: string | null;
  orgId: string | null;
  orgType: "production" | "sandbox" | null;
  instanceUrl: string | null;
  displayName: string | null;
  schemaLoaded: boolean;
  appUserId: string | null;
  orgConnectionId: string | null;
  sfUserId: string | null;

  setOrg: (org: {
    username: string;
    orgId: string;
    orgType: "production" | "sandbox";
    instanceUrl: string;
    displayName: string;
    appUserId?: string;
    orgConnectionId?: string;
    sfUserId?: string;
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
  appUserId: null,
  orgConnectionId: null,
  sfUserId: null,

  setOrg: (org) =>
    set({
      isConnected: true,
      username: org.username,
      orgId: org.orgId,
      orgType: org.orgType,
      instanceUrl: org.instanceUrl,
      displayName: org.displayName,
      appUserId: org.appUserId ?? null,
      orgConnectionId: org.orgConnectionId ?? null,
      sfUserId: org.sfUserId ?? null,
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
      appUserId: null,
      orgConnectionId: null,
      sfUserId: null,
    }),
}));
