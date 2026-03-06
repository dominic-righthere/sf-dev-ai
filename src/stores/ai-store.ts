import { create } from "zustand";

export type GenerationStage = "idle" | "analyzing" | "designing" | "building" | "done";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  type?: "text" | "clarification" | "generation_summary";
  clarification?: {
    question: string;
    options?: string[];
    context?: string;
  };
  generationSummary?: {
    totalInputTokens: number;
    totalOutputTokens: number;
    estimatedCost: number;
    turns: number;
  };
}

interface GenerationHistoryEntry {
  timestamp: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  turns: number;
}

interface AIState {
  conversationId: string | null;
  messages: Message[];
  isStreaming: boolean;
  thinkingText: string | null;
  error: string | null;
  generationStage: GenerationStage;
  elementsBuilt: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number;
  generationHistory: GenerationHistoryEntry[];
  pendingClarification: {
    question: string;
    options?: string[];
    context?: string;
  } | null;

  setConversationId: (id: string) => void;
  addMessage: (message: Message) => void;
  setIsStreaming: (streaming: boolean) => void;
  setThinkingText: (text: string | null) => void;
  setError: (error: string | null) => void;
  setGenerationStage: (stage: GenerationStage) => void;
  incrementElementsBuilt: () => void;
  addUsage: (inputTokens: number, outputTokens: number) => void;
  setGenerationSummary: (summary: { totalInputTokens: number; totalOutputTokens: number; estimatedCost: number; turns: number }) => void;
  setPendingClarification: (clarification: { question: string; options?: string[]; context?: string } | null) => void;
  resetProgress: () => void;
  clearConversation: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  conversationId: null,
  messages: [],
  isStreaming: false,
  thinkingText: null,
  error: null,
  generationStage: "idle",
  elementsBuilt: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  estimatedCost: 0,
  generationHistory: [],
  pendingClarification: null,

  setConversationId: (id) => set({ conversationId: id }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setIsStreaming: (streaming) =>
    set({ isStreaming: streaming, error: streaming ? null : undefined }),

  setThinkingText: (text) => set({ thinkingText: text }),

  setError: (error) => set({ error, isStreaming: false }),

  setGenerationStage: (stage) => set({ generationStage: stage }),

  incrementElementsBuilt: () =>
    set((state) => ({ elementsBuilt: state.elementsBuilt + 1 })),

  addUsage: (inputTokens, outputTokens) =>
    set((state) => ({
      totalInputTokens: state.totalInputTokens + inputTokens,
      totalOutputTokens: state.totalOutputTokens + outputTokens,
      estimatedCost: ((state.totalInputTokens + inputTokens) / 1_000_000) * 3 +
        ((state.totalOutputTokens + outputTokens) / 1_000_000) * 15,
    })),

  setGenerationSummary: (summary) =>
    set((state) => ({
      generationHistory: [
        ...state.generationHistory,
        {
          timestamp: Date.now(),
          inputTokens: summary.totalInputTokens,
          outputTokens: summary.totalOutputTokens,
          estimatedCost: summary.estimatedCost,
          turns: summary.turns,
        },
      ],
    })),

  setPendingClarification: (clarification) =>
    set({ pendingClarification: clarification }),

  resetProgress: () =>
    set({
      generationStage: "idle",
      elementsBuilt: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      estimatedCost: 0,
    }),

  clearConversation: () =>
    set({
      conversationId: null,
      messages: [],
      isStreaming: false,
      thinkingText: null,
      error: null,
      generationStage: "idle",
      elementsBuilt: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      estimatedCost: 0,
      generationHistory: [],
      pendingClarification: null,
    }),
}));
