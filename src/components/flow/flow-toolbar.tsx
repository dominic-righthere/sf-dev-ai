"use client";

import { Undo2, Redo2, Download, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFlowStore } from "@/stores/flow-store";
import { flowToMetadataXml } from "@/lib/flow/converter";
import { toast } from "@/hooks/use-toast";

export function FlowToolbar() {
  const flow = useFlowStore((s) => s.flow);
  const isDirty = useFlowStore((s) => s.isDirty);
  const isGenerating = useFlowStore((s) => s.isGenerating);
  const clearFlow = useFlowStore((s) => s.clearFlow);

  const { undo, redo, pastStates, futureStates } = useFlowStore.temporal.getState();

  const handleExportXml = () => {
    if (!flow) return;

    try {
      const xml = flowToMetadataXml(flow);
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${flow.apiName}.flow-meta.xml`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Flow exported",
        description: `${flow.apiName}.flow-meta.xml downloaded`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDeploy = () => {
    if (!flow) return;
    // TODO: Open deploy dialog
    toast({
      title: "Deploy",
      description: "Deploy dialog coming soon. Use Export XML for now.",
    });
  };

  if (!flow) return null;

  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
      {isGenerating && (
        <Badge variant="default" className="animate-pulse">
          Generating...
        </Badge>
      )}

      {isDirty && !isGenerating && (
        <Badge variant="warning">Unsaved</Badge>
      )}

      <div className="flex items-center rounded-lg border border-border-default bg-bg-secondary/95 backdrop-blur-xl">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-text-muted"
          onClick={() => undo()}
          disabled={pastStates.length === 0}
          title="Undo (Cmd+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-text-muted"
          onClick={() => redo()}
          disabled={futureStates.length === 0}
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center rounded-lg border border-border-default bg-bg-secondary/95 backdrop-blur-xl">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-text-secondary"
          onClick={handleExportXml}
          title="Export as XML"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="text-xs">XML</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-text-secondary"
          onClick={handleDeploy}
          title="Deploy to org"
        >
          <Upload className="h-3.5 w-3.5" />
          <span className="text-xs">Deploy</span>
        </Button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-text-muted hover:text-accent-red"
        onClick={clearFlow}
        title="Clear flow"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
