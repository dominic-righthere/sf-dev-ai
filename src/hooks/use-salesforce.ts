"use client";

import { useCallback, useState } from "react";
import { useOrgStore } from "@/stores/org-store";
import { toast } from "@/hooks/use-toast";

export function useSalesforce() {
  const { isConnected } = useOrgStore();
  const [loading, setLoading] = useState(false);

  const describeObject = useCallback(
    async (objectName: string) => {
      if (!isConnected) return null;
      setLoading(true);
      try {
        const response = await fetch(
          `/api/salesforce/describe?object=${encodeURIComponent(objectName)}`
        );
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data.describe;
      } catch (err) {
        toast({
          title: "Describe failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [isConnected]
  );

  const searchSchema = useCallback(
    async (query: string) => {
      if (!isConnected) return [];
      try {
        const response = await fetch(
          `/api/salesforce/describe?search=${encodeURIComponent(query)}`
        );
        const data = await response.json();
        return data.results || [];
      } catch {
        return [];
      }
    },
    [isConnected]
  );

  const initializeSchema = useCallback(async () => {
    if (!isConnected) return;
    try {
      await fetch("/api/salesforce/describe?init=true");
      useOrgStore.getState().setSchemaLoaded(true);
    } catch {
      // Silent failure
    }
  }, [isConnected]);

  const runQuery = useCallback(
    async (query: string) => {
      if (!isConnected) return null;
      setLoading(true);
      try {
        const response = await fetch("/api/salesforce/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data;
      } catch (err) {
        toast({
          title: "Query failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [isConnected]
  );

  return { describeObject, searchSchema, initializeSchema, runQuery, loading };
}
