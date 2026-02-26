"use client";

import { useCallback } from "react";
import { useFlowStore } from "@/stores/flow-store";
import { flowToMetadataXml, metadataXmlToFlow } from "@/lib/flow/converter";
import { serializeFlowDefinition } from "@/lib/flow/types";
import { toast } from "@/hooks/use-toast";

export function useFlowOperations() {
  const { flow, setFlow } = useFlowStore();

  const exportXml = useCallback(() => {
    if (!flow) return null;
    try {
      return flowToMetadataXml(flow);
    } catch (err) {
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      return null;
    }
  }, [flow]);

  const importXml = useCallback(
    (xml: string) => {
      try {
        const imported = metadataXmlToFlow(xml);
        setFlow(imported);
        toast({
          title: "Flow imported",
          description: `Imported "${imported.label}" with ${imported.elements.size} elements`,
          variant: "success",
        });
      } catch (err) {
        toast({
          title: "Import failed",
          description: err instanceof Error ? err.message : "Invalid XML",
          variant: "destructive",
        });
      }
    },
    [setFlow]
  );

  const deploy = useCallback(async () => {
    if (!flow) return;

    try {
      const response = await fetch("/api/salesforce/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowJson: serializeFlowDefinition(flow),
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Flow deployed",
          description: `${flow.apiName} deployed successfully`,
          variant: "success",
        });
      } else {
        toast({
          title: "Deploy failed",
          description: result.errors?.join(", ") || "Unknown error",
          variant: "destructive",
        });
      }

      return result;
    } catch (err) {
      toast({
        title: "Deploy failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      return { success: false, errors: ["Network error"] };
    }
  }, [flow]);

  return { exportXml, importXml, deploy };
}
