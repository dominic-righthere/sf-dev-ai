"use client";

import { Copy, Download, Check, FileText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDocsStore } from "@/stores/docs-store";
import { DOC_TYPE_META, type DocType } from "@/lib/docs/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DocViewer() {
  const activeDoc = useDocsStore((s) => s.activeDoc);
  const [copied, setCopied] = useState(false);

  if (!activeDoc) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <FileText className="h-10 w-10 text-text-muted mb-4" />
        <p className="text-sm text-text-muted">Select a document to view</p>
        <p className="text-xs text-text-muted mt-1">
          Or generate a new one from the panel on the left
        </p>
      </div>
    );
  }

  const copy = async () => {
    await navigator.clipboard.writeText(activeDoc.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([activeDoc.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeDoc.docType}-v${activeDoc.version}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const meta = DOC_TYPE_META[activeDoc.docType as DocType];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border-default px-6 py-3 shrink-0">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-text-primary truncate">{activeDoc.title}</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {meta?.label} · v{activeDoc.version} · Generated {formatDate(activeDoc.generatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={copy} className="h-7 text-xs">
            {copied ? (
              <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 mr-1" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="ghost" size="sm" onClick={download} className="h-7 text-xs">
            <Download className="h-3.5 w-3.5 mr-1" />
            .md
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <pre className="p-6 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap font-mono">
          {activeDoc.content}
        </pre>
      </div>
    </div>
  );
}
