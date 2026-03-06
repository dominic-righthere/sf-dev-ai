"use client";

import { useEffect, useRef } from "react";
import { Undo2, Redo2, Download, Upload, Trash2, Save, Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFlowStore } from "@/stores/flow-store";
import { useOrgStore } from "@/stores/org-store";
import { flowToMetadataXml } from "@/lib/flow/converter";
import { toast } from "@/hooks/use-toast";

export function FlowToolbar() {
  const flow = useFlowStore((s) => s.flow);
  const isDirty = useFlowStore((s) => s.isDirty);
  const isGenerating = useFlowStore((s) => s.isGenerating);
  const isSaving = useFlowStore((s) => s.isSaving);
  const clearFlow = useFlowStore((s) => s.clearFlow);
  const saveFlow = useFlowStore((s) => s.saveFlow);
  const importFlowFromXml = useFlowStore((s) => s.importFlowFromXml);
  const isConnected = useOrgStore((s) => s.isConnected);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { undo, redo, pastStates, futureStates } = useFlowStore.temporal.getState();

  const canSave = flow && isDirty && !isGenerating && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;
    try {
      await saveFlow();
      toast({
        title: "Flow saved",
        description: "Your flow has been saved as a draft.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Cmd+S shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (canSave) handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canSave]);

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

  const handleImportXml = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const xml = event.target?.result as string;
        importFlowFromXml(xml);
        toast({
          title: "Flow imported",
          description: `Loaded ${file.name}`,
          variant: "success",
        });
      } catch (err) {
        toast({
          title: "Import failed",
          description: err instanceof Error ? err.message : "Invalid flow XML",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-imported
    e.target.value = "";
  };

  const handleDeploy = () => {
    if (!flow) return;
    toast({
      title: "Deploy",
      description: "Deploy dialog coming soon. Use Export XML for now.",
    });
  };

  if (!flow) {
    return (
      <div className="absolute top-4 right-4 z-10">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,.flow-meta.xml"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-text-secondary"
          onClick={handleImportXml}
          title="Import flow from XML"
        >
          <Upload className="h-3.5 w-3.5" />
          <span className="text-xs">Import XML</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml,.flow-meta.xml"
        onChange={handleFileChange}
        className="hidden"
      />
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
          onClick={handleSave}
          disabled={!canSave}
          title="Save (Cmd+S)"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          <span className="text-xs">Save</span>
        </Button>
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
          onClick={handleImportXml}
          title="Import flow from XML"
        >
          <Upload className="h-3.5 w-3.5" />
          <span className="text-xs">Import</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-text-secondary"
          onClick={handleDeploy}
          disabled={!isConnected}
          title={!isConnected ? "Connect a Salesforce org to deploy" : "Deploy to org"}
        >
          <Rocket className="h-3.5 w-3.5" />
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
