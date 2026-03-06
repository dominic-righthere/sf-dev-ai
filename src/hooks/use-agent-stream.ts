"use client";

import { useCallback, useRef } from "react";
import { useAIStore } from "@/stores/ai-store";
import { useUIStore } from "@/stores/ui-store";
import type { ToolSet } from "@/lib/mcp/server";

/**
 * Hook for the general AI agent stream (non-flow pages).
 * Used on Objects, Permissions, Query, and Pages workspaces.
 */
export function useAgentStream() {
  const abortRef = useRef<AbortController | null>(null);

  const {
    addMessage,
    setIsStreaming,
    setThinkingText,
    setError,
    setGenerationStage,
    addUsage,
    setGenerationSummary,
    setPendingClarification,
    resetProgress,
    messages,
  } = useAIStore();

  const setChatPanelOpen = useUIStore((s) => s.setChatPanelOpen);

  const sendMessage = useCallback(
    async (prompt: string, toolsets?: ToolSet[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      resetProgress();
      setIsStreaming(true);
      setError(null);
      setThinkingText("Thinking...");
      setPendingClarification(null);

      addMessage({
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      });

      try {
        const response = await fetch("/api/ai/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            mode: "agent",
            toolsets,
            conversationHistory: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const event of events) {
            processSSEEvent(event);
          }
        }

        if (buffer.trim()) {
          processSSEEvent(buffer);
        }

        if (!useAIStore.getState().pendingClarification) {
          addMessage({
            role: "assistant",
            content: "Done.",
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Stream failed");
        }
      } finally {
        setIsStreaming(false);
        setThinkingText(null);
      }
    },
    [messages]
  );

  function processSSEEvent(raw: string) {
    const lines = raw.split("\n");
    let eventType = "";
    let eventData = "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        eventData = line.slice(6).trim();
      }
    }

    if (!eventType || !eventData) return;

    try {
      const data = JSON.parse(eventData);

      switch (eventType) {
        case "thinking":
          setGenerationStage("analyzing");
          setThinkingText(data.text?.slice(0, 100) || "Thinking...");
          break;

        case "assistant_message":
          addMessage({
            role: "assistant",
            content: data.text,
            timestamp: Date.now(),
          });
          break;

        case "tool_result":
          // Tool results can be displayed in the chat
          addMessage({
            role: "assistant",
            content: `**${data.toolName}**\n\`\`\`json\n${data.result.slice(0, 500)}${data.result.length > 500 ? "..." : ""}\n\`\`\``,
            timestamp: Date.now(),
          });
          break;

        case "usage":
          addUsage(data.inputTokens, data.outputTokens);
          break;

        case "generation_summary":
          setGenerationSummary(data);
          addMessage({
            role: "assistant",
            content: `${data.totalInputTokens} in / ${data.totalOutputTokens} out (~$${data.estimatedCost.toFixed(4)})`,
            timestamp: Date.now(),
            type: "generation_summary",
            generationSummary: data,
          });
          break;

        case "clarification":
          setPendingClarification({
            question: data.question,
            options: data.options,
            context: data.context,
          });
          addMessage({
            role: "assistant",
            content: data.question,
            timestamp: Date.now(),
            type: "clarification",
            clarification: {
              question: data.question,
              options: data.options,
              context: data.context,
            },
          });
          setChatPanelOpen(true);
          break;

        case "error":
          setError(data.message);
          break;

        case "done":
          setGenerationStage("done");
          setThinkingText(null);
          break;
      }
    } catch {
      // Invalid JSON
    }
  }

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setThinkingText(null);
    resetProgress();
  }, []);

  return { sendMessage, abort };
}
