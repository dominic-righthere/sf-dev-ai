"use client";

import { useEffect, useCallback } from "react";
import { Loader2, Wrench } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useOrgStore } from "@/stores/org-store";
import { useDebtStore } from "@/stores/debt-store";
import { DebtScore } from "@/components/debt/debt-score";
import { DebtCategoryCards } from "@/components/debt/category-cards";
import { DebtFindingList } from "@/components/debt/finding-list";
import { AgentBar } from "@/components/ai/agent-bar";
import { AgentChatPanel } from "@/components/ai/agent-chat-panel";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

export default function DebtPage() {
  useSession();
  const isConnected = useOrgStore((s) => s.isConnected);
  const setScanResult = useDebtStore((s) => s.setScanResult);
  const setIsScanning = useDebtStore((s) => s.setIsScanning);
  const setError = useDebtStore((s) => s.setError);
  const isScanning = useDebtStore((s) => s.isScanning);
  const scanResult = useDebtStore((s) => s.scanResult);

  const fetchScan = useCallback(
    async (method: "GET" | "POST" = "GET") => {
      setIsScanning(true);
      setError(null);
      try {
        const res = await fetch("/api/salesforce/debt", { method });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setScanResult(data, data.fromCache ?? false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Scan failed";
        setError(msg);
        toast({ title: "Debt scan failed", description: msg, variant: "destructive" });
      } finally {
        setIsScanning(false);
      }
    },
    [setScanResult, setIsScanning, setError]
  );

  useEffect(() => {
    if (isConnected && !scanResult) {
      fetchScan("GET");
    }
  }, [isConnected, scanResult, fetchScan]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="rounded-2xl border border-border-default bg-bg-secondary p-8 max-w-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 mx-auto mb-4">
            <Wrench className="h-6 w-6 text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">Connect a Salesforce org</h2>
          <p className="text-sm text-text-secondary mb-4">
            Connect a Salesforce org to scan for technical debt.
          </p>
          <Link href="/auth/login" className="text-sm text-accent-blue hover:underline">
            Connect now
          </Link>
        </div>
      </div>
    );
  }

  if (isScanning && !scanResult) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
          <p className="text-sm text-text-muted">Scanning for technical debt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="border-b border-border-default px-6 py-4">
        <h1 className="text-lg font-semibold text-text-primary">Technical Debt Scanner</h1>
        <p className="text-sm text-text-muted">
          Apex coverage, automation hygiene, inactive metadata, and remediation guidance
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl space-y-4">
          <DebtScore onScan={() => fetchScan("POST")} />
          <DebtCategoryCards />
          <DebtFindingList />
        </div>
      </div>

      <AgentBar
        toolsets={["data", "schema", "permissions", "interaction"]}
        suggestions={[
          "Which Apex classes have no test coverage?",
          "Explain the trigger consolidation pattern",
          "Show me all inactive flows",
          "How do I improve Apex test coverage?",
        ]}
      />
      <AgentChatPanel toolsets={["data", "schema", "permissions", "interaction"]} />
    </div>
  );
}
