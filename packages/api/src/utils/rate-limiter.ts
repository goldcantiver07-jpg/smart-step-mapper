import { db } from "@smart-step-mapper/db";
import { rateLimits } from "@smart-step-mapper/db/schema";
import { eq, and, lt, sql, asc } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

export type RateLimitConfig = {
  maxRequests: number;
  windowSeconds: number;
};

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  login: { maxRequests: 5, windowSeconds: 15 * 60 }, // 5 attempts per 15 minutes
  register: { maxRequests: 3, windowSeconds: 15 * 60 }, // 3 attempts per 15 minutes
};

/**
 * Check if an action is rate-limited for the given client IP.
 * Uses a sliding window approach stored in Postgres.
 *
 * - Deletes expired entries for this identifier+action
 * - Counts remaining entries in the current window
 * - If limit exceeded, throws ORPCError("TOO_MANY_REQUESTS")
 * - Otherwise, inserts a new attempt entry
 */
export async function checkRateLimit(action: "login" | "register", clientIp: string): Promise<void> {
  const config = RATE_LIMIT_CONFIGS[action];
  if (!config) return;

  const now = new Date();
  const windowCutoff = new Date(now.getTime() - config.windowSeconds * 1000);

  // Clean up expired entries for this identifier+action
  await db
    .delete(rateLimits)
    .where(
      and(
        eq(rateLimits.identifier, clientIp),
        eq(rateLimits.action, action),
        lt(rateLimits.windowStart, windowCutoff),
      ),
    );

  // Count remaining entries in the current window
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.identifier, clientIp),
        eq(rateLimits.action, action),
      ),
    );

  const count = result?.count ?? 0;

  if (count >= config.maxRequests) {
    // Calculate retry-after duration
    const [oldest] = await db
      .select({ windowStart: rateLimits.windowStart })
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.identifier, clientIp),
          eq(rateLimits.action, action),
        ),
      )
      .orderBy(asc(rateLimits.windowStart))
      .limit(1);

    const retryAfter = oldest
      ? Math.ceil(
          (oldest.windowStart.getTime() + config.windowSeconds * 1000 - now.getTime()) / 1000,
        )
      : config.windowSeconds;

    throw new ORPCError("TOO_MANY_REQUESTS", {
      message: `Too many ${action} attempts. Please try again in ${Math.max(1, retryAfter)} seconds.`,
    });
  }

  // Record this attempt
  await db.insert(rateLimits).values({
    identifier: clientIp,
    action,
    requestCount: 1,
    windowStart: now,
  });
}


