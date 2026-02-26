"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Square, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIStream } from "@/hooks/use-ai-stream";
import { useAIStore } from "@/stores/ai-store";
import { useFlowStore } from "@/stores/flow-store";
import { cn } from "@/lib/utils";

export function PromptBar() {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { generateFlow, refineFlow, abort } = useAIStream();
  const isStreaming = useAIStore((s) => s.isStreaming);
  const flow = useFlowStore((s) => s.flow);

  // Auto-resize textarea
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

    if (flow && flow.elements.size > 1) {
      // Flow exists with elements beyond start — refine
      refineFlow(trimmed);
    } else {
      // No flow — generate new
      generateFlow(trimmed);
    }

    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
      <div
        className={cn(
          "mx-auto max-w-3xl rounded-2xl border border-border-default bg-bg-secondary/95 backdrop-blur-xl shadow-2xl transition-all",
          isStreaming && "prompt-bar-glow border-accent-blue/30"
        )}
      >
        <div className="flex items-end gap-2 p-3">
          <div className="flex-1 min-h-[40px]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                flow && flow.elements.size > 1
                  ? "Describe how to modify this flow..."
                  : "Describe the flow you want to build..."
              }
              disabled={isStreaming}
              rows={1}
              className="w-full resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-50 leading-relaxed"
            />
          </div>

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

        {/* Suggestions when empty */}
        {!flow && !input && !isStreaming && (
          <div className="flex flex-wrap gap-2 px-3 pb-3 border-t border-border-subtle pt-2">
            {[
              "Create a screen flow to collect contact info",
              "Build an auto-launched flow on Account creation",
              "Make a flow that sends an email notification",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInput(suggestion)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
              >
                <Sparkles className="h-3 w-3 text-accent-purple" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
