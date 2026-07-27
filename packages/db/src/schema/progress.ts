import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { topics } from "./topics";

export const progress = pgTable("progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  mapsCompleted: integer("maps_completed").notNull().default(0),
  totalSteps: integer("total_steps").notNull().default(0),
  correctSteps: integer("correct_steps").notNull().default(0),
  lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
});

export type Progress = typeof progress.$inferSelect;
export type NewProgress = typeof progress.$inferInsert;
