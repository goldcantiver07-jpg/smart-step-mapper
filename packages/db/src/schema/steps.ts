import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { maps } from "./maps";

export const steps = pgTable("steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  mapId: uuid("map_id").notNull().references(() => maps.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  explanation: text("explanation").notNull().default(""),
  mathExpression: text("math_expression").notNull().default(""),
  result: text("result").notNull().default(""),
  formulaUsed: text("formula_used").notNull().default(""),
  variablesUsed: text("variables_used").notNull().default(""),
  substitution: text("substitution").notNull().default(""),
  calculation: text("calculation").notNull().default(""),
  isCorrect: text("is_correct").notNull().default("unchecked"),
  feedback: text("feedback").notNull().default(""),
  suggestedStep: text("suggested_step").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Step = typeof steps.$inferSelect;
export type NewStep = typeof steps.$inferInsert;
