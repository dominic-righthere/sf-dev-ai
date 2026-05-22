export type DocType =
  | "org-overview"
  | "automation-landscape"
  | "security-model"
  | "object-inventory";

export interface DocTypeMeta {
  id: DocType;
  label: string;
  description: string;
  subject?: string; // when doc type needs a subject (e.g. object name)
}

export const DOC_TYPE_META: Record<DocType, Omit<DocTypeMeta, "id">> = {
  "org-overview": {
    label: "Org Overview",
    description:
      "High-level architecture narrative — objects, automation, integrations, and team structure.",
  },
  "automation-landscape": {
    label: "Automation Landscape",
    description:
      "Every flow, trigger, and validation rule — how they interact, execution order risks, and consolidation opportunities.",
  },
  "security-model": {
    label: "Security Model",
    description:
      "Permission architecture — profiles, permission sets, key system permissions, and access patterns.",
  },
  "object-inventory": {
    label: "Object Inventory",
    description:
      "Custom object summary — fields, relationships, automation attached, and purpose.",
  },
};

export interface OrgDocumentSummary {
  id: string;
  docType: DocType;
  subject: string | null;
  title: string;
  version: number;
  generatedAt: string;
  updatedAt: string;
}

export interface OrgDocument extends OrgDocumentSummary {
  content: string; // markdown
}
