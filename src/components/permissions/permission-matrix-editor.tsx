"use client";

import { useState, useCallback } from "react";
import { Search, Check, Minus, Loader2, Save } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import type { ObjectPermission, FieldPermission } from "@/stores/permissions-store";
import { usePermissionsStore } from "@/stores/permissions-store";

type Props =
  | { type: "object"; objectPermissions: ObjectPermission[]; fieldPermissions?: never }
  | { type: "field"; fieldPermissions: FieldPermission[]; objectPermissions?: never };

export function PermissionMatrixEditor(props: Props) {
  const selectedName = usePermissionsStore((s) => s.selectedName);
  const selectedType = usePermissionsStore((s) => s.selectedType);

  if (props.type === "object") {
    return (
      <ObjectPermissionEditor
        permissions={props.objectPermissions}
        permSetName={selectedName!}
        permSetType={selectedType!}
      />
    );
  }

  return (
    <FieldPermissionEditor
      permissions={props.fieldPermissions}
      permSetName={selectedName!}
      permSetType={selectedType!}
    />
  );
}

function ObjectPermissionEditor({
  permissions,
  permSetName,
  permSetType,
}: {
  permissions: ObjectPermission[];
  permSetName: string;
  permSetType: "PermissionSet" | "Profile";
}) {
  const [edits, setEdits] = useState<Map<string, ObjectPermission>>(new Map());
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const q = search.toLowerCase();

  const filtered = permissions.filter((p) => !q || p.object.toLowerCase().includes(q));

  const columns = ["Create", "Read", "Edit", "Delete", "View All", "Modify All"] as const;
  const keyMap: Record<typeof columns[number], keyof ObjectPermission> = {
    Create: "allowCreate",
    Read: "allowRead",
    Edit: "allowEdit",
    Delete: "allowDelete",
    "View All": "viewAllRecords",
    "Modify All": "modifyAllRecords",
  };

  const getPermValue = (perm: ObjectPermission, col: typeof columns[number]): boolean => {
    const edited = edits.get(perm.object);
    const source = edited || perm;
    return source[keyMap[col]] as boolean;
  };

  const togglePerm = (perm: ObjectPermission, col: typeof columns[number]) => {
    const key = keyMap[col];
    const current = edits.get(perm.object) || { ...perm };
    const next = { ...current, [key]: !(current[key] as boolean) };
    setEdits(new Map(edits).set(perm.object, next));
  };

  const hasChanges = edits.size > 0;

  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSaving(true);

    try {
      const updatedPerms = [...edits.values()];
      const res = await fetch(`/api/salesforce/permissions/${encodeURIComponent(permSetName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: permSetType,
          objectPermissions: updatedPerms,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "Permissions saved" });
      setEdits(new Map());
    } catch (err) {
      toast({
        title: "Failed to save",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border-default flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter objects..."
            className="w-full rounded-md border border-border-default bg-bg-primary pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          />
        </div>
        {hasChanges && (
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1 text-xs">
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
            <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">
              {edits.size}
            </Badge>
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-bg-secondary z-10">
            <tr className="border-b border-border-default">
              <th className="px-3 py-2 text-left text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Object
              </th>
              {columns.map((col) => (
                <th key={col} className="px-2 py-2 text-center text-[11px] font-medium text-text-muted uppercase tracking-wider w-16">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((perm) => {
              const isEdited = edits.has(perm.object);
              return (
                <tr key={perm.object} className={`border-b border-border-subtle hover:bg-bg-tertiary/50 ${isEdited ? "bg-accent-blue/5" : ""}`}>
                  <td className="px-3 py-1.5 font-mono text-text-primary whitespace-nowrap">
                    {perm.object}
                    {isEdited && <span className="ml-1 text-accent-blue text-[10px]">*</span>}
                  </td>
                  {columns.map((col) => {
                    const value = getPermValue(perm, col);
                    return (
                      <td key={col} className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => togglePerm(perm, col)}
                          className="w-5 h-5 inline-flex items-center justify-center rounded hover:bg-bg-tertiary transition-colors"
                        >
                          {value ? (
                            <Check className="h-3.5 w-3.5 text-green-400" />
                          ) : (
                            <Minus className="h-3 w-3 text-border-default" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollArea>
      <div className="px-3 py-1.5 border-t border-border-default text-[11px] text-text-muted flex items-center justify-between">
        <span>{filtered.length} objects</span>
        {hasChanges && (
          <span className="text-accent-blue">{edits.size} modified</span>
        )}
      </div>
    </div>
  );
}

function FieldPermissionEditor({
  permissions,
  permSetName,
  permSetType,
}: {
  permissions: FieldPermission[];
  permSetName: string;
  permSetType: "PermissionSet" | "Profile";
}) {
  const [edits, setEdits] = useState<Map<string, FieldPermission>>(new Map());
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const q = search.toLowerCase();

  const filtered = permissions.filter((p) => !q || p.field.toLowerCase().includes(q));
  const hasChanges = edits.size > 0;

  const getPermValue = (perm: FieldPermission, key: "readable" | "editable") => {
    const edited = edits.get(perm.field);
    return (edited || perm)[key];
  };

  const togglePerm = (perm: FieldPermission, key: "readable" | "editable") => {
    const current = edits.get(perm.field) || { ...perm };
    const next = { ...current, [key]: !current[key] };
    setEdits(new Map(edits).set(perm.field, next));
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSaving(true);

    try {
      const updatedPerms = [...edits.values()];
      const res = await fetch(`/api/salesforce/permissions/${encodeURIComponent(permSetName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: permSetType,
          fieldPermissions: updatedPerms,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "Field permissions saved" });
      setEdits(new Map());
    } catch (err) {
      toast({
        title: "Failed to save",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Group by object
  const grouped = new Map<string, FieldPermission[]>();
  for (const fp of filtered) {
    const obj = fp.field.split(".")[0] ?? fp.field;
    if (!grouped.has(obj)) grouped.set(obj, []);
    grouped.get(obj)!.push(fp);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border-default flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter fields..."
            className="w-full rounded-md border border-border-default bg-bg-primary pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          />
        </div>
        {hasChanges && (
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1 text-xs">
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
            <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">
              {edits.size}
            </Badge>
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-bg-secondary z-10">
            <tr className="border-b border-border-default">
              <th className="px-3 py-2 text-left text-[11px] font-medium text-text-muted uppercase tracking-wider">Field</th>
              <th className="px-2 py-2 text-center text-[11px] font-medium text-text-muted uppercase tracking-wider w-20">Read</th>
              <th className="px-2 py-2 text-center text-[11px] font-medium text-text-muted uppercase tracking-wider w-20">Edit</th>
            </tr>
          </thead>
          <tbody>
            {[...grouped.entries()].map(([obj, fields]) => (
              <ObjectFieldGroup
                key={obj}
                objectName={obj}
                fields={fields}
                edits={edits}
                getPermValue={getPermValue}
                togglePerm={togglePerm}
              />
            ))}
          </tbody>
        </table>
      </ScrollArea>
      <div className="px-3 py-1.5 border-t border-border-default text-[11px] text-text-muted flex items-center justify-between">
        <span>{filtered.length} fields across {grouped.size} objects</span>
        {hasChanges && <span className="text-accent-blue">{edits.size} modified</span>}
      </div>
    </div>
  );
}

function ObjectFieldGroup({
  objectName,
  fields,
  edits,
  getPermValue,
  togglePerm,
}: {
  objectName: string;
  fields: FieldPermission[];
  edits: Map<string, FieldPermission>;
  getPermValue: (perm: FieldPermission, key: "readable" | "editable") => boolean;
  togglePerm: (perm: FieldPermission, key: "readable" | "editable") => void;
}) {
  return (
    <>
      <tr className="bg-bg-tertiary/30">
        <td colSpan={3} className="px-3 py-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          {objectName}
        </td>
      </tr>
      {fields.map((fp) => {
        const isEdited = edits.has(fp.field);
        return (
          <tr key={fp.field} className={`border-b border-border-subtle hover:bg-bg-tertiary/50 ${isEdited ? "bg-accent-blue/5" : ""}`}>
            <td className="px-3 py-1.5 font-mono text-text-primary pl-6">
              {fp.field.split(".").pop()}
              {isEdited && <span className="ml-1 text-accent-blue text-[10px]">*</span>}
            </td>
            <td className="px-2 py-1.5 text-center">
              <button
                onClick={() => togglePerm(fp, "readable")}
                className="w-5 h-5 inline-flex items-center justify-center rounded hover:bg-bg-tertiary transition-colors"
              >
                {getPermValue(fp, "readable") ? (
                  <Check className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <Minus className="h-3 w-3 text-border-default" />
                )}
              </button>
            </td>
            <td className="px-2 py-1.5 text-center">
              <button
                onClick={() => togglePerm(fp, "editable")}
                className="w-5 h-5 inline-flex items-center justify-center rounded hover:bg-bg-tertiary transition-colors"
              >
                {getPermValue(fp, "editable") ? (
                  <Check className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <Minus className="h-3 w-3 text-border-default" />
                )}
              </button>
            </td>
          </tr>
        );
      })}
    </>
  );
}
