"use client";

import { RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocsStore } from "@/stores/docs-store";
import { DOC_TYPE_META, type DocType } from "@/lib/docs/types";
import { toast } from "@/hooks/use-toast";

const DOC_TYPES: DocType[] = [
  "org-overview",
  "automation-landscape",
  "security-model",
  "object-inventory",
];

export function GeneratePanel() {
  const generating = useDocsStore((s) => s.generating);
  const documents = useDocsStore((s) => s.documents);
  const setGenerating = useDocsStore((s) => s.setGenerating);
  const addOrUpdateDoc = useDocsStore((s) => s.addOrUpdateDoc);
  const setActiveDoc = useDocsStore((s) => s.setActiveDoc);

  const generate = async (docType: DocType) => {
    setGenerating(docType, true);
    try {
      const res = await fetch("/api/salesforce/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      addOrUpdateDoc(data);
      setActiveDoc(data);
      toast({ title: `${DOC_TYPE_META[docType].label} generated` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      toast({ title: "Generation failed", description: msg, variant: "destructive" });
    } finally {
      setGenerating(docType, false);
    }
  };

  return (
    <div className="border-b border-border-default px-4 py-3 space-y-2">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Generate</p>
      <div className="flex flex-col gap-1.5">
        {DOC_TYPES.map((docType) => {
          const meta = DOC_TYPE_META[docType];
          const isGenerating = generating.has(docType);
          const exists = documents.some((d) => d.docType === docType);

          return (
            <button
              key={docType}
              onClick={() => generate(docType)}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-bg-tertiary disabled:opacity-50 group"
              title={meta.description}
            >
              {isGenerating ? (
                <RefreshCw className="h-3.5 w-3.5 text-accent-blue animate-spin shrink-0" />
              ) : exists ? (
                <RefreshCw className="h-3.5 w-3.5 text-text-muted shrink-0 group-hover:text-accent-blue transition-colors" />
              ) : (
                <Plus className="h-3.5 w-3.5 text-text-muted shrink-0 group-hover:text-accent-blue transition-colors" />
              )}
              <span className="text-text-secondary group-hover:text-text-primary transition-colors truncate">
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
