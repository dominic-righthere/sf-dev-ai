import { NextResponse } from "next/server";

const manifest = {
  mcp_version: "1.0",
  spec_version: "0.2.0",
  name: "SF Dev AI",
  description:
    "Salesforce development workbench with AI-powered tools for querying data, exploring schemas, managing metadata, custom fields, validation rules, and permissions.",
  endpoint: "/api/mcp/streamable-http",
  transport: "streamable-http",
  auth: {
    type: "oauth2",
    authorization_url: "/auth/login",
    scopes: {
      salesforce: "Access connected Salesforce org data and metadata",
    },
    pkce_required: true,
  },
  tools: [
    // Data tools
    {
      name: "run_soql_query",
      description: "Execute a SOQL query against the connected Salesforce org (SELECT only, 200 record cap)",
      tier: 0,
      requires_auth: true,
    },
    {
      name: "count_records",
      description: "Count records matching a condition on a Salesforce object",
      tier: 0,
      requires_auth: true,
    },
    {
      name: "create_record",
      description: "Create a new record on a Salesforce object",
      tier: 2,
      requires_auth: true,
      requires_confirmation: true,
      confirmation_message: "Create a new {objectName} record?",
    },
    {
      name: "update_record",
      description: "Update an existing Salesforce record by ID",
      tier: 2,
      requires_auth: true,
      requires_confirmation: true,
      confirmation_message: "Update record {recordId} on {objectName}?",
    },
    {
      name: "delete_record",
      description: "Delete a Salesforce record by ID",
      tier: 3,
      requires_auth: true,
      requires_confirmation: true,
      confirmation_message: "Delete record {recordId} from {objectName}? This cannot be undone.",
    },
    // Schema tools
    {
      name: "describe_object",
      description: "Get full field and relationship metadata for a Salesforce object",
      tier: 0,
      requires_auth: true,
    },
    {
      name: "list_objects",
      description: "List all Salesforce objects in the org with optional standard/custom filter",
      tier: 0,
      requires_auth: true,
    },
    {
      name: "search_objects",
      description: "Search Salesforce objects by name or label pattern",
      tier: 0,
      requires_auth: true,
    },
    {
      name: "describe_field",
      description: "Get detailed metadata for a single field on an object",
      tier: 0,
      requires_auth: true,
    },
    // Metadata tools
    {
      name: "list_metadata",
      description: "List metadata components of a given type (Flow, CustomField, PermissionSet, etc.)",
      tier: 0,
      requires_auth: true,
    },
    {
      name: "read_metadata",
      description: "Read full metadata for a specific component by type and full name",
      tier: 1,
      requires_auth: true,
    },
    {
      name: "list_apex_classes",
      description: "List all Apex classes in the org",
      tier: 0,
      requires_auth: true,
    },
    {
      name: "read_apex_class",
      description: "Read the full body of an Apex class",
      tier: 1,
      requires_auth: true,
    },
    {
      name: "list_apex_triggers",
      description: "List all Apex triggers in the org",
      tier: 0,
      requires_auth: true,
    },
    {
      name: "list_flexipages",
      description: "List all FlexiPages (Lightning Pages) in the org",
      tier: 0,
      requires_auth: true,
    },
    {
      name: "read_flexipage",
      description: "Read full metadata for a FlexiPage",
      tier: 1,
      requires_auth: true,
    },
    // Field operations
    {
      name: "create_custom_field",
      description: "Create a custom field on a Salesforce object",
      tier: 2,
      requires_auth: true,
      requires_confirmation: true,
      confirmation_message: "Create custom field {fieldName} on {objectName}?",
    },
    {
      name: "update_custom_field",
      description: "Update an existing custom field's metadata",
      tier: 2,
      requires_auth: true,
      requires_confirmation: true,
    },
    {
      name: "delete_custom_field",
      description: "Delete a custom field from a Salesforce object",
      tier: 3,
      requires_auth: true,
      requires_confirmation: true,
      confirmation_message: "Delete custom field {fullName}? This cannot be undone.",
    },
    {
      name: "create_validation_rule",
      description: "Create a validation rule on a Salesforce object",
      tier: 2,
      requires_auth: true,
      requires_confirmation: true,
    },
    {
      name: "update_validation_rule",
      description: "Update an existing validation rule",
      tier: 2,
      requires_auth: true,
      requires_confirmation: true,
    },
    // Permission tools
    {
      name: "list_permission_sets",
      description: "List all permission sets in the org",
      tier: 0,
      requires_auth: true,
    },
    {
      name: "list_profiles",
      description: "List all profiles in the org",
      tier: 0,
      requires_auth: true,
    },
    {
      name: "read_permission_set",
      description: "Read full metadata for a permission set",
      tier: 1,
      requires_auth: true,
    },
    {
      name: "read_profile",
      description: "Read full metadata for a profile",
      tier: 1,
      requires_auth: true,
    },
    {
      name: "update_field_permissions",
      description: "Update field-level security on a permission set",
      tier: 2,
      requires_auth: true,
      requires_confirmation: true,
    },
    {
      name: "update_object_permissions",
      description: "Update object CRUD permissions on a permission set",
      tier: 2,
      requires_auth: true,
      requires_confirmation: true,
    },
  ],
  pages: {
    "/objects": {
      tools: [
        "describe_object",
        "list_objects",
        "search_objects",
        "describe_field",
        "create_custom_field",
        "update_custom_field",
        "delete_custom_field",
        "create_validation_rule",
        "update_validation_rule",
      ],
    },
    "/permissions": {
      tools: [
        "list_permission_sets",
        "list_profiles",
        "read_permission_set",
        "read_profile",
        "update_field_permissions",
        "update_object_permissions",
      ],
    },
    "/query": {
      tools: [
        "run_soql_query",
        "count_records",
        "describe_object",
        "list_objects",
        "search_objects",
      ],
    },
    "/flows/*": {
      tools: [
        "describe_object",
        "list_objects",
        "search_objects",
        "describe_field",
      ],
    },
    "/auth/*": {
      disabled: true,
      reason: "Authentication pages should not be accessed by MCP tools",
    },
  },
  rate_limits: {
    authenticated: {
      requests: 60,
      window: "minute",
    },
    per_tool: {
      create_record: { requests: 10, window: "minute" },
      update_record: { requests: 10, window: "minute" },
      delete_record: { requests: 5, window: "minute" },
      create_custom_field: { requests: 5, window: "minute" },
      delete_custom_field: { requests: 3, window: "minute" },
    },
  },
  security: {
    treat_page_content_as_untrusted: true,
    tool_descriptions_authoritative: true,
    require_user_presence: true,
    audit_logging: false,
  },
};

export async function GET() {
  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
