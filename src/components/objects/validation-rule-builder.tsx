"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface ValidationRuleBuilderProps {
  objectName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ValidationRuleBuilder({
  objectName,
  onClose,
  onSuccess,
}: ValidationRuleBuilderProps) {
  const [ruleName, setRuleName] = useState("");
  const [description, setDescription] = useState("");
  const [errorConditionFormula, setErrorConditionFormula] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorDisplayField, setErrorDisplayField] = useState("");
  const [active, setActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!ruleName || !errorConditionFormula || !errorMessage) return;
    setIsSaving(true);

    try {
      const res = await fetch(
        `/api/salesforce/objects/${encodeURIComponent(objectName)}/validation-rules`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ruleName,
            description,
            errorConditionFormula,
            errorMessage,
            errorDisplayField: errorDisplayField || undefined,
            active,
          }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "Validation rule created", description: `${objectName}.${ruleName}` });
      onSuccess();
      onClose();
    } catch (err) {
      toast({
        title: "Failed to create validation rule",
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
            New Validation Rule on {objectName}
          </h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Rule Name</label>
            <input
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="Require_Email_On_Close"
              className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Error Condition Formula
            </label>
            <textarea
              value={errorConditionFormula}
              onChange={(e) => setErrorConditionFormula(e.target.value)}
              placeholder="AND(ISPICKVAL(Status, 'Closed'), ISBLANK(Email))"
              rows={4}
              className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/50 resize-none"
            />
            <p className="text-[11px] text-text-muted">
              Record fails validation when this formula is TRUE
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Error Message</label>
            <input
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              placeholder="Email is required when status is Closed"
              className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Error Display Field (Optional)
            </label>
            <input
              value={errorDisplayField}
              onChange={(e) => setErrorDisplayField(e.target.value)}
              placeholder="Email"
              className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded"
            />
            Active
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-default">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!ruleName || !errorConditionFormula || !errorMessage || isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Create Rule
          </Button>
        </div>
      </div>
    </div>
  );
}
