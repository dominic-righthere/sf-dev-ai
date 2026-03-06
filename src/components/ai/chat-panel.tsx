"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, User, Bot, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useUIStore } from "@/stores/ui-store";
import { useAIStore, type Message } from "@/stores/ai-store";
import { useAIStream } from "@/hooks/use-ai-stream";
import { cn } from "@/lib/utils";

export function ChatPanel() {
  const chatPanelOpen = useUIStore((s) => s.chatPanelOpen);
  const setChatPanelOpen = useUIStore((s) => s.setChatPanelOpen);
  const messages = useAIStore((s) => s.messages);
  const pendingClarification = useAIStore((s) => s.pendingClarification);
  const isStreaming = useAIStore((s) => s.isStreaming);
  const { refineFlow } = useAIStream();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Focus input when panel opens
  useEffect(() => {
    if (chatPanelOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [chatPanelOpen]);

  if (!chatPanelOpen) return null;

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    refineFlow(trimmed);
    setInput("");
  };

  const handleOptionClick = (option: string) => {
    if (isStreaming) return;
    refineFlow(option);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="absolute top-0 right-0 h-full w-[380px] border-l border-border-default bg-bg-secondary z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-accent-electric" />
          <span className="text-sm font-medium text-text-primary">Chat</span>
          {pendingClarification && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0">
              Needs reply
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-text-muted"
          onClick={() => setChatPanelOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Bot className="h-8 w-8 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">
                Conversation history will appear here
              </p>
            </div>
          )}

          {messages.map((message, i) => (
            <ChatMessage key={i} message={message} onOptionClick={handleOptionClick} isStreaming={isStreaming} />
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border-default p-3 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingClarification ? "Reply to question..." : "Send a message..."}
            disabled={isStreaming}
            rows={1}
            className="flex-1 resize-none bg-bg-tertiary rounded-lg px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-electric/30 disabled:opacity-50"
          />
          <Button
            variant="default"
            size="icon"
            onClick={handleSubmit}
            disabled={!input.trim() || isStreaming}
            className="h-9 w-9 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({
  message,
  onOptionClick,
  isStreaming,
}: {
  message: Message;
  onOptionClick: (option: string) => void;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";

  if (message.type === "generation_summary" && message.generationSummary) {
    const s = message.generationSummary;
    return (
      <div className="rounded-lg border border-border-subtle bg-bg-tertiary/50 p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Coins className="h-3 w-3" />
          <span>Generation Summary</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-text-secondary">
          <span>{s.totalInputTokens.toLocaleString()} in</span>
          <span className="text-border-default">·</span>
          <span>{s.totalOutputTokens.toLocaleString()} out</span>
          <span className="text-border-default">·</span>
          <span className="text-accent-electric">~${s.estimatedCost.toFixed(4)}</span>
          <span className="text-border-default">·</span>
          <span>{s.turns} {s.turns === 1 ? "turn" : "turns"}</span>
        </div>
      </div>
    );
  }

  if (message.type === "clarification" && message.clarification) {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-electric/15 text-accent-electric mt-0.5">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary leading-relaxed">
              {message.clarification.question}
            </p>
            {message.clarification.context && (
              <p className="text-xs text-text-muted mt-1">
                {message.clarification.context}
              </p>
            )}
          </div>
        </div>
        {message.clarification.options && message.clarification.options.length > 0 && (
          <div className="flex flex-wrap gap-1.5 ml-8">
            {message.clarification.options.map((option) => (
              <button
                key={option}
                onClick={() => onOptionClick(option)}
                disabled={isStreaming}
                className={cn(
                  "rounded-lg border border-border-subtle bg-bg-tertiary/50 px-3 py-1.5 text-xs text-text-secondary",
                  "hover:text-text-primary hover:border-accent-electric/30 hover:bg-accent-electric/5",
                  "transition-colors font-mono disabled:opacity-50"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full mt-0.5",
          isUser
            ? "bg-accent-purple/15 text-accent-purple"
            : "bg-accent-electric/15 text-accent-electric"
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <p className="text-sm text-text-primary leading-relaxed flex-1 min-w-0 break-words">
        {message.content}
      </p>
    </div>
  );
}
