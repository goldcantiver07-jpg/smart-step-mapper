import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";

export const rateLimits = pgTable("rate_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  action: text("action").notNull(),
  requestCount: integer("request_count").notNull().default(1),
  windowStart: timestamp("window_start").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type RateLimit = typeof rateLimits.$inferSelect;
export type NewRateLimit = typeof rateLimits.$inferInsert;
