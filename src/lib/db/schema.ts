import { pgTable, text, timestamp, uuid, integer, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const appUsers = pgTable("app_users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});

export const orgConnections = pgTable("org_connections", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  appUserId: uuid("app_user_id")
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
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: text("org_id").notNull(),
  appUserId: uuid("app_user_id").references(() => appUsers.id),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  toolCalls: text("tool_calls"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const flowDrafts = pgTable("flow_drafts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  orgId: text("org_id").notNull(),
  createdByUserId: uuid("created_by_user_id").references(() => appUsers.id),
  apiName: text("api_name").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  flowJson: text("flow_json").notNull(),
  status: text("status", { enum: ["draft", "deployed"] })
    .notNull()
    .default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const schemaCache = pgTable("schema_cache", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  objectName: text("object_name").notNull(),
  describeJson: text("describe_json").notNull(),
  cachedAt: timestamp("cached_at").notNull().defaultNow(),
});

export const orgDocuments = pgTable("org_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: text("org_id").notNull(),
  docType: text("doc_type").notNull(),
  subject: text("subject"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  version: integer("version").notNull().default(1),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const metadataCache = pgTable("metadata_cache", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  cacheType: text("cache_type").notNull(),
  cacheKey: text("cache_key"),
  dataJson: text("data_json").notNull(),
  cachedAt: timestamp("cached_at").notNull().defaultNow(),
});
