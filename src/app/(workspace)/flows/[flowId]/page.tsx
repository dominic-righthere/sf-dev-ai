"use client";

import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { FlowCanvas } from "@/components/flow/flow-canvas";
import { FlowToolbar } from "@/components/flow/flow-toolbar";
import { PromptBar } from "@/components/ai/prompt-bar";
import { ThinkingIndicator } from "@/components/ai/thinking-indicator";
import { NodeInspector } from "@/components/flow/panels/node-inspector";
import { VariablePanel } from "@/components/flow/panels/variable-panel";
import { useSession } from "@/hooks/use-session";
import { useFlowStore } from "@/stores/flow-store";
import { useAIStore } from "@/stores/ai-store";
import { useParams } from "next/navigation";

export default function FlowBuilderPage() {
  useSession();
  const params = useParams();
  const flowId = params.flowId as string;
  const flow = useFlowStore((s) => s.flow);
  const error = useAIStore((s) => s.error);

  // Initialize empty flow if none exists and flowId is "new"
  useEffect(() => {
    if (flowId === "new" && !flow) {
      // Flow will be created when user submits their first prompt
      // No need to pre-initialize
    }
  }, [flowId, flow]);

  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full overflow-hidden">
        {/* Canvas */}
        <FlowCanvas />

        {/* Overlays */}
        <FlowToolbar />
        <ThinkingIndicator />

        {/* Error banner */}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 rounded-lg border border-accent-red/30 bg-accent-red/10 px-4 py-2 text-sm text-accent-red">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!flow && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center space-y-3 mb-32">
              <div className="text-6xl opacity-10">⚡</div>
              <h2 className="text-xl font-semibold text-text-secondary">
                Describe your flow
              </h2>
              <p className="text-sm text-text-muted max-w-md">
                Type a description in the prompt bar below and watch your
                Salesforce Flow build itself in real-time.
              </p>
            </div>
          </div>
        )}

        {/* Panels */}
        <NodeInspector />
        <VariablePanel />

        {/* Prompt Bar — always visible at bottom */}
        <PromptBar />
      </div>
    </ReactFlowProvider>
  );
}
