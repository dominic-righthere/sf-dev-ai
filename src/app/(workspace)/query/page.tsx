"use client";

import { useState } from "react";
import { Send, Play, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/hooks/use-session";
import { toast } from "@/hooks/use-toast";

export default function QueryPage() {
  useSession();
  const [nlInput, setNlInput] = useState("");
  const [soqlQuery, setSoqlQuery] = useState("");
  const [explanation, setExplanation] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const [totalSize, setTotalSize] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const handleGenerateSOQL = async () => {
    if (!nlInput.trim()) return;
    setIsGenerating(true);
    setResults(null);

    try {
      const response = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: nlInput }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setSoqlQuery(data.query || "");
      setExplanation(data.explanation || "");
    } catch (err) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunQuery = async () => {
    if (!soqlQuery.trim()) return;
    setIsRunning(true);

    try {
      const response = await fetch("/api/salesforce/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: soqlQuery }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setResults(data.records || []);
      setTotalSize(data.totalSize || 0);
    } catch (err) {
      toast({
        title: "Query failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border-default px-6 py-4">
        <h1 className="text-lg font-semibold text-text-primary">
          SOQL Workspace
        </h1>
        <p className="text-sm text-text-muted">
          Ask questions about your data in English
        </p>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
        {/* Natural language input */}
        <div className="space-y-2">
          <label className="text-xs text-text-muted font-medium uppercase tracking-wider">
            Ask in English
          </label>
          <div className="flex gap-2">
            <textarea
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              placeholder="Show me all contacts created this month..."
              className="flex-1 rounded-lg border border-border-default bg-bg-secondary p-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 resize-none"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerateSOQL();
                }
              }}
            />
            <Button
              onClick={handleGenerateSOQL}
              disabled={isGenerating || !nlInput.trim()}
              className="self-end gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate
            </Button>
          </div>
        </div>

        {/* SOQL query */}
        {soqlQuery && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-text-muted font-medium uppercase tracking-wider">
                Generated SOQL
              </label>
              {explanation && (
                <span className="text-xs text-text-secondary">
                  {explanation}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <textarea
                value={soqlQuery}
                onChange={(e) => setSoqlQuery(e.target.value)}
                className="flex-1 rounded-lg border border-border-default bg-bg-secondary p-3 font-mono text-sm text-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue/50 resize-none"
                rows={3}
              />
              <Button
                onClick={handleRunQuery}
                disabled={isRunning || !soqlQuery.trim()}
                variant="secondary"
                className="self-end gap-2"
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Run
              </Button>
            </div>
          </div>
        )}

        {/* Results */}
        {results !== null && (
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-muted font-medium uppercase tracking-wider">
                Results
              </label>
              <Badge variant="secondary">{totalSize} records</Badge>
            </div>

            <ScrollArea className="flex-1 rounded-lg border border-border-default bg-bg-secondary">
              {results.length === 0 ? (
                <div className="p-6 text-center text-sm text-text-muted">
                  No records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-default">
                        {Object.keys(results[0] || {})
                          .filter((k) => k !== "attributes")
                          .map((key) => (
                            <th
                              key={key}
                              className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider whitespace-nowrap"
                            >
                              {key}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((record, i) => (
                        <tr
                          key={i}
                          className="border-b border-border-subtle hover:bg-bg-tertiary"
                        >
                          {Object.entries(record)
                            .filter(([k]) => k !== "attributes")
                            .map(([key, value]) => (
                              <td
                                key={key}
                                className="px-3 py-2 text-text-primary whitespace-nowrap"
                              >
                                {typeof value === "object" && value !== null
                                  ? JSON.stringify(value)
                                  : String(value ?? "")}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
