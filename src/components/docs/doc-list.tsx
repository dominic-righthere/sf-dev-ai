"use client";

import { Trash2, FileText } from "lucide-react";
import { useDocsStore } from "@/stores/docs-store";
import { DOC_TYPE_META, type DocType } from "@/lib/docs/types";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const TYPE_COLORS: Record<DocType, string> = {
  "org-overview": "text-accent-blue bg-accent-blue/10",
  "automation-landscape": "text-amber-400 bg-amber-400/10",
  "security-model": "text-emerald-400 bg-emerald-400/10",
  "object-inventory": "text-purple-400 bg-purple-400/10",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function DocList() {
  const documents = useDocsStore((s) => s.documents);
  const activeDoc = useDocsStore((s) => s.activeDoc);
  const setActiveDoc = useDocsStore((s) => s.setActiveDoc);
  const removeDoc = useDocsStore((s) => s.removeDoc);

  const openDoc = async (id: string) => {
    try {
      const res = await fetch(`/api/salesforce/docs/${id}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setActiveDoc(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load document";
      toast({ title: "Failed to load", description: msg, variant: "destructive" });
    }
  };

  const deleteDoc = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/salesforce/docs/${id}`, { method: "DELETE" });
      removeDoc(id);
      toast({ title: "Document deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
        <FileText className="h-8 w-8 text-text-muted mb-3" />
        <p className="text-sm text-text-muted">No documents yet</p>
        <p className="text-xs text-text-muted mt-1">Generate one above</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {documents.map((doc) => {
        const isActive = activeDoc?.id === doc.id;
        const colorClass = TYPE_COLORS[doc.docType as DocType] ?? "text-text-muted bg-bg-tertiary";

        return (
          <div
            key={doc.id}
            role="button"
            tabIndex={0}
            onClick={() => openDoc(doc.id)}
            onKeyDown={(e) => e.key === "Enter" && openDoc(doc.id)}
            className={cn(
              "group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border-subtle cursor-pointer",
              isActive ? "bg-bg-tertiary" : "hover:bg-bg-tertiary/50"
            )}
          >
            <span
              className={cn(
                "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                colorClass
              )}
            >
              {DOC_TYPE_META[doc.docType as DocType]?.label ?? doc.docType}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{doc.title}</p>
              <p className="text-xs text-text-muted mt-0.5">
                v{doc.version} · {formatDate(doc.updatedAt)}
              </p>
            </div>

            <button
              onClick={(e) => deleteDoc(e, doc.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-red-400 shrink-0 p-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
