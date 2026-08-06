import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { publicProcedure } from "../index";
import { db } from "@smart-step-mapper/db";
import { maps, steps } from "@smart-step-mapper/db/schema";
import { eq } from "drizzle-orm";
import { callGroq } from "../utils/chat";
import {
  alternativeMethodSchema,
  buildAnalyzerPrompt,
  buildPracticeProblemPrompt,
  buildSolutionGeneratorPrompt,
  confirmedProblemSchema,
  generatedStepSchema,
  parseAnalyzeResult,
  parseGenerateResult,
  parsePracticeProblem,
  resolveTopicByName,
} from "../utils/solve";
import { verifyStepWithContext } from "../utils/verify-step";

const ANALYZER_SYSTEM_PROMPT = `You are a structured-information extractor for "Smart Step Mapper", a STEM tutoring app. Students type a word problem and you extract its key structure. Follow the instructions in the user message exactly and respond with ONLY a JSON object.`;

const GENERATOR_SYSTEM_PROMPT = `You are a patient STEM tutor for "Smart Step Mapper". You produce complete, correct, step-by-step solutions with every step fully broken down (formula → variables → substitution → calculation → result). Follow the instructions in the user message exactly and respond with ONLY a JSON object.`;

const PRACTICE_SYSTEM_PROMPT = `You are a problem-writer for "Smart Step Mapper", a STEM practice app. You create one new practice problem at a time that tests the same concept as a given source problem but with different numbers. Follow the instructions in the user message exactly and respond with ONLY a JSON object.`;

export const solveRouter = {
  // §8.1 — decision OQ1: resolves/creates the topic at analyze time
  analyze: publicProcedure
    .input(z.object({ problemStatement: z.string().min(1).max(4000) }))
    .handler(async ({ input, context }) => {
      if (!context.user) throw new ORPCError("UNAUTHORIZED", { message: "Not authenticated" });

      const raw = await callGroq(
        [
          { role: "system", content: ANALYZER_SYSTEM_PROMPT },
          { role: "user", content: buildAnalyzerPrompt(input.problemStatement) },
        ],
        { temperature: 0.2, maxTokens: 512, timeoutMs: 15_000 },
      );

      const parsed = parseAnalyzeResult(raw);
      if (!parsed) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Could not analyze the problem. Please try again.",
        });
      }

      const topicName = parsed.topicName?.trim() ?? "";
      let topicId: string | null = null;
      if (!parsed.needsClarification?.length && topicName) {
        topicId = await resolveTopicByName(topicName);
      }

      return {
        topicId,
        topicName: topicName || null,
        formula: parsed.formula,
        variables: parsed.variables,
        unknown: parsed.unknown,
        unit: parsed.unit,
        assumptions: parsed.assumptions,
        warnings: parsed.warnings,
        needsClarification: parsed.needsClarification ?? [],
      };
    }),

  // §8.2 — not persisted until the user clicks Save as Map
  generate: publicProcedure
    .input(confirmedProblemSchema)
    .handler(async ({ input, context }) => {
      if (!context.user) throw new ORPCError("UNAUTHORIZED", { message: "Not authenticated" });

      const topicId = await resolveTopicByName(input.topicName); // idempotent

      const raw = await callGroq(
        [
          { role: "system", content: GENERATOR_SYSTEM_PROMPT },
          { role: "user", content: buildSolutionGeneratorPrompt(input) },
        ],
        { temperature: 0.3, maxTokens: 2048, timeoutMs: 30_000 },
      );

      const parsed = parseGenerateResult(raw);
      if (!parsed) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Could not generate a solution. Please try again.",
        });
      }

      return { topicId, topicName: input.topicName, ...parsed };
    }),

  // §8.3 — one variant per call, held client-side only, no DB writes
  practiceProblem: publicProcedure
    .input(
      z.object({
        source: confirmedProblemSchema,
        excludeStatements: z.array(z.string()).default([]),
      }),
    )
    .handler(async ({ input, context }) => {
      if (!context.user) throw new ORPCError("UNAUTHORIZED", { message: "Not authenticated" });

      const raw = await callGroq(
        [
          { role: "system", content: PRACTICE_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildPracticeProblemPrompt(input.source, input.excludeStatements),
          },
        ],
        { temperature: 0.7, maxTokens: 1536, timeoutMs: 20_000 },
      );

      const parsed = parsePracticeProblem(raw);
      if (!parsed) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Could not create a practice problem. Please try again.",
        });
      }

      return parsed;
    }),

  // §8.5 — stateless step verification for practice mode
  verifyStep: publicProcedure
    .input(
      z.object({
        problemStatement: z.string().min(1),
        topicName: z.string().optional(),
        formula: z.string().optional(),
        variables: z.string().optional(),
        unit: z.string().optional(),
        expectedSteps: z
          .array(
            z.object({
              stepNumber: z.number().int().min(1),
              explanation: z.string(),
              result: z.string(),
            }),
          )
          .default([]),
        previouslyEnteredSteps: z
          .array(
            z.object({
              explanation: z.string(),
              mathExpression: z.string(),
              result: z.string(),
            }),
          )
          .default([]),
        newStep: z.object({
          explanation: z.string(),
          mathExpression: z.string(),
          result: z.string(),
        }),
      }),
    )
    .handler(async ({ input, context }) => {
      if (!context.user) throw new ORPCError("UNAUTHORIZED", { message: "Not authenticated" });
      return verifyStepWithContext(input, input.previouslyEnteredSteps, input.newStep);
    }),

  // §8.4 — transactional save; AI-authored steps marked correct (OQ3)
  saveToMap: publicProcedure
    .input(
      z.object({
        topicName: z.string().min(1),
        title: z.string().min(1),
        problemStatement: z.string().min(1),
        formula: z.string().default(""),
        variables: z.string().default(""),
        unknown: z.string().default(""),
        unit: z.string().default(""),
        finalAnswer: z.string().min(1),
        method: z.string().default("Standard"),
        alternativeMethods: z.array(alternativeMethodSchema).default([]),
        steps: z.array(generatedStepSchema).min(1),
      }),
    )
    .handler(async ({ input, context }) => {
      if (!context.user) throw new ORPCError("UNAUTHORIZED", { message: "Not authenticated" });

      const topicId = await resolveTopicByName(input.topicName);

      const [map] = await db
        .insert(maps)
        .values({
          userId: context.user.id,
          topicId,
          title: input.title,
          problemStatement: input.problemStatement,
          formula: input.formula,
          variables: input.variables,
          unit: input.unit,
          finalAnswer: input.finalAnswer,
          method: input.method,
          alternativeMethods: input.alternativeMethods.length
            ? JSON.stringify(input.alternativeMethods)
            : "",
        })
        .returning({ id: maps.id });
      if (!map) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Could not save the map." });
      }

      try {
        await db.insert(steps).values(
          input.steps.map((s) => ({
            mapId: map.id,
            stepNumber: s.stepNumber,
            explanation: s.explanation,
            mathExpression: s.substitution, // main display line for MapVisualization compat
            result: s.result,
            formulaUsed: s.formulaUsed,
            variablesUsed: s.variablesUsed,
            substitution: s.substitution,
            calculation: s.calculation,
            isCorrect: "correct", // OQ3 — AI-authored steps count as correct
          })),
        );
      } catch (error) {
        // neon-http driver has no transaction support — roll back manually.
        await db.delete(maps).where(eq(maps.id, map.id));
        throw error;
      }

      return { mapId: map.id };
    }),
};
