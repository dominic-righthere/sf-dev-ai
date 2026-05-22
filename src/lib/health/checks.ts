import type { Finding, Severity, Category } from "./types";
import type { UserAssignment, PermissionSetGroupInfo } from "@/lib/salesforce/rbac";

interface PermissionSetRecord {
  Id: string;
  Name: string;
  Label: string;
  "Profile.Name"?: string;
  PermissionsModifyAllData: boolean;
  PermissionsViewAllData: boolean;
  PermissionsManageUsers: boolean;
  PermissionsAuthorApex: boolean;
}

interface ObjectPermissionRecord {
  "Parent.Name": string;
  "Parent.Label": string;
  "Parent.IsOwnedByProfile": boolean;
  SobjectType: string;
  PermissionsViewAllRecords: boolean;
  PermissionsModifyAllRecords: boolean;
}

export interface ScanData {
  profilePermissions: PermissionSetRecord[];
  permSetPermissions: PermissionSetRecord[];
  objectPermissions: ObjectPermissionRecord[];
  userAssignments: UserAssignment[];
  unassignedPermSets: { id: string; name: string; label: string }[];
  permSetGroups: PermissionSetGroupInfo[];
  orgType: "production" | "sandbox" | undefined;
}

interface CheckDefinition {
  id: string;
  category: Category;
  severity: Severity;
  title: string;
  bestPractice: string;
  remedy: string;
  evaluate: (data: ScanData) => Finding[];
}

const ADMIN_PROFILE_NAMES = ["system administrator", "admin", "systemadministrator"];

function isAdminProfile(name: string | undefined): boolean {
  if (!name) return false;
  return ADMIN_PROFILE_NAMES.includes(name.toLowerCase().trim());
}

