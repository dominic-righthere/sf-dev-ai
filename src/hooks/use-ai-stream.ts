"use client";

import { useCallback, useRef } from "react";
import { useFlowStore } from "@/stores/flow-store";
import { useAIStore } from "@/stores/ai-store";
import type { FlowElement, FlowVariable } from "@/lib/flow/types";
import { flowElementSchema, flowVariableSchema } from "@/lib/flow/schema";

export function useAIStream() {
  const abortRef = useRef<AbortController | null>(null);

  const {
    setFlowMetadata,
    addElement,
    updateElement,
    initFlow,
    setIsGenerating,
    flow,
  } = useFlowStore();

  const {
    addMessage,
    setIsStreaming,
    setThinkingText,
    setError,
    messages,
  } = useAIStore();

  const generateFlow = useCallback(
    async (prompt: string) => {
      // Abort any existing stream
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsStreaming(true);
      setIsGenerating(true);
      setError(null);
      setThinkingText("Thinking...");

      addMessage({
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      });

      try {
        const response = await fetch("/api/ai/flow/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
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

          // Parse SSE events from buffer
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const event of events) {
            processSSEEvent(event);
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          processSSEEvent(buffer);
        }

        addMessage({
          role: "assistant",
          content: "Flow generated successfully.",
          timestamp: Date.now(),
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Stream failed");
        }
      } finally {
        setIsStreaming(false);
        setIsGenerating(false);
        setThinkingText(null);
      }
    },
    [messages, flow]
  );

  const refineFlow = useCallback(
    async (prompt: string) => {
      if (!flow) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsStreaming(true);
      setIsGenerating(true);
      setError(null);
      setThinkingText("Analyzing flow...");

      addMessage({
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      });

      try {
        const { serializeFlowDefinition } = await import("@/lib/flow/types");

        const response = await fetch("/api/ai/flow/refine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            flowJson: serializeFlowDefinition(flow),
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

        addMessage({
          role: "assistant",
          content: "Flow refined successfully.",
          timestamp: Date.now(),
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Stream failed");
        }
      } finally {
        setIsStreaming(false);
        setIsGenerating(false);
        setThinkingText(null);
      }
    },
    [messages, flow]
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
        case "flow_metadata":
          if (!flow) {
            initFlow(
              data.apiName || "New_Flow",
              data.label || "New Flow",
              data.processType || "Screen"
            );
          }
          setFlowMetadata({
            apiName: data.apiName,
            label: data.label,
            description: data.description,
            processType: data.processType,
          });
          setThinkingText("Setting up flow...");
          break;

        case "flow_element": {
          const element = data as FlowElement;
          // Check if element already exists (refinement case)
          if (flow?.elements.has(element.id)) {
            updateElement(element.id, element);
          } else {
            addElement(element);
          }
          setThinkingText(`Adding ${element.type}: ${element.label}...`);
          break;
        }

        case "flow_variable": {
          const variable = data as FlowVariable;
          const { addVariable } = useFlowStore.getState();
          const existingVar = flow?.variables.find((v) => v.name === variable.name);
          if (existingVar) {
            const { updateVariable } = useFlowStore.getState();
            updateVariable(variable.name, { ...variable, id: variable.name });
          } else {
            addVariable({ ...variable, id: variable.name });
          }
          setThinkingText(`Adding variable: ${variable.name}...`);
          break;
        }

        case "thinking":
          setThinkingText(data.text?.slice(0, 100) || "Thinking...");
          break;

        case "error":
          setError(data.message);
          break;

        case "done":
          setThinkingText(null);
          break;
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setIsGenerating(false);
    setThinkingText(null);
  }, []);

  return { generateFlow, refineFlow, abort };
}
