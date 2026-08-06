import { publicProcedure } from "../index";
import { db } from "@smart-step-mapper/db";
import { progress, maps, steps } from "@smart-step-mapper/db/schema";
import { eq, sql, count } from "drizzle-orm";

export const progressRouter = {
  get: publicProcedure.handler(async ({ context }) => {
    if (!context.user) throw new Error("Not authenticated");

    const rows = await db
      .select()
      .from(progress)
      .where(eq(progress.userId, context.user.id));

    return rows;
  }),

  summary: publicProcedure.handler(async ({ context }) => {
    if (!context.user) throw new Error("Not authenticated");

    const mapCount = await db
      .select({ count: count() })
      .from(maps)
      .where(eq(maps.userId, context.user.id));

    const stepStats = await db
      .select({
        total: count(),
        correct: sql<number>`COUNT(CASE WHEN ${steps.isCorrect} = 'correct' THEN 1 END)`,
        incorrect: sql<number>`COUNT(CASE WHEN ${steps.isCorrect} = 'incorrect' THEN 1 END)`,
      })
      .from(steps)
      .innerJoin(maps, eq(steps.mapId, maps.id))
      .where(eq(maps.userId, context.user.id));

    const avg = (stepStats[0]?.total ?? 0) > 0
      ? Math.round(((stepStats[0]?.correct ?? 0) / (stepStats[0]?.total ?? 1)) * 100)
      : 0;

    return {
      totalMaps: mapCount[0]?.count ?? 0,
      totalSteps: stepStats[0]?.total ?? 0,
      correctSteps: stepStats[0]?.correct ?? 0,
      incorrectSteps: stepStats[0]?.incorrect ?? 0,
      accuracy: avg,
    };
  }),
};
