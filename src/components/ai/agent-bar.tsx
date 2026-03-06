"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Square, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgentStream } from "@/hooks/use-agent-stream";
import { useAIStore } from "@/stores/ai-store";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import type { ToolSet } from "@/lib/mcp/server";

interface AgentBarProps {
  placeholder?: string;
  toolsets?: ToolSet[];
  suggestions?: string[];
}

export function AgentBar({
  placeholder = "Ask the Salesforce AI agent...",
  toolsets,
  suggestions,
}: AgentBarProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, abort } = useAgentStream();
  const isStreaming = useAIStore((s) => s.isStreaming);
  const pendingClarification = useAIStore((s) => s.pendingClarification);
  const chatPanelOpen = useUIStore((s) => s.chatPanelOpen);
  const setChatPanelOpen = useUIStore((s) => s.setChatPanelOpen);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed, toolsets);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border-default p-4">
      <div
        className={cn(
          "mx-auto max-w-3xl rounded-2xl border bg-bg-secondary/95 backdrop-blur-xl shadow-lg transition-all",
          isStreaming
            ? "border-l-2 border-accent-electric/30"
            : "border-border-default"
        )}
      >
        <div className="flex items-center gap-2 p-3">
          <span className="shrink-0 pl-1 font-mono text-sm text-accent-electric select-none">
            &gt;_
          </span>
          <div className="flex-1 min-h-[36px] flex items-center">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isStreaming}
              rows={1}
              className="w-full resize-none bg-transparent font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-50 leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChatPanelOpen(!chatPanelOpen)}
              className={cn(
                "h-9 w-9 shrink-0 relative",
                chatPanelOpen ? "text-accent-electric" : "text-text-muted"
              )}
              title="Toggle chat panel"
            >
              <MessageSquare className="h-4 w-4" />
              {pendingClarification && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent-electric" />
              )}
            </Button>

            {isStreaming ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={abort}
                className="h-9 w-9 shrink-0 text-accent-red hover:text-accent-red"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="default"
                size="icon"
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="h-9 w-9 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {suggestions && !input && !isStreaming && (
          <div className="flex flex-wrap gap-2 px-3 pb-3 border-t border-border-subtle pt-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInput(suggestion)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-tertiary/50 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:border-border-default hover:bg-bg-tertiary transition-colors font-mono"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
