"use client";

import { useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { FlowCanvas } from "@/components/flow/flow-canvas";
import { FlowToolbar } from "@/components/flow/flow-toolbar";
import { PromptBar } from "@/components/ai/prompt-bar";
import { ThinkingIndicator } from "@/components/ai/thinking-indicator";
import { ChatPanel } from "@/components/ai/chat-panel";
import { NodeInspector } from "@/components/flow/panels/node-inspector";
import { VariablePanel } from "@/components/flow/panels/variable-panel";
import { useSession } from "@/hooks/use-session";
import { useFlowStore } from "@/stores/flow-store";
import { useAIStore } from "@/stores/ai-store";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function FlowBuilderPage() {
  useSession();
  const params = useParams();
  const flowId = params.flowId as string;
  const flow = useFlowStore((s) => s.flow);
  const loadFlow = useFlowStore((s) => s.loadFlow);
  const error = useAIStore((s) => s.error);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  useEffect(() => {
    if (flowId !== "new" && !flow) {
      setIsLoadingDraft(true);
      loadFlow(flowId)
        .catch((err) => {
          toast({
            title: "Failed to load flow",
            description: err instanceof Error ? err.message : "Unknown error",
            variant: "destructive",
          });
        })
        .finally(() => setIsLoadingDraft(false));
    }
  }, [flowId]);

  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full overflow-hidden">
        <FlowCanvas />

        <FlowToolbar />
        <ThinkingIndicator />

        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 rounded-lg border border-accent-red/30 bg-accent-red/10 px-4 py-2 text-sm text-accent-red font-mono">
            {error}
          </div>
        )}

        {/* Loading state for saved drafts */}
        {isLoadingDraft && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/50 z-30">
            <Loader2 className="h-8 w-8 animate-spin text-accent-electric" />
          </div>
        )}

        {/* Empty state — animated flow construction */}
        {!flow && !isLoadingDraft && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center space-y-4 mb-32">
              {/* Animated node outlines */}
              <svg
                width="200"
                height="140"
                viewBox="0 0 200 140"
                className="mx-auto"
              >
                {/* Node 1 */}
                <rect
                  x="60"
                  y="10"
                  width="80"
                  height="30"
                  rx="6"
                  fill="none"
                  stroke="#1b96ff"
                  strokeWidth="1"
                  className="empty-node-1"
                />
                {/* Connection line 1 */}
                <line
                  x1="100"
                  y1="40"
                  x2="100"
                  y2="55"
                  stroke="#1e2a42"
                  strokeWidth="1.5"
                  className="empty-line"
                />
                {/* Node 2 */}
                <rect
                  x="60"
                  y="55"
                  width="80"
                  height="30"
                  rx="6"
                  fill="none"
                  stroke="#00ddb3"
                  strokeWidth="1"
                  className="empty-node-2"
                />
                {/* Connection line 2 */}
                <line
                  x1="100"
                  y1="85"
                  x2="100"
                  y2="100"
                  stroke="#1e2a42"
                  strokeWidth="1.5"
                  className="empty-line"
                />
                {/* Node 3 */}
                <rect
                  x="60"
                  y="100"
                  width="80"
                  height="30"
                  rx="6"
                  fill="none"
                  stroke="#7c5cfc"
                  strokeWidth="1"
                  className="empty-node-3"
                />
              </svg>

              <h2 className="text-xl font-semibold text-text-secondary">
                What should this flow do?
              </h2>
              <p className="text-sm text-text-muted max-w-md font-mono">
                Describe your flow in the prompt bar below
              </p>
            </div>
          </div>
        )}

        <NodeInspector />
        <VariablePanel />
        <ChatPanel />
        <PromptBar />
      </div>
    </ReactFlowProvider>
  );
}
