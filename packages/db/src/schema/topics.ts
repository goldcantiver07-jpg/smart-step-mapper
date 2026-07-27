import { pgTable, text, uuid, integer } from "drizzle-orm/pg-core";

export const topics = pgTable("topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  displayOrder: integer("display_order").notNull().default(0),
});

export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;
