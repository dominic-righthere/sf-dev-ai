"use client";

import { useEffect } from "react";
import { Database } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useOrgStore } from "@/stores/org-store";
import { useObjectsStore } from "@/stores/objects-store";
import { ObjectList } from "@/components/objects/object-list";
import { ObjectDetail } from "@/components/objects/object-detail";
import { AgentBar } from "@/components/ai/agent-bar";
import { AgentChatPanel } from "@/components/ai/agent-chat-panel";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

export default function ObjectsPage() {
  useSession();
  const isConnected = useOrgStore((s) => s.isConnected);
  const setObjects = useObjectsStore((s) => s.setObjects);
  const setIsLoadingList = useObjectsStore((s) => s.setIsLoadingList);
  const selectedObjectName = useObjectsStore((s) => s.selectedObjectName);
  const setSelectedObjectDetail = useObjectsStore((s) => s.setSelectedObjectDetail);
  const setIsLoadingDetail = useObjectsStore((s) => s.setIsLoadingDetail);

  // Fetch object list
  useEffect(() => {
    if (!isConnected) return;
    setIsLoadingList(true);
    fetch("/api/salesforce/objects")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setObjects(data.objects || []);
      })
      .catch((err) =>
        toast({ title: "Failed to load objects", description: err.message, variant: "destructive" })
      )
      .finally(() => setIsLoadingList(false));
  }, [isConnected]);

  // Fetch object detail when selected
  useEffect(() => {
    if (!selectedObjectName || !isConnected) return;
    setIsLoadingDetail(true);
    fetch(`/api/salesforce/objects/${encodeURIComponent(selectedObjectName)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSelectedObjectDetail(data);
      })
      .catch((err) =>
        toast({ title: "Failed to load object", description: err.message, variant: "destructive" })
      )
      .finally(() => setIsLoadingDetail(false));
  }, [selectedObjectName, isConnected]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="rounded-2xl border border-border-default bg-bg-secondary p-8 max-w-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-blue/10 mx-auto mb-4">
            <Database className="h-6 w-6 text-accent-blue" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">Connect a Salesforce org</h2>
          <p className="text-sm text-text-secondary mb-4">
            Connect a Salesforce org to explore your object schemas.
          </p>
          <Link href="/auth/login" className="text-sm text-accent-blue hover:underline">
            Connect now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="border-b border-border-default px-6 py-3">
        <h1 className="text-lg font-semibold text-text-primary">Object Explorer</h1>
        <p className="text-sm text-text-muted">Browse and inspect Salesforce object schemas</p>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 shrink-0">
          <ObjectList />
        </div>
        <div className="flex-1 overflow-hidden">
          <ObjectDetail />
        </div>
      </div>
      <AgentBar
        placeholder="Ask about objects, create fields, add validation rules..."
        toolsets={["schema", "metadata", "field_ops", "interaction"]}
        suggestions={[
          "What custom fields does Account have?",
          "Create a Status picklist on Case",
          "Show all lookup relationships on Contact",
        ]}
      />
      <AgentChatPanel toolsets={["schema", "metadata", "field_ops", "interaction"]} />
    </div>
  );
}
