import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { ilike, sql } from "drizzle-orm";
import { extractJsonObject } from "./json";

// ─────────────────────────────────────────────────────────────────────────────
// Output schemas (validated before returning to the client)
// ─────────────────────────────────────────────────────────────────────────────

export const analyzeResultSchema = z.object({
  topicName: z.string().nullish(),
  formula: z.string().default(""),
  variables: z.string().default(""),
  unknown: z.string().default(""),
  unit: z.string().default(""),
  assumptions: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  needsClarification: z.array(z.string()).nullish(),
});
export type AnalyzeResult = z.infer<typeof analyzeResultSchema>;

export const generatedStepSchema = z.object({
  stepNumber: z.number().int().min(1),
  explanation: z.string(),
  formulaUsed: z.string().default(""),
  variablesUsed: z.string().default(""),
  substitution: z.string().default(""),
  calculation: z.string().default(""),
  result: z.string().default(""),
});
export type GeneratedStep = z.infer<typeof generatedStepSchema>;

export const alternativeMethodSchema = z.object({
  method: z.string().min(1),
  steps: z.array(generatedStepSchema),
});
export type AlternativeMethod = z.infer<typeof alternativeMethodSchema>;

export const generateResultSchema = z.object({
  steps: z.array(generatedStepSchema).min(1),
  finalAnswer: z.string().min(1),
  unit: z.string().default(""),
  method: z.string().default("Standard"),
  alternativeMethods: z.array(alternativeMethodSchema).default([]),
  warnings: z.array(z.string()).default([]),
  title: z.string().nullish(),
});
export type GenerateResult = z.infer<typeof generateResultSchema>;

export const practiceProblemSchema = z.object({
  problemStatement: z.string().min(1),
  expectedSteps: z.array(generatedStepSchema).min(1),
  hints: z.array(z.object({ stepNumber: z.number().int().min(1), hint: z.string().min(1) })),
  finalAnswer: z.string().min(1),
  unit: z.string().default(""),
});
export type PracticeProblem = z.infer<typeof practiceProblemSchema>;

/** Confirmed problem details the client sends to generate/practice/verify. */
export const confirmedProblemSchema = z.object({
  problemStatement: z.string().min(1),
  topicName: z.string().min(1),
  formula: z.string().default(""),
  variables: z.string().default(""),
  unknown: z.string().default(""),
  unit: z.string().default(""),
});
export type ConfirmedProblem = z.infer<typeof confirmedProblemSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builders (spec §9.1–9.3)
// ─────────────────────────────────────────────────────────────────────────────

const JSON_ONLY = "Respond with ONLY a JSON object.";

export function buildAnalyzerPrompt(problemStatement: string): string {
  return `Extract structured information from the following STEM word problem.

Problem: ${problemStatement}

Return JSON only with this exact shape:
{
  "topicName": "best topic name (math/physics/chemistry/...; null if unknown)",
  "formula": "the core formula to apply, e.g. v = d / t, or an empty string",
  "variables": "given values with units, e.g. 'd = 120 km, t = 2 h'",
  "unknown": "what is being asked",
  "unit": "the answer unit, e.g. 'km/h', or an empty string if unitless",
  "assumptions": ["any assumptions you must make"],
  "warnings": ["ambiguities worth flagging"],
  "needsClarification": null or ["specific questions if the problem is missing info or ambiguous"]
}

Rules:
- Infer units from the text; never fabricate givens.
- If the problem is unparseable or missing essential information, list exactly what is missing in needsClarification (as specific questions) and fill the other fields best-effort.
${JSON_ONLY}`;
}

export function buildSolutionGeneratorPrompt(confirmed: ConfirmedProblem): string {
  return `You are a STEM tutor for "Smart Step Mapper". Given the confirmed problem details below, produce a complete step-by-step solution.

## Confirmed problem details
Topic: ${confirmed.topicName}
Problem Statement: ${confirmed.problemStatement}
Formula: ${confirmed.formula || "(none)"}
Variables: ${confirmed.variables || "(none)"}
Unknown: ${confirmed.unknown || "(not specified)"}
Answer unit: ${confirmed.unit || "(none)"}

Return JSON only with this exact shape:
{
  "steps": [
    {
      "stepNumber": 1,
      "explanation": "what we do in this step",
      "formulaUsed": "formula applied, or an empty string",
      "variablesUsed": "variable values used in THIS step, e.g. 'd = 120 km, t = 2 h'",
      "substitution": "numbers plugged into the formula (LaTeX)",
      "calculation": "the working/arithmetic (LaTeX)",
      "result": "this step's result (LaTeX)"
    }
  ],
  "finalAnswer": "numeric/expression answer, e.g. '60'",
  "unit": "correct unit, e.g. 'km/h', or an empty string if none",
  "method": "name of this method, e.g. 'Standard'",
  "alternativeMethods": [ { "method": "name", "steps": [ ...same shape... ] } ] or [],
  "warnings": ["assumptions made"],
  "title": "a short suggested map title"
}

Rules:
- Every step must include formula → variables → substitution → calculation → result where applicable.
- The final answer must carry the correct unit (infer from the givens; flag in warnings if uncertain).
- If the problem admits multiple methods, provide alternativeMethods (max 2) with full steps.
- Do not skip required moves; steps must be logically ordered and complete.
- Explanation-only steps (e.g. "Attach units") are allowed but must not hide math.
${JSON_ONLY}`;
}

