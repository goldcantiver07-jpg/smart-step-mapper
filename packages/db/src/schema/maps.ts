import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { topics } from "./topics";

export const maps = pgTable("maps", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  title: text("title").notNull().default(""),
  problemStatement: text("problem_statement").notNull(),
  formula: text("formula").notNull().default(""),
  variables: text("variables").notNull().default(""),
  unit: text("unit").notNull().default(""),
  finalAnswer: text("final_answer").notNull().default(""),
  method: text("method").notNull().default(""),
  alternativeMethods: text("alternative_methods").notNull().default(""),
  status: text("status").notNull().default("in_progress"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Map = typeof maps.$inferSelect;
export type NewMap = typeof maps.$inferInsert;
