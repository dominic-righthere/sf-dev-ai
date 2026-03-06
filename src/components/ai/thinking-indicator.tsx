"use client";

import { useState } from "react";
import { useAIStore, type GenerationStage } from "@/stores/ai-store";
import { Search, PenTool, Hammer, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const stages: { key: GenerationStage; label: string; icon: typeof Search }[] = [
  { key: "analyzing", label: "Analyzing", icon: Search },
  { key: "designing", label: "Designing", icon: PenTool },
  { key: "building", label: "Building", icon: Hammer },
  { key: "done", label: "Done", icon: CheckCircle2 },
];

const stageOrder: Record<GenerationStage, number> = {
  idle: -1,
  analyzing: 0,
  designing: 1,
  building: 2,
  done: 3,
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

export function ThinkingIndicator() {
  const isStreaming = useAIStore((s) => s.isStreaming);
  const generationStage = useAIStore((s) => s.generationStage);
  const elementsBuilt = useAIStore((s) => s.elementsBuilt);
  const thinkingText = useAIStore((s) => s.thinkingText);
  const totalInputTokens = useAIStore((s) => s.totalInputTokens);
  const totalOutputTokens = useAIStore((s) => s.totalOutputTokens);
  const estimatedCost = useAIStore((s) => s.estimatedCost);
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed when a new generation starts
  const shouldShow = isStreaming || generationStage !== "idle";
  if (!shouldShow) {
    if (dismissed) setDismissed(false);
    return null;
  }

  if (dismissed) return null;

  const currentOrder = stageOrder[generationStage];
  const isDone = generationStage === "done" && !isStreaming;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-accent-electric/30 bg-bg-secondary/95 backdrop-blur-xl px-5 py-3 shadow-lg">
        {/* Stage indicators */}
        <div className="flex items-center gap-1">
          {stages.map((stage, i) => {
            const order = stageOrder[stage.key];
            const isComplete = currentOrder > order;
            const isActive = currentOrder === order;
            const isPending = currentOrder < order;
            const Icon = stage.icon;

            return (
              <div key={stage.key} className="flex items-center">
                {i > 0 && (
                  <div
                    className={cn(
                      "h-px w-6 mx-1 transition-colors duration-300",
                      isComplete || isActive ? "bg-accent-electric" : "bg-border-default"
                    )}
                  />
                )}
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300",
                      isComplete && "bg-accent-electric/20 text-accent-electric",
                      isActive && "bg-accent-electric/20 text-accent-electric animate-pulse",
                      isPending && "bg-bg-tertiary text-text-muted"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors duration-300",
                      isComplete && "text-accent-electric",
                      isActive && "text-text-primary",
                      isPending && "text-text-muted"
                    )}
                  >
                    {stage.label}
                  </span>
                </div>
              </div>
            );
          })}

          {isDone && (
            <button
              onClick={() => setDismissed(true)}
              className="ml-2 text-text-muted hover:text-text-secondary transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Detail text */}
        <div className="flex items-center gap-2 text-xs text-text-secondary font-mono">
          {elementsBuilt > 0 && (
            <span className="text-accent-electric">{elementsBuilt} elements</span>
          )}
          {thinkingText && (
            <span className="max-w-[280px] truncate">{thinkingText}</span>
          )}
          {isStreaming && generationStage !== "done" && (
            <div className="flex gap-1 ml-1">
              <div className="thinking-dot h-1 w-1 rounded-full bg-accent-electric" />
              <div className="thinking-dot h-1 w-1 rounded-full bg-accent-electric" />
              <div className="thinking-dot h-1 w-1 rounded-full bg-accent-electric" />
            </div>
          )}
        </div>

        {/* Token counter */}
        {(totalInputTokens > 0 || totalOutputTokens > 0) && (
          <div className="flex items-center gap-2 text-[10px] text-text-muted font-mono">
            <span>{formatTokens(totalInputTokens)} in</span>
            <span className="text-border-default">·</span>
            <span>{formatTokens(totalOutputTokens)} out</span>
            <span className="text-border-default">·</span>
            <span className="text-accent-electric">~${estimatedCost.toFixed(4)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
