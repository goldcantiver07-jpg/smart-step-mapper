import { z } from "zod";
import { publicProcedure } from "../index";
import { db } from "@smart-step-mapper/db";
import { maps, steps } from "@smart-step-mapper/db/schema";
import { eq, asc } from "drizzle-orm";
import { sendChatMessage } from "../utils/chat";

export const chatRouter = {
  sendMessage: publicProcedure
    .input(
      z.object({
        mapId: z.string().uuid(),
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          }),
        ),
      }),
    )
    .handler(async ({ input, context }) => {
      if (!context.user) throw new Error("Not authenticated");

      // Fetch the map to verify ownership and get context
      const [map] = await db
        .select()
        .from(maps)
        .where(eq(maps.id, input.mapId))
        .limit(1);

      if (!map) throw new Error("Map not found");
      if (map.userId !== context.user.id) throw new Error("Forbidden");

      // Fetch steps for this map
      const mapSteps = await db
        .select()
        .from(steps)
        .where(eq(steps.mapId, input.mapId))
        .orderBy(asc(steps.stepNumber));

      // Call Groq with map context
      const response = await sendChatMessage(input.messages, {
        title: map.title,
        problemStatement: map.problemStatement,
        formula: map.formula || undefined,
        variables: map.variables || undefined,
        steps: mapSteps.map((s) => ({
          stepNumber: s.stepNumber,
          explanation: s.explanation,
          mathExpression: s.mathExpression,
          result: s.result,
          isCorrect: s.isCorrect,
          feedback: s.feedback,
        })),
      });

      return { response, timestamp: new Date().toISOString() };
    }),
};
