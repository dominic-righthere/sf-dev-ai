import { create } from "zustand";
import type { OrgDocument, OrgDocumentSummary, DocType } from "@/lib/docs/types";

interface DocsState {
  documents: OrgDocumentSummary[];
  activeDoc: OrgDocument | null;
  generating: Set<DocType>;
  isLoading: boolean;
  error: string | null;

  setDocuments: (docs: OrgDocumentSummary[]) => void;
  addOrUpdateDoc: (doc: OrgDocumentSummary) => void;
  removeDoc: (id: string) => void;
  setActiveDoc: (doc: OrgDocument | null) => void;
  setGenerating: (docType: DocType, value: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDocsStore = create<DocsState>((set) => ({
  documents: [],
  activeDoc: null,
  generating: new Set(),
  isLoading: false,
  error: null,

  setDocuments: (docs) => set({ documents: docs }),
  addOrUpdateDoc: (doc) =>
    set((state) => {
      const exists = state.documents.find((d) => d.id === doc.id);
      if (exists) {
        return { documents: state.documents.map((d) => (d.id === doc.id ? doc : d)) };
      }
      return { documents: [...state.documents, doc] };
    }),
  removeDoc: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
      activeDoc: state.activeDoc?.id === id ? null : state.activeDoc,
    })),
  setActiveDoc: (doc) => set({ activeDoc: doc }),
  setGenerating: (docType, value) =>
    set((state) => {
      const next = new Set(state.generating);
      if (value) next.add(docType);
      else next.delete(docType);
      return { generating: next };
    }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
