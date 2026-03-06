import { create } from "zustand";
import { temporal } from "zundo";
import type {
  FlowDefinition,
  FlowElement,
  FlowVariable,
  FlowProcessType,
} from "@/lib/flow/types";
import {
  createEmptyFlow,
  serializeFlowDefinition,
  deserializeFlowDefinition,
} from "@/lib/flow/types";
import { buildConnectors, metadataXmlToFlow } from "@/lib/flow/converter";

interface FlowState {
  flow: FlowDefinition | null;
  isGenerating: boolean;
  isDirty: boolean;
  draftId: string | null;
  isSaving: boolean;

  // Actions
  initFlow: (apiName: string, label: string, processType?: FlowProcessType) => void;
  setFlow: (flow: FlowDefinition) => void;
  setFlowMetadata: (metadata: {
    apiName?: string;
    label?: string;
    description?: string;
    processType?: FlowProcessType;
  }) => void;
  addElement: (element: FlowElement) => void;
  updateElement: (id: string, element: FlowElement) => void;
  removeElement: (id: string) => void;
  addVariable: (variable: FlowVariable) => void;
  updateVariable: (name: string, variable: FlowVariable) => void;
  removeVariable: (name: string) => void;
  rebuildConnectors: () => void;
  setIsGenerating: (generating: boolean) => void;
  setIsDirty: (dirty: boolean) => void;
  importFlowFromXml: (xml: string) => void;
  clearFlow: () => void;
  saveFlow: () => Promise<void>;
  loadFlow: (id: string) => Promise<void>;
}

export const useFlowStore = create<FlowState>()(
  temporal(
    (set, get) => ({
      flow: null,
      isGenerating: false,
      isDirty: false,
      draftId: null,
      isSaving: false,

      initFlow: (apiName, label, processType = "Screen") => {
        set({
          flow: createEmptyFlow(apiName, label, processType),
          isDirty: false,
        });
      },

      setFlow: (flow) => {
        set({ flow, isDirty: false });
      },

      setFlowMetadata: (metadata) => {
        const { flow } = get();
        if (!flow) return;

        set({
          flow: {
            ...flow,
            ...(metadata.apiName !== undefined && { apiName: metadata.apiName }),
            ...(metadata.label !== undefined && { label: metadata.label }),
            ...(metadata.description !== undefined && {
              description: metadata.description,
            }),
            ...(metadata.processType !== undefined && {
              processType: metadata.processType,
            }),
          },
          isDirty: true,
        });
      },

      addElement: (element) => {
        const { flow } = get();
        if (!flow) return;

        const elements = new Map(flow.elements);
        elements.set(element.id, element);

        // Update start element connector if this is the first non-start element
        if (elements.size === 2) {
          const start = elements.get(flow.startElementId);
          if (start && start.type === "Start" && !start.connector) {
            elements.set(flow.startElementId, {
              ...start,
              connector: element.id,
            });
          }
        }

        const connectors = buildConnectors(elements);

        set({
          flow: { ...flow, elements, connectors },
          isDirty: true,
        });
      },

      updateElement: (id, element) => {
        const { flow } = get();
        if (!flow) return;

        const elements = new Map(flow.elements);
        elements.set(id, element);
        const connectors = buildConnectors(elements);

        set({
          flow: { ...flow, elements, connectors },
          isDirty: true,
        });
      },

      removeElement: (id) => {
        const { flow } = get();
        if (!flow) return;

        const elements = new Map(flow.elements);
        elements.delete(id);
        const connectors = buildConnectors(elements);

        set({
          flow: { ...flow, elements, connectors },
          isDirty: true,
        });
      },

      addVariable: (variable) => {
        const { flow } = get();
        if (!flow) return;

        set({
          flow: {
            ...flow,
            variables: [...flow.variables, variable],
          },
          isDirty: true,
        });
      },

      updateVariable: (name, variable) => {
        const { flow } = get();
        if (!flow) return;

        set({
          flow: {
            ...flow,
            variables: flow.variables.map((v) =>
              v.name === name ? variable : v
            ),
          },
          isDirty: true,
        });
      },

      removeVariable: (name) => {
        const { flow } = get();
        if (!flow) return;

        set({
          flow: {
            ...flow,
            variables: flow.variables.filter((v) => v.name !== name),
          },
          isDirty: true,
        });
      },

      rebuildConnectors: () => {
        const { flow } = get();
        if (!flow) return;

        const connectors = buildConnectors(flow.elements);
        set({ flow: { ...flow, connectors } });
      },

      importFlowFromXml: (xml: string) => {
        const flow = metadataXmlToFlow(xml);
        set({ flow, isDirty: true, draftId: null });
      },

      setIsGenerating: (generating) => set({ isGenerating: generating }),
      setIsDirty: (dirty) => set({ isDirty: dirty }),
      clearFlow: () => set({ flow: null, isDirty: false, draftId: null }),

      saveFlow: async () => {
        const { flow, draftId } = get();
        if (!flow) return;

        set({ isSaving: true });

        try {
          const flowJson = serializeFlowDefinition(flow);

          if (draftId) {
            // Update existing draft
            const res = await fetch(`/api/flows/${draftId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                apiName: flow.apiName,
                label: flow.label,
                description: flow.description,
                flowJson,
              }),
            });
            if (!res.ok) throw new Error("Failed to save flow");
          } else {
            // Create new draft
            const res = await fetch("/api/flows", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                apiName: flow.apiName,
                label: flow.label,
                description: flow.description,
                flowJson,
              }),
            });
            if (!res.ok) throw new Error("Failed to save flow");
            const data = await res.json();
            set({ draftId: data.draft.id });
          }

          set({ isDirty: false });
        } finally {
          set({ isSaving: false });
        }
      },

      loadFlow: async (id: string) => {
        const res = await fetch(`/api/flows/${id}`);
        if (!res.ok) throw new Error("Failed to load flow");

        const data = await res.json();
        const flow = deserializeFlowDefinition(data.draft.flowJson);

        set({
          flow,
          draftId: data.draft.id,
          isDirty: false,
        });
      },
    }),
    {
      limit: 50,
      equality: (pastState, currentState) =>
        JSON.stringify(pastState.flow) === JSON.stringify(currentState.flow),
    }
  )
);
