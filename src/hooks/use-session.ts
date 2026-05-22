"use client";

import { useEffect } from "react";
import { useOrgStore } from "@/stores/org-store";
import { useOrgsStore } from "@/stores/orgs-store";

export function useSession() {
  const { setOrg, isConnected } = useOrgStore();
  const { setOrgs, setLoading } = useOrgsStore();

  useEffect(() => {
    if (isConnected) return;

    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setOrg({
            username: data.username,
            orgId: data.orgId,
            orgType: data.orgType,
            instanceUrl: data.instanceUrl,
            displayName: data.displayName,
            appUserId: data.appUserId,
            orgConnectionId: data.orgConnectionId,
            sfUserId: data.sfUserId,
          });

          // Hydrate saved orgs list
          if (data.appUserId) {
            setLoading(true);
            fetch("/api/user/profile")
              .then((r) => r.json())
              .then((profile) => {
                if (profile.orgs) setOrgs(profile.orgs);
              })
              .catch(() => {})
              .finally(() => setLoading(false));
          }
        }
      })
      .catch(() => {});
  }, [isConnected, setOrg, setOrgs, setLoading]);
}
