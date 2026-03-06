"use client";

import { useState } from "react";
import { X, Plus, Loader2, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const FIELD_TYPES = [
  { value: "Text", label: "Text" },
  { value: "Number", label: "Number" },
  { value: "Currency", label: "Currency" },
  { value: "Percent", label: "Percent" },
  { value: "Checkbox", label: "Checkbox" },
  { value: "Date", label: "Date" },
  { value: "DateTime", label: "Date/Time" },
  { value: "Email", label: "Email" },
  { value: "Phone", label: "Phone" },
  { value: "Url", label: "URL" },
  { value: "Picklist", label: "Picklist" },
  { value: "MultiselectPicklist", label: "Multi-Select Picklist" },
  { value: "TextArea", label: "Text Area" },
  { value: "LongTextArea", label: "Long Text Area" },
  { value: "RichTextArea", label: "Rich Text Area" },
  { value: "Lookup", label: "Lookup Relationship" },
  { value: "MasterDetail", label: "Master-Detail Relationship" },
] as const;

interface FieldBuilderProps {
  objectName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function FieldBuilder({ objectName, onClose, onSuccess }: FieldBuilderProps) {
  const [fieldName, setFieldName] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState("Text");
  const [description, setDescription] = useState("");
  const [length, setLength] = useState(255);
  const [precision, setPrecision] = useState(18);
  const [scale, setScale] = useState(0);
  const [required, setRequired] = useState(false);
  const [unique, setUnique] = useState(false);
  const [externalId, setExternalId] = useState(false);
  const [picklistValues, setPicklistValues] = useState<string[]>([""]);
  const [referenceTo, setReferenceTo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Auto-generate API name from label
  const handleLabelChange = (val: string) => {
    setLabel(val);
    if (!fieldName || fieldName === labelToApiName(label)) {
      setFieldName(labelToApiName(val));
    }
  };

  const handleSave = async () => {
    if (!fieldName || !label || !type) return;
    setIsSaving(true);

    const body: Record<string, unknown> = {
      fieldName,
      label,
      type,
      description,
      required,
      unique,
      externalId,
    };

    if (type === "Text") body.length = length;
    if (["Number", "Currency", "Percent"].includes(type)) {
      body.precision = precision;
      body.scale = scale;
    }
    if (["LongTextArea", "RichTextArea"].includes(type)) body.length = length;
    if (["Picklist", "MultiselectPicklist"].includes(type)) {
      body.picklistValues = picklistValues.filter((v) => v.trim());
    }
    if (["Lookup", "MasterDetail"].includes(type)) body.referenceTo = referenceTo;

    try {
      const res = await fetch(`/api/salesforce/objects/${encodeURIComponent(objectName)}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "Field created", description: `${objectName}.${fieldName}__c` });
      onSuccess();
      onClose();
    } catch (err) {
      toast({
        title: "Failed to create field",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-2xl border border-border-default bg-bg-secondary shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <h2 className="text-sm font-semibold text-text-primary">
            New Custom Field on {objectName}
          </h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Label */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Label</label>
            <input
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="My Custom Field"
              className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
            />
          </div>

          {/* API Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">API Name</label>
            <div className="flex items-center gap-1">
              <input
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="My_Custom_Field"
                className="flex-1 rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
              />
              <span className="text-sm text-text-muted font-mono">__c</span>
            </div>
          </div>

          {/* Type */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Type-specific options */}
          {type === "Text" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Length</label>
              <input
                type="number"
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                min={1}
                max={255}
                className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
              />
            </div>
          )}

          {["Number", "Currency", "Percent"].includes(type) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Precision</label>
                <input
                  type="number"
                  value={precision}
                  onChange={(e) => setPrecision(Number(e.target.value))}
                  min={1}
                  max={18}
                  className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Decimal Places</label>
                <input
                  type="number"
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  min={0}
                  max={17}
                  className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
                />
              </div>
            </div>
          )}

          {["LongTextArea", "RichTextArea"].includes(type) && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Max Length</label>
              <input
                type="number"
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                min={256}
                max={131072}
                className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
              />
            </div>
          )}

          {["Picklist", "MultiselectPicklist"].includes(type) && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Picklist Values</label>
              <div className="space-y-1.5">
                {picklistValues.map((val, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <GripVertical className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    <input
                      value={val}
                      onChange={(e) => {
                        const next = [...picklistValues];
                        next[i] = e.target.value;
                        setPicklistValues(next);
                      }}
                      placeholder={`Value ${i + 1}`}
                      className="flex-1 rounded-md border border-border-default bg-bg-primary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
                    />
                    {picklistValues.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setPicklistValues(picklistValues.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1"
                  onClick={() => setPicklistValues([...picklistValues, ""])}
                >
                  <Plus className="h-3 w-3" /> Add Value
                </Button>
              </div>
            </div>
          )}

          {["Lookup", "MasterDetail"].includes(type) && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Related To (Object)</label>
              <input
                value={referenceTo}
                onChange={(e) => setReferenceTo(e.target.value)}
                placeholder="Account"
                className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/50 resize-none"
            />
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="rounded" />
              Required
            </label>
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} className="rounded" />
              Unique
            </label>
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input type="checkbox" checked={externalId} onChange={(e) => setExternalId(e.target.checked)} className="rounded" />
              External ID
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-default">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!fieldName || !label || isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Create Field
          </Button>
        </div>
      </div>
    </div>
  );
}

function labelToApiName(label: string): string {
  return label
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "");
}
