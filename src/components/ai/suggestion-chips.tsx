"use client";

import { Zap } from "lucide-react";
import { useFlowStore } from "@/stores/flow-store";
import { useAIStore } from "@/stores/ai-store";

interface SuggestionChipsProps {
  onSelect: (suggestion: string) => void;
}

export function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  const flow = useFlowStore((s) => s.flow);
  const isStreaming = useAIStore((s) => s.isStreaming);

  if (isStreaming || !flow || flow.elements.size <= 1) return null;

  const suggestions = getContextualSuggestions(flow);

  if (suggestions.length === 0) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
      <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSelect(suggestion)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-secondary/90 backdrop-blur-sm px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:border-accent-electric/30 transition-colors font-mono"
          >
            <Zap className="h-3 w-3 text-accent-electric" />
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

function getContextualSuggestions(flow: any): string[] {
  const suggestions: string[] = [];
  const elementTypes = new Set<string>();

  for (const [, el] of flow.elements) {
    elementTypes.add(el.type);
  }

  if (!elementTypes.has("Decision")) {
    suggestions.push("Add a decision branch");
  }
  if (!elementTypes.has("Screen") && flow.processType === "Screen") {
    suggestions.push("Add a user input screen");
  }
  if (elementTypes.has("Screen") && !elementTypes.has("RecordCreate")) {
    suggestions.push("Save the screen data to a record");
  }
  if (!elementTypes.has("Assignment")) {
    suggestions.push("Add variable assignments");
  }

  suggestions.push("Add error handling");

  return suggestions.slice(0, 4);
}
