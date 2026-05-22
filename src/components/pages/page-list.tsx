"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, LayoutDashboard, Loader2, ChevronRight, Code, Eye, Copy, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { parseFlexiPage } from "@/lib/flexipage/parser";
import { PageRenderer } from "./page-renderer";
import type { FlexiPageMetadata } from "@/lib/flexipage/types";

interface FlexiPage {
  fullName: string;
  lastModifiedDate?: string;
  lastModifiedByName?: string;
  createdDate?: string;
  createdByName?: string;
}

export function PageList({ isConnected }: { isConnected: boolean }) {
  const [pages, setPages] = useState<FlexiPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [pageDetail, setPageDetail] = useState<FlexiPageMetadata | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isConnected) return;
    setIsLoading(true);
    fetch("/api/salesforce/pages")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPages(data.pages || []);
      })
      .catch((err) => toast({ title: "Failed to load pages", description: err.message, variant: "destructive" }))
      .finally(() => setIsLoading(false));
  }, [isConnected]);

  useEffect(() => {
    if (!selectedPage) { setPageDetail(null); return; }
    setIsLoadingDetail(true);
    setShowRaw(false);
    setCopied(false);
    fetch(`/api/salesforce/pages/${encodeURIComponent(selectedPage)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPageDetail(data);
      })
      .catch((err) => toast({ title: "Failed to load page detail", description: err.message, variant: "destructive" }))
      .finally(() => setIsLoadingDetail(false));
  }, [selectedPage]);

  const parsedPage = useMemo(() => {
    if (!pageDetail) return null;
    try {
      return parseFlexiPage(pageDetail);
    } catch {
      return null;
    }
  }, [pageDetail]);

  const q = search.toLowerCase();
  const filtered = pages.filter((p) => !q || p.fullName.toLowerCase().includes(q));

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="w-72 flex flex-col border-r border-border-default shrink-0">
        <div className="p-3 border-b border-border-default">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pages..."
              className="w-full rounded-md border border-border-default bg-bg-primary pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
            />
          </div>
          <div className="mt-1.5 text-[11px] text-text-muted">{filtered.length} pages</div>
        </div>
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-text-muted text-xs">
              <LayoutDashboard className="h-5 w-5 mb-2" />
              No pages found
            </div>
          ) : (
            <div className="py-1">
              {filtered.map((page) => (
                <button
                  key={page.fullName}
                  onClick={() => setSelectedPage(page.fullName)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
                    selectedPage === page.fullName
                      ? "bg-accent-blue/10 text-accent-blue"
                      : "text-text-primary hover:bg-bg-tertiary"
                  )}
                >
                  <LayoutDashboard className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{page.fullName}</div>
                    {page.lastModifiedByName && (
                      <div className="text-[11px] text-text-muted truncate">
                        {page.lastModifiedByName}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-3 w-3 shrink-0 text-text-muted" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-hidden">
        {!selectedPage ? (
          <div className="flex items-center justify-center h-full text-text-muted text-xs">
            Select a page to view details
          </div>
        ) : isLoadingDetail ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : pageDetail ? (
          <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <LayoutDashboard className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-text-primary">
                    {pageDetail.masterLabel || pageDetail.fullName}
                  </h2>
                  {pageDetail.type && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {pageDetail.type}
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-text-muted font-mono">{pageDetail.fullName}</div>
              </div>
              <button
                onClick={() => setShowRaw(!showRaw)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  showRaw
                    ? "bg-accent-blue/10 text-accent-blue"
                    : "text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
                )}
              >
                {showRaw ? <Eye className="h-3.5 w-3.5" /> : <Code className="h-3.5 w-3.5" />}
                {showRaw ? "Visual" : "Raw JSON"}
              </button>
            </div>
            <ScrollArea className="flex-1 p-4">
              {showRaw || !parsedPage ? (
                <div className="relative">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(pageDetail, null, 2));
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <pre className="text-[11px] font-mono text-text-secondary whitespace-pre-wrap bg-bg-primary rounded-lg border border-border-default p-3 pr-10">
                    {JSON.stringify(pageDetail, null, 2)}
                  </pre>
                </div>
              ) : (
                <PageRenderer page={parsedPage} />
              )}
            </ScrollArea>
          </div>
        ) : null}
      </div>
    </div>
  );
}
