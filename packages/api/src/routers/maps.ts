import { z } from "zod";
import { publicProcedure } from "../index";
import { db } from "@smart-step-mapper/db";
import { maps, steps, topics } from "@smart-step-mapper/db/schema";
import { eq, desc, asc, getTableColumns } from "drizzle-orm";
import { verifyStepResult } from "../utils/adaptive-engine";
import { verifyStepWithAI } from "../utils/verify-step";

export const mapsRouter = {
  create: publicProcedure
    .input(
      z.object({
        topicId: z.string().uuid(),
        problemStatement: z.string().min(1),
        formula: z.string().optional().default(""),
        variables: z.string().optional().default(""),
        title: z.string().optional().default(""),
      }),
    )
    .handler(async ({ input, context }) => {
      if (!context.user) throw new Error("Not authenticated");
      const [map] = await db
        .insert(maps)
        .values({
          userId: context.user.id,
          topicId: input.topicId,
          problemStatement: input.problemStatement,
          formula: input.formula,
          variables: input.variables,
          title: input.title || input.problemStatement.slice(0, 80),
        })
        .returning();
      return map;
    }),

  list: publicProcedure.handler(async ({ context }) => {
    if (!context.user) throw new Error("Not authenticated");
    return db
      .select({ ...getTableColumns(maps), topicName: topics.name })
      .from(maps)
      .innerJoin(topics, eq(maps.topicId, topics.id))
      .where(eq(maps.userId, context.user.id))
      .orderBy(desc(maps.updatedAt));
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      if (!context.user) throw new Error("Not authenticated");
      const [map] = await db
        .select({ ...getTableColumns(maps), topicName: topics.name })
        .from(maps)
        .innerJoin(topics, eq(maps.topicId, topics.id))
        .where(eq(maps.id, input.id))
        .limit(1);
      if (!map) throw new Error("Map not found");
      if (map.userId !== context.user.id) throw new Error("Forbidden");

      const mapSteps = await db
        .select()
        .from(steps)
        .where(eq(steps.mapId, input.id))
        .orderBy(asc(steps.stepNumber));

      return { ...map, steps: mapSteps };
    }),

  addStep: publicProcedure
    .input(
      z.object({
        mapId: z.string().uuid(),
        stepNumber: z.number().int().min(1),
        explanation: z.string().optional().default(""),
        mathExpression: z.string().optional().default(""),
        result: z.string().optional().default(""),
      }),
    )
    .handler(async ({ input, context }) => {
      if (!context.user) throw new Error("Not authenticated");
      const [map] = await db
        .select({ userId: maps.userId })
        .from(maps)
        .where(eq(maps.id, input.mapId))
        .limit(1);
      if (!map) throw new Error("Map not found");
      if (map.userId !== context.user.id) throw new Error("Forbidden");

      const [step] = await db
        .insert(steps)
        .values({
          mapId: input.mapId,
          stepNumber: input.stepNumber,
          explanation: input.explanation,
          mathExpression: input.mathExpression,
          result: input.result,
        })
        .returning();
      return step;
    }),

  updateStep: publicProcedure
    .input(
      z.object({
        stepId: z.string().uuid(),
        explanation: z.string().optional(),
        mathExpression: z.string().optional(),
        result: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      if (!context.user) throw new Error("Not authenticated");
      const [existing] = await db
        .select({ id: steps.id, mapId: steps.mapId })
        .from(steps)
        .where(eq(steps.id, input.stepId))
        .limit(1);
      if (!existing) throw new Error("Step not found");

      const [map] = await db
        .select({ userId: maps.userId })
        .from(maps)
        .where(eq(maps.id, existing.mapId))
        .limit(1);
      if (map.userId !== context.user.id) throw new Error("Forbidden");

      const [updated] = await db
        .update(steps)
        .set({
          ...(input.explanation !== undefined && { explanation: input.explanation }),
          ...(input.mathExpression !== undefined && { mathExpression: input.mathExpression }),
          ...(input.result !== undefined && { result: input.result }),
        })
        .where(eq(steps.id, input.stepId))
        .returning();
      return updated;
    }),

  verifyStep: publicProcedure
    .input(
      z.object({
        stepId: z.string().uuid(),
        expectedResult: z.string().min(1),
        userResult: z.string().min(1),
      }),
    )
    .handler(async ({ input }) => {
      const verification = verifyStepResult(input.expectedResult, input.userResult);
      if (verification.isCorrect) {
        await db
          .update(steps)
          .set({ isCorrect: "correct", feedback: "" })
          .where(eq(steps.id, input.stepId));
      } else {
        await db
          .update(steps)
          .set({ isCorrect: "incorrect", feedback: verification.feedback })
          .where(eq(steps.id, input.stepId));
      }
      return verification;
    }),

  verifyNewStep: publicProcedure
    .input(
      z.object({
        stepId: z.string().uuid(),
        mode: z.enum(["auto", "alternative"]).optional().default("auto"),
      }),
    )
    .handler(async ({ input, context }) => {
      if (!context.user) throw new Error("Not authenticated");

      const [step] = await db.select().from(steps).where(eq(steps.id, input.stepId)).limit(1);
      if (!step) throw new Error("Step not found");

      const [map] = await db
        .select({ ...getTableColumns(maps), topicName: topics.name })
        .from(maps)
        .innerJoin(topics, eq(maps.topicId, topics.id))
        .where(eq(maps.id, step.mapId))
        .limit(1);
      if (!map) throw new Error("Map not found");
      if (map.userId !== context.user.id) throw new Error("Forbidden");

      const mapSteps = await db
        .select()
        .from(steps)
        .where(eq(steps.mapId, step.mapId))
        .orderBy(asc(steps.stepNumber));

      const verification = await verifyStepWithAI(
        {
          title: map.title,
          topicName: map.topicName,
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
        },
        step.stepNumber,
        input.mode,
      );

      const verifiedAt = new Date().toISOString();
      if (verification.unavailable) {
        return { isCorrect: false, feedback: "", suggestedStep: null, unavailable: true, verifiedAt };
      }

      await db
        .update(steps)
        .set({
          isCorrect: verification.isCorrect ? "correct" : "incorrect",
          feedback: verification.feedback,
          suggestedStep: verification.suggestedStep ? JSON.stringify(verification.suggestedStep) : "",
        })
        .where(eq(steps.id, step.id));

      return {
        isCorrect: verification.isCorrect,
        feedback: verification.feedback,
        suggestedStep: verification.suggestedStep,
        verifiedAt,
      };
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        topicId: z.string().uuid().optional(),
        title: z.string().optional(),
        problemStatement: z.string().optional(),
        formula: z.string().optional(),
        variables: z.string().optional(),
        status: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      if (!context.user) throw new Error("Not authenticated");
      const [existing] = await db
        .select({ userId: maps.userId })
        .from(maps)
        .where(eq(maps.id, input.id))
        .limit(1);
      if (!existing) throw new Error("Map not found");
      if (existing.userId !== context.user.id) throw new Error("Forbidden");

      const updateData: Record<string, string> = {};
      if (input.topicId !== undefined) updateData.topicId = input.topicId;
      if (input.title !== undefined) updateData.title = input.title;
      if (input.problemStatement !== undefined) updateData.problemStatement = input.problemStatement;
      if (input.formula !== undefined) updateData.formula = input.formula;
      if (input.variables !== undefined) updateData.variables = input.variables;
      if (input.status !== undefined) updateData.status = input.status;

      const [updated] = await db
        .update(maps)
        .set(updateData)
        .where(eq(maps.id, input.id))
        .returning();
      return updated;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      if (!context.user) throw new Error("Not authenticated");
      const [map] = await db
        .select({ userId: maps.userId })
        .from(maps)
        .where(eq(maps.id, input.id))
        .limit(1);
      if (!map) throw new Error("Map not found");
      if (map.userId !== context.user.id) throw new Error("Forbidden");
      await db.delete(maps).where(eq(maps.id, input.id));
      return { success: true };
    }),
};