export function buildPracticeProblemPrompt(
  source: ConfirmedProblem,
  excludeStatements: string[],
): string {
  const exclusions = excludeStatements.length
    ? `\nAvoid problems identical or too similar to these already-seen statements:\n${excludeStatements
        .map((s) => `- ${s}`)
        .join("\n")}`
    : "";

  return `You generate practice variants for "Smart Step Mapper". Given a source problem, create ONE new problem that tests the SAME concept/formula with DIFFERENT numbers.

## Source problem
Topic: ${source.topicName}
Problem Statement: ${source.problemStatement}
Formula: ${source.formula || "(none)"}
Variables: ${source.variables || "(none)"}
Unknown: ${source.unknown || "(not specified)"}
Answer unit: ${source.unit || "(none)"}
${exclusions}

Return JSON only with this exact shape:
{
  "problemStatement": "a complete word problem, different numbers, same concept",
  "expectedSteps": [
    {
      "stepNumber": 1,
      "explanation": "what we do in this step",
      "formulaUsed": "formula applied, or an empty string",
      "variablesUsed": "variable values used in THIS step",
      "substitution": "numbers plugged into the formula (LaTeX)",
      "calculation": "the working/arithmetic (LaTeX)",
      "result": "this step's result (LaTeX)"
    }
  ],
  "hints": [ { "stepNumber": 1, "hint": "a nudge, never the answer" } ],
  "finalAnswer": "numeric/expression answer",
  "unit": "correct unit, or an empty string if none"
}

Rules:
- Use realistic numbers: no negative distances/times, no division by zero, no awkward decimals.
- Vary the numbers meaningfully from the source problem.
- Avoid repeating any statement in the exclusion list.
- One hint per step, escalating in helpfulness but never revealing the final answer.
${JSON_ONLY}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsers
// ─────────────────────────────────────────────────────────────────────────────

export function parseAnalyzeResult(raw: string): AnalyzeResult | null {
  const json = extractJsonObject(raw);
  if (!json) return null;
  try {
    const parsed = analyzeResultSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function parseGenerateResult(raw: string): GenerateResult | null {
  const json = extractJsonObject(raw);
  if (!json) return null;
  try {
    const parsed = generateResultSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function parsePracticeProblem(raw: string): PracticeProblem | null {
  const json = extractJsonObject(raw);
  if (!json) return null;
  try {
    const parsed = practiceProblemSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Topic resolution (spec §10 — decision: also called at analyze time)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Look up a topic by name (case-insensitive); auto-create the row when missing.
 * Race-safe: a unique-constraint conflict falls back to re-selecting.
 * db is imported lazily so this module stays side-effect free at import time
 * (used by unit tests without a DATABASE_URL).
 */
export async function resolveTopicByName(name: string): Promise<string> {
  const { db } = await import("@smart-step-mapper/db");
  const { topics } = await import("@smart-step-mapper/db/schema");

  const trimmed = name.trim();
  if (!trimmed) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Topic name is required" });
  }

  const [existing] = await db
    .select({ id: topics.id })
    .from(topics)
    .where(ilike(topics.name, trimmed))
    .limit(1);
  if (existing) return existing.id;

  const [orderRow] = await db
    .select({ max: sql<number>`COALESCE(MAX(${topics.displayOrder}), 0)` })
    .from(topics);
  const max = orderRow?.max ?? 0;

  const [created] = await db
    .insert(topics)
    .values({
      name: trimmed,
      description: "Auto-detected topic",
      displayOrder: max + 1,
    })
    .onConflictDoNothing()
    .returning({ id: topics.id });
  if (created) return created.id;

  const [again] = await db
    .select({ id: topics.id })
    .from(topics)
    .where(ilike(topics.name, trimmed))
    .limit(1);
  if (again) return again.id;

  throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Could not resolve topic" });
}
