import { create } from "zustand";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface AIState {
  conversationId: string | null;
  messages: Message[];
  isStreaming: boolean;
  thinkingText: string | null;
  error: string | null;

  setConversationId: (id: string) => void;
  addMessage: (message: Message) => void;
  setIsStreaming: (streaming: boolean) => void;
  setThinkingText: (text: string | null) => void;
  setError: (error: string | null) => void;
  clearConversation: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  conversationId: null,
  messages: [],
  isStreaming: false,
  thinkingText: null,
  error: null,

  setConversationId: (id) => set({ conversationId: id }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setIsStreaming: (streaming) =>
    set({ isStreaming: streaming, error: streaming ? null : undefined }),

  setThinkingText: (text) => set({ thinkingText: text }),

  setError: (error) => set({ error, isStreaming: false }),

  clearConversation: () =>
    set({
      conversationId: null,
      messages: [],
      isStreaming: false,
      thinkingText: null,
      error: null,
    }),
}));