export const checks: CheckDefinition[] = [
  // --- Profiles ---
  {
    id: "PROFILE_MODIFY_ALL_DATA",
    category: "profiles",
    severity: "critical",
    title: "Profiles with Modify All Data",
    bestPractice:
      "Modify All Data bypasses all sharing rules and allows full write access to every record. Only System Administrator profiles should have this permission.",
    remedy:
      "Remove Modify All Data from non-admin profiles. Use permission sets to grant targeted access to specific users who need elevated data access.",
    evaluate: (data) => {
      const flagged = data.profilePermissions.filter(
        (p) => p.PermissionsModifyAllData && !isAdminProfile(p["Profile.Name"])
      );
      if (flagged.length === 0) return [];
      return [
        {
          checkId: "PROFILE_MODIFY_ALL_DATA",
          category: "profiles",
          severity: "critical",
          title: "Non-admin profiles with Modify All Data",
          description: `${flagged.length} non-admin profile(s) have Modify All Data enabled, granting unrestricted write access to all org data.`,
          bestPractice:
            "Modify All Data bypasses all sharing rules and allows full write access to every record. Only System Administrator profiles should have this permission.",
          remedy:
            "Remove Modify All Data from non-admin profiles. Use permission sets to grant targeted access to specific users who need elevated data access.",
          affectedItems: flagged.map((p) => ({
            name: p["Profile.Name"] || p.Label,
            id: p.Id,
          })),
        },
      ];
    },
  },
  {
    id: "PROFILE_VIEW_ALL_DATA",
    category: "profiles",
    severity: "high",
    title: "Profiles with View All Data",
    bestPractice:
      "View All Data allows reading every record in the org regardless of sharing rules. This should be limited to admin profiles.",
    remedy:
      "Remove View All Data from non-admin profiles. Configure sharing rules and object-level permissions to provide appropriate read access.",
    evaluate: (data) => {
      const flagged = data.profilePermissions.filter(
        (p) => p.PermissionsViewAllData && !isAdminProfile(p["Profile.Name"])
      );
      if (flagged.length === 0) return [];
      return [
        {
          checkId: "PROFILE_VIEW_ALL_DATA",
          category: "profiles",
          severity: "high",
          title: "Non-admin profiles with View All Data",
          description: `${flagged.length} non-admin profile(s) have View All Data enabled.`,
          bestPractice:
            "View All Data allows reading every record in the org regardless of sharing rules. This should be limited to admin profiles.",
          remedy:
            "Remove View All Data from non-admin profiles. Configure sharing rules and object-level permissions to provide appropriate read access.",
          affectedItems: flagged.map((p) => ({
            name: p["Profile.Name"] || p.Label,
            id: p.Id,
          })),
        },
      ];
    },
  },
  {
    id: "PROFILE_MANAGE_USERS",
    category: "profiles",
    severity: "high",
    title: "Profiles with Manage Users",
    bestPractice:
      "Manage Users allows creating, editing, and deactivating user accounts plus assigning permission sets. This is a powerful admin capability.",
    remedy:
      "Remove Manage Users from non-admin profiles. Use delegated administration groups for limited user management needs.",
    evaluate: (data) => {
      const flagged = data.profilePermissions.filter(
        (p) => p.PermissionsManageUsers && !isAdminProfile(p["Profile.Name"])
      );
      if (flagged.length === 0) return [];
      return [
        {
          checkId: "PROFILE_MANAGE_USERS",
          category: "profiles",
          severity: "high",
          title: "Non-admin profiles with Manage Users",
          description: `${flagged.length} non-admin profile(s) have Manage Users enabled.`,
          bestPractice:
            "Manage Users allows creating, editing, and deactivating user accounts plus assigning permission sets. This is a powerful admin capability.",
          remedy:
            "Remove Manage Users from non-admin profiles. Use delegated administration groups for limited user management needs.",
          affectedItems: flagged.map((p) => ({
            name: p["Profile.Name"] || p.Label,
            id: p.Id,
          })),
        },
      ];
    },
  },
  {
    id: "PROFILE_AUTHOR_APEX",
    category: "profiles",
    severity: "medium",
    title: "Author Apex in production",
    bestPractice:
      "Author Apex allows writing and executing arbitrary code. In production orgs this should be tightly restricted.",
    remedy:
      "Remove Author Apex from profiles in production. Apex changes should go through a deployment pipeline from sandbox.",
    evaluate: (data) => {
      if (data.orgType !== "production") return [];
      const flagged = data.profilePermissions.filter(
        (p) => p.PermissionsAuthorApex && !isAdminProfile(p["Profile.Name"])
      );
      if (flagged.length === 0) return [];
      return [
        {
          checkId: "PROFILE_AUTHOR_APEX",
          category: "profiles",
          severity: "medium",
          title: "Author Apex enabled in production",
          description: `${flagged.length} non-admin profile(s) have Author Apex enabled in a production org.`,
          bestPractice:
            "Author Apex allows writing and executing arbitrary code. In production orgs this should be tightly restricted.",
          remedy:
            "Remove Author Apex from profiles in production. Apex changes should go through a deployment pipeline from sandbox.",
          affectedItems: flagged.map((p) => ({
            name: p["Profile.Name"] || p.Label,
            id: p.Id,
          })),
        },
      ];
    },
  },

  // --- Permission Sets ---
  {
    id: "PERMSET_MODIFY_ALL_DATA",
    category: "permissionSets",
    severity: "critical",
    title: "Permission sets with Modify All Data",
    bestPractice:
      "Permission sets with Modify All Data can be assigned to any user, escalating their access to full org write permissions.",
    remedy:
      "Remove Modify All Data from permission sets. Create more targeted permission sets with specific object and field access.",
    evaluate: (data) => {
      const flagged = data.permSetPermissions.filter((p) => p.PermissionsModifyAllData);
      if (flagged.length === 0) return [];
      return [
        {
          checkId: "PERMSET_MODIFY_ALL_DATA",
          category: "permissionSets",
          severity: "critical",
          title: "Permission sets with Modify All Data",
          description: `${flagged.length} permission set(s) grant Modify All Data.`,
          bestPractice:
            "Permission sets with Modify All Data can be assigned to any user, escalating their access to full org write permissions.",
          remedy:
            "Remove Modify All Data from permission sets. Create more targeted permission sets with specific object and field access.",
          affectedItems: flagged.map((p) => ({
            name: p.Label || p.Name,
            id: p.Id,
          })),
        },
      ];
    },
  },
  {
    id: "PERMSET_VIEW_ALL_DATA",
    category: "permissionSets",
    severity: "high",
    title: "Permission sets with View All Data",
    bestPractice:
      "View All Data on a permission set gives any assigned user complete read access to every record, bypassing all sharing rules.",
    remedy:
      "Remove View All Data from permission sets. Use object-level View All or sharing rules for targeted read access.",
    evaluate: (data) => {
      const flagged = data.permSetPermissions.filter((p) => p.PermissionsViewAllData);
      if (flagged.length === 0) return [];
      return [
        {
          checkId: "PERMSET_VIEW_ALL_DATA",
          category: "permissionSets",
          severity: "high",
          title: "Permission sets with View All Data",
          description: `${flagged.length} permission set(s) grant View All Data.`,
          bestPractice:
            "View All Data on a permission set gives any assigned user complete read access to every record, bypassing all sharing rules.",
          remedy:
            "Remove View All Data from permission sets. Use object-level View All or sharing rules for targeted read access.",
          affectedItems: flagged.map((p) => ({
            name: p.Label || p.Name,
            id: p.Id,
          })),
        },
      ];
    },
  },
  {
    id: "PERMSET_UNASSIGNED",
    category: "permissionSets",
    severity: "medium",
    title: "Unassigned permission sets",
    bestPractice:
      "Unassigned permission sets create clutter and may indicate unused or forgotten access configurations that should be cleaned up.",
    remedy:
      "Review unassigned permission sets. Delete those that are no longer needed, or assign them if they serve a purpose.",
    evaluate: (data) => {
      if (data.unassignedPermSets.length === 0) return [];
      return [
        {
          checkId: "PERMSET_UNASSIGNED",
          category: "permissionSets",
          severity: "medium",
          title: "Unassigned permission sets",
          description: `${data.unassignedPermSets.length} permission set(s) have no user assignments.`,
          bestPractice:
            "Unassigned permission sets create clutter and may indicate unused or forgotten access configurations that should be cleaned up.",
          remedy:
            "Review unassigned permission sets. Delete those that are no longer needed, or assign them if they serve a purpose.",
          affectedItems: data.unassignedPermSets.map((p) => ({
            name: p.label || p.name,
            id: p.id,
          })),
        },
      ];
    },
  },
  {
    id: "PERMSET_GROUP_EMPTY",
    category: "permissionSets",
    severity: "low",
    title: "Empty permission set groups",
    bestPractice:
      "Permission set groups without components serve no purpose and add unnecessary complexity to the security model.",
    remedy:
      "Add permission sets to empty groups or delete the groups if they are no longer needed.",
    evaluate: (data) => {
      const empty = data.permSetGroups.filter((g) => g.components.length === 0);
      if (empty.length === 0) return [];
      return [
        {
          checkId: "PERMSET_GROUP_EMPTY",
          category: "permissionSets",
          severity: "low",
          title: "Empty permission set groups",
          description: `${empty.length} permission set group(s) contain no permission sets.`,
          bestPractice:
            "Permission set groups without components serve no purpose and add unnecessary complexity to the security model.",
          remedy:
            "Add permission sets to empty groups or delete the groups if they are no longer needed.",
          affectedItems: empty.map((g) => ({
            name: g.masterLabel,
            id: g.id,
          })),
        },
      ];
    },
  },

  // --- User Access ---
  {
    id: "USER_ADMIN_COUNT",
    category: "userAccess",
    severity: "high",
    title: "Excessive system administrators",
    bestPractice:
      "Limiting the number of System Administrator users reduces the risk of accidental or malicious changes to critical org settings.",
    remedy:
      "Reassign users to appropriate profiles. Use permission sets to grant specific admin capabilities only to users who need them.",
    evaluate: (data) => {
      const admins = data.userAssignments.filter(
        (u) => u.isActive && isAdminProfile(u.profileName)
      );
      if (admins.length <= 3) return [];
      return [
        {
          checkId: "USER_ADMIN_COUNT",
          category: "userAccess",
          severity: "high",
          title: "Too many System Administrator users",
          description: `${admins.length} active users have the System Administrator profile (recommended: 3 or fewer).`,
          bestPractice:
            "Limiting the number of System Administrator users reduces the risk of accidental or malicious changes to critical org settings.",
          remedy:
            "Reassign users to appropriate profiles. Use permission sets to grant specific admin capabilities only to users who need them.",
          affectedItems: admins.map((u) => ({
            name: u.name,
            id: u.userId,
            detail: u.username,
          })),
        },
      ];
    },
  },
  {
    id: "USER_EXCESSIVE_PERMSETS",
    category: "userAccess",
    severity: "medium",
    title: "Users with excessive permission sets",
    bestPractice:
      "Users with many permission sets may have accumulated access over time. This increases the attack surface and makes auditing difficult.",
    remedy:
      "Review users with many permission sets. Consolidate overlapping sets into permission set groups and remove unnecessary assignments.",
    evaluate: (data) => {
      const excessive = data.userAssignments.filter(
        (u) => u.isActive && u.permissionSets.length > 10
      );
      if (excessive.length === 0) return [];
      return [
        {
          checkId: "USER_EXCESSIVE_PERMSETS",
          category: "userAccess",
          severity: "medium",
          title: "Users with more than 10 permission sets",
          description: `${excessive.length} user(s) have more than 10 permission sets assigned.`,
          bestPractice:
            "Users with many permission sets may have accumulated access over time. This increases the attack surface and makes auditing difficult.",
          remedy:
            "Review users with many permission sets. Consolidate overlapping sets into permission set groups and remove unnecessary assignments.",
          affectedItems: excessive.map((u) => ({
            name: u.name,
            id: u.userId,
            detail: `${u.permissionSets.length} permission sets`,
          })),
        },
      ];
    },
  },
  {
    id: "USER_PROFILE_ONLY",
    category: "userAccess",
    severity: "info",
    title: "Users with no permission sets",
    bestPractice:
      "Users relying solely on their profile for access may not be following the Salesforce best practice of using permission sets for granular access control.",
    remedy:
      "Consider migrating profile-based permissions to permission sets for better flexibility and auditability.",
    evaluate: (data) => {
      const profileOnly = data.userAssignments.filter(
        (u) => u.isActive && u.permissionSets.length === 0
      );
      if (profileOnly.length === 0) return [];
      return [
        {
          checkId: "USER_PROFILE_ONLY",
          category: "userAccess",
          severity: "info",
          title: "Users with profile-only access",
          description: `${profileOnly.length} active user(s) have no permission sets assigned.`,
          bestPractice:
            "Users relying solely on their profile for access may not be following the Salesforce best practice of using permission sets for granular access control.",
          remedy:
            "Consider migrating profile-based permissions to permission sets for better flexibility and auditability.",
          affectedItems: profileOnly.map((u) => ({
            name: u.name,
            id: u.userId,
            detail: `Profile: ${u.profileName}`,
          })),
        },
      ];
    },
  },

  // --- Object Security ---
  {
    id: "OBJECT_BROAD_MODIFY_ALL",
    category: "objectSecurity",
    severity: "high",
    title: "Objects with broad Modify All access",
    bestPractice:
      "Objects granted ModifyAll in many profiles or permission sets have a large attack surface. Access should be tightly scoped.",
    remedy:
      "Reduce the number of profiles and permission sets with ModifyAll on these objects. Use sharing rules for targeted write access.",
    evaluate: (data) => {
      const modifyByObject = new Map<string, string[]>();
      for (const op of data.objectPermissions) {
        if (op.PermissionsModifyAllRecords) {
          const list = modifyByObject.get(op.SobjectType) || [];
          list.push(op["Parent.Label"] || op["Parent.Name"]);
          modifyByObject.set(op.SobjectType, list);
        }
      }
      const broad = Array.from(modifyByObject.entries()).filter(([, parents]) => parents.length > 3);
      if (broad.length === 0) return [];
      return [
        {
          checkId: "OBJECT_BROAD_MODIFY_ALL",
          category: "objectSecurity",
          severity: "high",
          title: "Objects with ModifyAll on many entries",
          description: `${broad.length} object(s) have ModifyAll granted in more than 3 profiles/permission sets.`,
          bestPractice:
            "Objects granted ModifyAll in many profiles or permission sets have a large attack surface. Access should be tightly scoped.",
          remedy:
            "Reduce the number of profiles and permission sets with ModifyAll on these objects. Use sharing rules for targeted write access.",
          affectedItems: broad.map(([obj, parents]) => ({
            name: obj,
            detail: `${parents.length} entries: ${parents.slice(0, 5).join(", ")}${parents.length > 5 ? "..." : ""}`,
          })),
        },
      ];
    },
  },
  {
    id: "OBJECT_BROAD_VIEW_ALL",
    category: "objectSecurity",
    severity: "medium",
    title: "Objects with broad View All access",
    bestPractice:
      "Objects with ViewAll granted broadly may expose sensitive data to more users than necessary.",
    remedy:
      "Review ViewAll grants and replace with sharing rules or object-level read access where appropriate.",
    evaluate: (data) => {
      const viewByObject = new Map<string, string[]>();
      for (const op of data.objectPermissions) {
        if (op.PermissionsViewAllRecords) {
          const list = viewByObject.get(op.SobjectType) || [];
          list.push(op["Parent.Label"] || op["Parent.Name"]);
          viewByObject.set(op.SobjectType, list);
        }
      }
      const broad = Array.from(viewByObject.entries()).filter(([, parents]) => parents.length > 5);
      if (broad.length === 0) return [];
      return [
        {
          checkId: "OBJECT_BROAD_VIEW_ALL",
          category: "objectSecurity",
          severity: "medium",
          title: "Objects with ViewAll on many entries",
          description: `${broad.length} object(s) have ViewAll granted in more than 5 profiles/permission sets.`,
          bestPractice:
            "Objects with ViewAll granted broadly may expose sensitive data to more users than necessary.",
          remedy:
            "Review ViewAll grants and replace with sharing rules or object-level read access where appropriate.",
          affectedItems: broad.map(([obj, parents]) => ({
            name: obj,
            detail: `${parents.length} entries: ${parents.slice(0, 5).join(", ")}${parents.length > 5 ? "..." : ""}`,
          })),
        },
      ];
    },
  },
];
