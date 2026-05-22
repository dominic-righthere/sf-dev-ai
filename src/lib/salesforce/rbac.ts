import type Connection from "jsforce/lib/connection";

const SAFE_NAME = /^[a-zA-Z0-9_]+$/;

function validateName(name: string, label: string): void {
  if (!SAFE_NAME.test(name)) {
    throw new Error(`Invalid ${label}: ${name}`);
  }
}

export interface UserAssignment {
  userId: string;
  username: string;
  name: string;
  profileName: string;
  profileId: string;
  isActive: boolean;
  permissionSets: { id: string; label: string; name: string }[];
}

export interface PermissionSetGroupInfo {
  id: string;
  developerName: string;
  masterLabel: string;
  description?: string;
  components: { permissionSetName: string; permissionSetId: string }[];
}

export interface ObjectAccessEntry {
  parentType: "Profile" | "PermissionSet";
  parentName: string;
  parentLabel: string;
  permissionsCreate: boolean;
  permissionsRead: boolean;
  permissionsEdit: boolean;
  permissionsDelete: boolean;
  permissionsViewAllRecords: boolean;
  permissionsModifyAllRecords: boolean;
}

export interface FieldAccessEntry {
  parentType: "Profile" | "PermissionSet";
  parentName: string;
  parentLabel: string;
  permissionsRead: boolean;
  permissionsEdit: boolean;
}

export async function getUserAssignments(conn: Connection): Promise<UserAssignment[]> {
  // Get all users with their profiles
  const usersResult = await conn.query<{
    Id: string;
    Username: string;
    Name: string;
    Profile: { Name: string; Id: string };
    IsActive: boolean;
  }>("SELECT Id, Username, Name, Profile.Name, Profile.Id, IsActive FROM User WHERE IsActive = true ORDER BY Name LIMIT 200");

  // Get permission set assignments
  const psaResult = await conn.query<{
    AssigneeId: string;
    PermissionSet: { Id: string; Label: string; Name: string; IsOwnedByProfile: boolean };
  }>(
    "SELECT AssigneeId, PermissionSet.Id, PermissionSet.Label, PermissionSet.Name, PermissionSet.IsOwnedByProfile " +
    "FROM PermissionSetAssignment WHERE Assignee.IsActive = true"
  );

  // Group assignments by user
  const userMap = new Map<string, UserAssignment>();
  for (const u of usersResult.records) {
    userMap.set(u.Id, {
      userId: u.Id,
      username: u.Username,
      name: u.Name,
      profileName: u.Profile?.Name || "",
      profileId: u.Profile?.Id || "",
      isActive: u.IsActive,
      permissionSets: [],
    });
  }

  for (const psa of psaResult.records) {
    const user = userMap.get(psa.AssigneeId);
    if (!user || psa.PermissionSet.IsOwnedByProfile) continue;
    user.permissionSets.push({
      id: psa.PermissionSet.Id,
      label: psa.PermissionSet.Label,
      name: psa.PermissionSet.Name,
    });
  }

  return Array.from(userMap.values());
}

export async function getPermissionSetGroups(conn: Connection): Promise<PermissionSetGroupInfo[]> {
  const groups = await conn.query<{
    Id: string;
    DeveloperName: string;
    MasterLabel: string;
    Description?: string;
  }>("SELECT Id, DeveloperName, MasterLabel, Description FROM PermissionSetGroup ORDER BY MasterLabel");

  const components = await conn.query<{
    PermissionSetGroupId: string;
    PermissionSet: { Name: string; Id: string };
  }>("SELECT PermissionSetGroupId, PermissionSet.Name, PermissionSet.Id FROM PermissionSetGroupComponent");

  const componentMap = new Map<string, { permissionSetName: string; permissionSetId: string }[]>();
  for (const c of components.records) {
    const list = componentMap.get(c.PermissionSetGroupId) || [];
    list.push({ permissionSetName: c.PermissionSet.Name, permissionSetId: c.PermissionSet.Id });
    componentMap.set(c.PermissionSetGroupId, list);
  }

  return groups.records.map((g) => ({
    id: g.Id,
    developerName: g.DeveloperName,
    masterLabel: g.MasterLabel,
    description: g.Description,
    components: componentMap.get(g.Id) || [],
  }));
}

