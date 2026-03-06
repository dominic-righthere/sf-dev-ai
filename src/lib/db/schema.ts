import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: text("org_id").notNull(),
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
