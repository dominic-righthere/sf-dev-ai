"use client";

import { useAIStore } from "@/stores/ai-store";
import { Sparkles } from "lucide-react";

export function ThinkingIndicator() {
  const isStreaming = useAIStore((s) => s.isStreaming);
  const thinkingText = useAIStore((s) => s.thinkingText);

  if (!isStreaming) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-2 rounded-full border border-accent-blue/30 bg-bg-secondary/95 backdrop-blur-xl px-4 py-2 shadow-lg">
        <Sparkles className="h-4 w-4 text-accent-blue animate-pulse" />
        <span className="text-xs text-text-secondary max-w-[300px] truncate">
          {thinkingText || "Thinking..."}
        </span>
        <div className="flex gap-1">
          <div className="thinking-dot h-1.5 w-1.5 rounded-full bg-accent-blue" />
          <div className="thinking-dot h-1.5 w-1.5 rounded-full bg-accent-blue" />
          <div className="thinking-dot h-1.5 w-1.5 rounded-full bg-accent-blue" />
        </div>
      </div>
    </div>
  );
}
