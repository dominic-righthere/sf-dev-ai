"use client";

import { useEffect } from "react";
import { BookOpen } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useOrgStore } from "@/stores/org-store";
import { useDocsStore } from "@/stores/docs-store";
import { GeneratePanel } from "@/components/docs/generate-panel";
import { DocList } from "@/components/docs/doc-list";
import { DocViewer } from "@/components/docs/doc-viewer";
import { AgentBar } from "@/components/ai/agent-bar";
import { AgentChatPanel } from "@/components/ai/agent-chat-panel";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

export default function DocsPage() {
  useSession();
  const isConnected = useOrgStore((s) => s.isConnected);
  const setDocuments = useDocsStore((s) => s.setDocuments);
  const setIsLoading = useDocsStore((s) => s.setIsLoading);

  useEffect(() => {
    if (!isConnected) return;
    setIsLoading(true);
    fetch("/api/salesforce/docs")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setDocuments(data.docs || []);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to load documents";
        toast({ title: "Failed to load documents", description: msg, variant: "destructive" });
      })
      .finally(() => setIsLoading(false));
  }, [isConnected, setDocuments, setIsLoading]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="rounded-2xl border border-border-default bg-bg-secondary p-8 max-w-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-blue/10 mx-auto mb-4">
            <BookOpen className="h-6 w-6 text-accent-blue" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">Connect a Salesforce org</h2>
          <p className="text-sm text-text-secondary mb-4">
            Connect an org to generate architecture documentation.
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
      <div className="border-b border-border-default px-6 py-4 shrink-0">
        <h1 className="text-lg font-semibold text-text-primary">Architecture Docs</h1>
        <p className="text-sm text-text-muted">
          AI-generated org documentation — flows, permissions, objects, and business processes
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — generate + list */}
        <div className="w-64 shrink-0 flex flex-col border-r border-border-default overflow-hidden">
          <GeneratePanel />
          <DocList />
        </div>

        {/* Main viewer */}
        <div className="flex-1 overflow-hidden">
          <DocViewer />
        </div>
      </div>

      <AgentBar
        toolsets={["data", "schema", "permissions", "interaction"]}
        suggestions={[
          "Summarise the automation landscape",
          "What are the biggest security risks?",
          "Which objects have the most automation?",
          "Explain the flow interaction chain for Opportunity",
        ]}
      />
      <AgentChatPanel toolsets={["data", "schema", "permissions", "interaction"]} />
    </div>
  );
}
