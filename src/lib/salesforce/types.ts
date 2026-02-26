export interface SalesforceOrg {
  orgId: string;
  instanceUrl: string;
  username: string;
  displayName: string;
  orgType: "production" | "sandbox";
}

export interface SalesforceTokens {
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
  id: string;
  issuedAt: string;
}

export interface SObjectDescribe {
  name: string;
  label: string;
  labelPlural: string;
  keyPrefix: string;
  custom: boolean;
  fields: SFieldDescribe[];
  recordTypeInfos: RecordTypeInfo[];
  childRelationships: ChildRelationship[];
}

export interface SFieldDescribe {
  name: string;
  label: string;
  type: string;
  length: number;
  precision: number;
  scale: number;
  nillable: boolean;
  unique: boolean;
  createable: boolean;
  updateable: boolean;
  defaultValue: unknown;
  picklistValues: PicklistValue[];
  referenceTo: string[];
  relationshipName: string | null;
  calculated: boolean;
  custom: boolean;
  externalId: boolean;
}

export interface PicklistValue {
  value: string;
  label: string;
  active: boolean;
  defaultValue: boolean;
}

export interface RecordTypeInfo {
  recordTypeId: string;
  name: string;
  available: boolean;
  defaultRecordTypeMapping: boolean;
}

export interface ChildRelationship {
  childSObject: string;
  field: string;
  relationshipName: string | null;
}