export async function getUnassignedPermissionSets(conn: Connection): Promise<{ id: string; name: string; label: string }[]> {
  const result = await conn.query<{
    Id: string;
    Name: string;
    Label: string;
  }>(
    "SELECT Id, Name, Label FROM PermissionSet " +
    "WHERE IsOwnedByProfile = false AND Id NOT IN (SELECT PermissionSetId FROM PermissionSetAssignment) " +
    "ORDER BY Label"
  );
  return result.records.map((r) => ({ id: r.Id, name: r.Name, label: r.Label }));
}

export async function getObjectAccessAudit(conn: Connection, objectName: string): Promise<ObjectAccessEntry[]> {
  validateName(objectName, "objectName");

  const result = await conn.query<{
    Parent: { ProfileId?: string; Profile?: { Name: string }; Label: string; Name: string; IsOwnedByProfile: boolean };
    PermissionsCreate: boolean;
    PermissionsRead: boolean;
    PermissionsEdit: boolean;
    PermissionsDelete: boolean;
    PermissionsViewAllRecords: boolean;
    PermissionsModifyAllRecords: boolean;
  }>(
    `SELECT Parent.Label, Parent.Name, Parent.IsOwnedByProfile, Parent.Profile.Name, ` +
    `PermissionsCreate, PermissionsRead, PermissionsEdit, PermissionsDelete, ` +
    `PermissionsViewAllRecords, PermissionsModifyAllRecords ` +
    `FROM ObjectPermissions WHERE SobjectType = '${objectName}'`
  );

  return result.records.map((r) => ({
    parentType: r.Parent.IsOwnedByProfile ? "Profile" : "PermissionSet",
    parentName: r.Parent.IsOwnedByProfile ? (r.Parent.Profile?.Name || r.Parent.Name) : r.Parent.Name,
    parentLabel: r.Parent.IsOwnedByProfile ? (r.Parent.Profile?.Name || r.Parent.Label) : r.Parent.Label,
    permissionsCreate: r.PermissionsCreate,
    permissionsRead: r.PermissionsRead,
    permissionsEdit: r.PermissionsEdit,
    permissionsDelete: r.PermissionsDelete,
    permissionsViewAllRecords: r.PermissionsViewAllRecords,
    permissionsModifyAllRecords: r.PermissionsModifyAllRecords,
  }));
}

export async function getFieldAccessAudit(
  conn: Connection,
  objectName: string,
  fieldName: string
): Promise<FieldAccessEntry[]> {
  validateName(objectName, "objectName");
  validateName(fieldName, "fieldName");

  const qualifiedField = `${objectName}.${fieldName}`;

  const result = await conn.query<{
    Parent: { Label: string; Name: string; IsOwnedByProfile: boolean; Profile?: { Name: string } };
    PermissionsRead: boolean;
    PermissionsEdit: boolean;
  }>(
    `SELECT Parent.Label, Parent.Name, Parent.IsOwnedByProfile, Parent.Profile.Name, ` +
    `PermissionsRead, PermissionsEdit ` +
    `FROM FieldPermissions WHERE SobjectType = '${objectName}' AND Field = '${qualifiedField}'`
  );

  return result.records.map((r) => ({
    parentType: r.Parent.IsOwnedByProfile ? "Profile" : "PermissionSet",
    parentName: r.Parent.IsOwnedByProfile ? (r.Parent.Profile?.Name || r.Parent.Name) : r.Parent.Name,
    parentLabel: r.Parent.IsOwnedByProfile ? (r.Parent.Profile?.Name || r.Parent.Label) : r.Parent.Label,
    permissionsRead: r.PermissionsRead,
    permissionsEdit: r.PermissionsEdit,
  }));
}
