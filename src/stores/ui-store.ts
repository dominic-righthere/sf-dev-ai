import { create } from "zustand";

interface UIState {
  commandPaletteOpen: boolean;
  inspectorOpen: boolean;
  variablePanelOpen: boolean;
  selectedNodeId: string | null;

  setCommandPaletteOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  setVariablePanelOpen: (open: boolean) => void;
  setSelectedNodeId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  commandPaletteOpen: false,
  inspectorOpen: false,
  variablePanelOpen: false,
  selectedNodeId: null,

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setInspectorOpen: (open) => set({ inspectorOpen: open }),
  setVariablePanelOpen: (open) => set({ variablePanelOpen: open }),
  setSelectedNodeId: (id) =>
    set({ selectedNodeId: id, inspectorOpen: id !== null }),
}));
