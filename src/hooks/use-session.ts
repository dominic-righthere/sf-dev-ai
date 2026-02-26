"use client";

import { useEffect } from "react";
import { useOrgStore } from "@/stores/org-store";

export function useSession() {
  const { setOrg, isConnected } = useOrgStore();

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
          });
        }
      })
      .catch(() => {
        // Session check failed silently
      });
  }, [isConnected, setOrg]);
}
