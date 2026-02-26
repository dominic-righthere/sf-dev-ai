import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  title: text("title").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  toolCalls: text("tool_calls"), // JSON string of tool calls
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const flowDrafts = sqliteTable("flow_drafts", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").references(() => conversations.id),
  orgId: text("org_id").notNull(),
  apiName: text("api_name").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  flowJson: text("flow_json").notNull(), // Serialized FlowDefinition
  status: text("status", { enum: ["draft", "deployed"] })
    .notNull()
    .default("draft"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const schemaCache = sqliteTable("schema_cache", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  objectName: text("object_name").notNull(),
  describeJson: text("describe_json").notNull(), // Serialized describe result
  cachedAt: integer("cached_at", { mode: "timestamp" }).notNull(),
});
