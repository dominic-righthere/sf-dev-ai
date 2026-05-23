import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

const now = () => new Date();

export const appUsers = sqliteTable("app_users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

export const orgConnections = sqliteTable("org_connections", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  appUserId: text("app_user_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull(),
  sfUserId: text("sf_user_id").notNull(),
  username: text("username").notNull(),
  displayName: text("display_name").notNull(),
  instanceUrl: text("instance_url").notNull(),
  orgType: text("org_type", { enum: ["production", "sandbox"] }).notNull(),
  orgLabel: text("org_label"),
  refreshToken: text("refresh_token").notNull(),
  connectedAt: integer("connected_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull(),
  appUserId: text("app_user_id").references(() => appUsers.id),
  title: text("title").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  toolCalls: text("tool_calls"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

export const flowDrafts = sqliteTable("flow_drafts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text("conversation_id").references(() => conversations.id),
  orgId: text("org_id").notNull(),
  createdByUserId: text("created_by_user_id").references(() => appUsers.id),
  apiName: text("api_name").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  flowJson: text("flow_json").notNull(),
  status: text("status", { enum: ["draft", "deployed"] }).notNull().default("draft"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

export const schemaCache = sqliteTable("schema_cache", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  objectName: text("object_name").notNull(),
  describeJson: text("describe_json").notNull(),
  cachedAt: integer("cached_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

export const orgDocuments = sqliteTable("org_documents", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull(),
  docType: text("doc_type").notNull(),
  subject: text("subject"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  version: integer("version").notNull().default(1),
  generatedAt: integer("generated_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

export const metadataCache = sqliteTable("metadata_cache", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  cacheType: text("cache_type").notNull(),
  cacheKey: text("cache_key"),
  dataJson: text("data_json").notNull(),
  cachedAt: integer("cached_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

