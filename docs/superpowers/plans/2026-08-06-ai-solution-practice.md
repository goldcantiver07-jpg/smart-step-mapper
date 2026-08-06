# AI-Generated Solutions + Practice Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `ai-solution-practice` spec (`docs/superpowers/specs/ai-solution-practice-spec.md`): a user enters any STEM problem on the Create Map page (new "AI Generate" mode), the AI analyzes it into structured fields, generates a complete step-by-step solution (per-step formula → variables → substitution → calculation → result, rendered with KaTeX), shows a highlighted final-answer banner with the correct unit, and offers a one-click ephemeral **Practice Mode** with AI-generated variants of the same problem solved step-by-step with upfront hints.

**Spec reference:** `docs/superpowers/specs/ai-solution-practice-spec.md` (all section numbers below refer to it).

## Resolved Open Questions (final answers)

| Spec OQ | Decision |
|---|---|
| OQ1 — analyze topic creation | **Create at analyze**: `solve.analyze` resolves/auto-creates the topic row and returns `topicId`. |
| OQ3 — saved step status | **Mark all correct** (`isCorrect = "correct"`) for AI-generated steps. |
| OQ4 — practice session cap | **Truly unlimited** — no session cap. |
| OQ5 — alternative methods persistence | **Store, show primary only**: `maps.method` + `maps.alternativeMethods` (JSON); editor renders primary only. |
| OQ9 — answer banner scope | **Solve view + map editor**: render the stored banner on `/maps/[id]` too. |

## Global Constraints

- All new API procedures use oRPC `publicProcedure` from `@smart-step-mapper/api`; auth via `context.user` + `ORPCError("UNAUTHORIZED", …)` (mirror `auth.ts`).
- All DB schema changes in `packages/db/src/schema/*` with Drizzle `pgTable`; columns use snake_case; exports via `packages/db/src/schema/index.ts` (auto).
- All LLM calls reuse `callGroq` from `packages/api/src/utils/chat.ts` (`llama-3.3-70b-versatile`); every prompt ends with "Respond with ONLY a JSON object"; every response parsed with the robust JSON extractor (fence-stripping + first-`{`…`}`).
- All LLM outputs validated with Zod before returning (define output schemas in `packages/api/src/utils/solve.ts`, export inferred types for client reuse).
- Frontend: Svelte 5 runes (`$props`, `$state`, `$derived`, `$effect`, `{@render}`), Tailwind v4 utility classes only, data via `orpc` (`@tanstack/svelte-query`), `MathTex.svelte` for math.
- No `any`, no `@ts-ignore`/`@ts-expect-error`, English-only UI text.
- Test runner: `bun vitest run <path>` (existing convention; no vitest config file needed).
- **Practice Mode writes nothing to the DB** (Q14).

---

### Task 1: DB schema — structured step breakdown + map answer fields

**Files:**
- Modify: `packages/db/src/schema/steps.ts`
- Modify: `packages/db/src/schema/maps.ts`
- Modify: `packages/db/src/__tests__/schema.test.ts`
- Create (generated): `packages/db/src/migrations/0001_*.sql` + `meta/` updates

**Interfaces:**
- Consumes: existing `steps`, `maps` tables
- Produces: new columns `steps.formula_used`, `steps.variables_used`, `steps.substitution`, `steps.calculation`; `maps.unit`, `maps.final_answer`, `maps.method`, `maps.alternative_methods` (JSON string)

- [x] **Step 1: Write the failing test**

Append to `packages/db/src/__tests__/schema.test.ts` (import `getTableColumns` from `drizzle-orm`):

```typescript
it("steps table has structured breakdown columns", () => {
  const cols = getTableColumns(schema.steps);
  expect(cols.formulaUsed).toBeDefined();
  expect(cols.variablesUsed).toBeDefined();
  expect(cols.substitution).toBeDefined();
  expect(cols.calculation).toBeDefined();
});

it("maps table has unit, final answer, and method columns", () => {
  const cols = getTableColumns(schema.maps);
  expect(cols.unit).toBeDefined();
  expect(cols.finalAnswer).toBeDefined();
  expect(cols.method).toBeDefined();
  expect(cols.alternativeMethods).toBeDefined();
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun vitest run packages/db/src/__tests__/schema.test.ts`
Expected: FAIL (columns undefined)

- [x] **Step 3: Extend `packages/db/src/schema/steps.ts`**

Add to the `steps` table (after `result`; keep existing columns untouched):

```typescript
formulaUsed: text("formula_used").notNull().default(""),
variablesUsed: text("variables_used").notNull().default(""),
substitution: text("substitution").notNull().default(""),   // LaTeX
calculation: text("calculation").notNull().default(""),        // LaTeX
```

- [x] **Step 4: Extend `packages/db/src/schema/maps.ts`**

```typescript
unit: text("unit").notNull().default(""),
finalAnswer: text("final_answer").notNull().default(""),
method: text("method").notNull().default(""),
alternativeMethods: text("alternative_methods").notNull().default(""), // JSON.stringify([{method, steps}]) or ""
```

- [x] **Step 5: Run test to verify it passes**

Run: `bun vitest run packages/db/src/__tests__/schema.test.ts`
Expected: PASS (all tests)

- [x] **Step 6: Generate the migration**

Run: `bun run db:generate`
Expected: creates `packages/db/src/migrations/0001_*.sql` adding the 8 columns (all `DEFAULT '' NOT NULL` — safe for existing rows). Review the SQL.

- [x] **Step 7: Validate types**

Run: `bun run check-types`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/db/src/schema/ packages/db/src/__tests__/schema.test.ts packages/db/src/migrations/
git commit -m "feat(db): add structured step breakdown and map answer columns"
```

---

### Task 2: API — solve utilities (prompts, parsers, zod schemas, topic resolver, shared JSON extractor)

**Files:**
- Create: `packages/api/src/utils/json.ts`
- Modify: `packages/api/src/utils/verify-step.ts` (reuse shared extractor; no behavior change)
- Create: `packages/api/src/utils/solve.ts`
- Create: `packages/api/src/__tests__/solve.test.ts`

**Interfaces:**
- Consumes: `callGroq` (`./chat`), `db` + `topics` (`@smart-step-mapper/db`), zod
- Produces: prompt builders, output zod schemas + inferred types, `resolveTopicByName`, `extractJsonObject`

- [x] **Step 1: Extract the shared JSON extractor**

Create `packages/api/src/utils/json.ts`:

```typescript
/** Strip markdown fences, then extract the first {...} region. Returns null on failure. */
export function extractJsonObject(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? (fenced[1] ?? text) : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return candidate.slice(start, end + 1);
}
```

Refactor `parseVerifierVerdict` in `verify-step.ts` to call `extractJsonObject` (behavior must stay identical — existing tests keep passing).

- [x] **Step 2: Create `packages/api/src/utils/solve.ts` — zod output schemas**

```typescript
import { z } from "zod";

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
```

Also export a `ConfirmedProblem` type (problemStatement, topicName, formula, variables, unknown, unit) used by generate/practice/verify inputs.

- [x] **Step 3: Create prompt builders (spec §9.1–9.3)**

Implement `buildAnalyzerPrompt(problemStatement)`, `buildSolutionGeneratorPrompt(confirmed: ConfirmedProblem)`, `buildPracticeProblemPrompt(source: ConfirmedProblem, excludeStatements: string[])` matching the spec's JSON contracts and rules verbatim (units inference, needsClarification, alternativeMethods ≤ 2, excludeStatements, realistic-numbers rules, one hint per step, "Respond with ONLY a JSON object").

- [x] **Step 4: Create parse helpers**

```typescript
export function parseAnalyzeResult(raw: string): AnalyzeResult | null;  // extractJsonObject + schema.safeParse
export function parseGenerateResult(raw: string): GenerateResult | null;
export function parsePracticeProblem(raw: string): PracticeProblem | null;
```

- [x] **Step 5: Create `resolveTopicByName` (spec §10, decision: also called at analyze)**

Place in `packages/api/src/utils/solve.ts` (uses `db` + `topics` + `ilike`/`sql` from `drizzle-orm`):

```typescript
export async function resolveTopicByName(name: string): Promise<string> {
  const trimmed = name.trim();
  const [existing] = await db.select({ id: topics.id }).from(topics)
    .where(ilike(topics.name, trimmed)).limit(1);
  if (existing) return existing.id;
  const [{ max }] = await db.select({ max: sql<number>`COALESCE(MAX(${topics.displayOrder}), 0)` }).from(topics);
  const [created] = await db.insert(topics).values({
    name: trimmed,
    description: "Auto-detected topic",
    displayOrder: max + 1,
  }).onConflictDoNothing().returning({ id: topics.id });
  if (created) return created.id;
  const [again] = await db.select({ id: topics.id }).from(topics)
    .where(ilike(topics.name, trimmed)).limit(1);
  if (again) return again.id;
  throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Could not resolve topic" });
}
```

(When the analyze guess is null, the client shows an empty topic field and the user must type/pick one before generating.)

- [x] **Step 6: Write unit tests — `packages/api/src/__tests__/solve.test.ts`**

Following `verify-step.test.ts` patterns (pure functions only — no DB, no network):
- Prompt builders: analyzer contains the problem statement; generator contains confirmed formula/variables/unit + "Respond with ONLY a JSON object"; practice prompt contains source problem and excludeStatements.
- Parsers: valid JSON, fenced JSON, prose-wrapped JSON, garbage/empty → null.
- `extractJsonObject` edge cases.

- [x] **Step 7: Run tests**

Run: `bun vitest run packages/api/src/__tests__/solve.test.ts packages/api/src/__tests__/verify-step.test.ts`
Expected: PASS (new tests pass; refactored verifier tests still pass).

- [ ] **Step 8: Commit**

```bash
git add packages/api/src/utils/ packages/api/src/__tests__/solve.test.ts
git commit -m "feat(api): add solve prompt builders, parsers, and topic resolver"
```

---

### Task 3: API — `solve` router + stateless practice verifier

**Files:**
- Modify: `packages/api/src/utils/verify-step.ts` (add generalized stateless verifier)
- Create: `packages/api/src/routers/solve.ts`
- Modify: `packages/api/src/routers/index.ts`

**Interfaces:**
- Consumes: Task 2 utils; `callGroq`; `maps`/`steps` tables for save; `verifyStepWithAI` pattern
- Produces: `solve.analyze`, `solve.generate`, `solve.practiceProblem`, `solve.verifyStep`, `solve.saveToMap`

- [x] **Step 1: Add stateless practice verifier to `verify-step.ts`**

Extract the existing verifier core so it works with a problem context instead of a map:

```typescript
export type ProblemVerifyContext = {
  problemStatement: string;
  topicName?: string;
  formula?: string;
  variables?: string;
  unit?: string;
  expectedSteps?: Array<{ stepNumber: number; explanation: string; result: string }>;
};

export async function verifyStepWithContext(
  context: ProblemVerifyContext,
  previouslyEnteredSteps: Array<{ explanation: string; mathExpression: string; result: string }>,
  newStep: { explanation: string; mathExpression: string; result: string },
): Promise<VerifyStepResult>;
```

Reuses `VERIFIER_SYSTEM_PROMPT` (identical rules: correct = sound AND right next step; accept valid alternatives; hint + suggestedStep on incorrect; JSON-only). The prompt includes the problem context, the expected solution steps (as the reference path — accept valid alternatives to it), prior user steps, and the new step. Map-backed `verifyNewStep` continues to call the map-context variant (keep existing exports untouched).

- [x] **Step 2: Create `packages/api/src/routers/solve.ts`**

All procedures `publicProcedure` + auth guard (`ORPCError("UNAUTHORIZED", { message: "Not authenticated" })`). Full input/output contracts in spec §8.

```typescript
export const solveRouter = {
  // §8.1 — decision OQ1: resolves/creates topic at analyze time
  analyze: publicProcedure
    .input(z.object({ problemStatement: z.string().min(1).max(4000) }))
    .handler(async ({ input, context }) => {
      guard(context);
      const raw = await callGroq(
        [{ role: "system", content: ANALYZER_SYSTEM_PROMPT }, { role: "user", content: buildAnalyzerPrompt(input.problemStatement) }],
        { temperature: 0.2, maxTokens: 512, timeoutMs: 15_000 },
      );
      const parsed = parseAnalyzeResult(raw);
      if (!parsed || parsed.needsClarification) {
        return { topicId: null, topicName: parsed?.topicName ?? null, formula: parsed?.formula ?? "", variables: parsed?.variables ?? "",
                 unknown: parsed?.unknown ?? "", unit: parsed?.unit ?? "", assumptions: parsed?.assumptions ?? [],
                 warnings: parsed?.warnings ?? [], needsClarification: parsed?.needsClarification ?? [] };
      }
      const topicId = await resolveTopicByName(parsed.topicName ?? "General Math");
      return { topicId, topicName: parsed.topicName ?? "General Math", formula: parsed.formula, variables: parsed.variables,
               unknown: parsed.unknown, unit: parsed.unit, assumptions: parsed.assumptions,
               warnings: parsed.warnings, needsClarification: null };
    }),

  // §8.2
  generate: publicProcedure
    .input(z.object({
      problemStatement: z.string().min(1),
      topicName: z.string().min(1),
      formula: z.string().default(""),
      variables: z.string().default(""),
      unknown: z.string().default(""),
      unit: z.string().default(""),
    }))
    .handler(async ({ input, context }) => {
      guard(context);
      const topicId = await resolveTopicByName(input.topicName);   // idempotent
      const raw = await callGroq([...], { temperature: 0.3, maxTokens: 2048, timeoutMs: 30_000 });
      const parsed = parseGenerateResult(raw);
      if (!parsed) throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Could not generate a solution. Please try again." });
      return { topicId, topicName: input.topicName, ...parsed };
    }),

  // §8.3 — one variant per call, no DB writes
  practiceProblem: publicProcedure
    .input(z.object({
      source: z.object({ problemStatement: z.string(), topicName: z.string(), formula: z.string(), variables: z.string(), unknown: z.string(), unit: z.string() }),
      excludeStatements: z.array(z.string()).default([]),
    }))
    .handler(async ({ input, context }) => {
      guard(context);
      const raw = await callGroq([...], { temperature: 0.7, maxTokens: 1536, timeoutMs: 20_000 });
      const parsed = parsePracticeProblem(raw);
      if (!parsed) throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Could not create a practice problem. Please try again." });
      return parsed;
    }),

  // §8.5 — stateless step verification
  verifyStep: publicProcedure
    .input(z.object({
      problemStatement: z.string(), topicName: z.string().optional(), formula: z.string().optional(),
      variables: z.string().optional(), unit: z.string().optional(),
      expectedSteps: z.array(z.object({ stepNumber: z.number().int(), explanation: z.string(), result: z.string() })).default([]),
      previouslyEnteredSteps: z.array(z.object({ explanation: z.string(), mathExpression: z.string(), result: z.string() })),
      newStep: z.object({ explanation: z.string(), mathExpression: z.string(), result: z.string() }),
    }))
    .handler(async ({ input, context }) => {
      guard(context);
      return verifyStepWithContext(input, input.previouslyEnteredSteps, input.newStep);
    }),

  // §8.4 — transactional save; steps marked correct (OQ3)
  saveToMap: publicProcedure
    .input(z.object({
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
    }))
    .handler(async ({ input, context }) => {
      guard(context);
      const mapId = await db.transaction(async (tx) => {
        const topicId = await resolveTopicByName(input.topicName);
        const [map] = await tx.insert(maps).values({
          userId: context.user.id,
          topicId,
          title: input.title,
          problemStatement: input.problemStatement,
          formula: input.formula,
          variables: input.variables,
          unit: input.unit,
          finalAnswer: input.finalAnswer,
          method: input.method,
          alternativeMethods: input.alternativeMethods.length ? JSON.stringify(input.alternativeMethods) : "",
        }).returning({ id: maps.id });
        await tx.insert(steps).values(
          input.steps.map((s) => ({
            mapId: map.id,
            stepNumber: s.stepNumber,
            explanation: s.explanation,
            mathExpression: s.substitution,   // main display line for MapVisualization compat
            result: s.result,
            formulaUsed: s.formulaUsed,
            variablesUsed: s.variablesUsed,
            substitution: s.substitution,
            calculation: s.calculation,
            isCorrect: "correct",              // OQ3
          })),
        );
        return map.id;
      });
      return { mapId };
    }),
};
```

Notes:
- If `db.transaction` is unavailable on the neon-http driver at runtime, fallback: insert map, then `insert(steps).values([...])`; on failure delete the map. Verify during implementation.
- `generate` also returns `topicId` so the client can persist nothing extra.

- [x] **Step 3: Register the router**

Modify `packages/api/src/routers/index.ts`:

```typescript
import { solveRouter } from "./solve";
export const appRouter = { healthCheck: ..., auth: authRouter, topics: topicsRouter, maps: mapsRouter, progress: progressRouter, chat: chatRouter, solve: solveRouter };
```

- [x] **Step 4: Add a light unit test for `verifyStepWithContext` prompt building**

Extend `solve.test.ts` (assert prompt includes problem + expected steps + prior step + new step; no network call).

- [x] **Step 5: Validate**

Run: `bun vitest run packages/api/src/__tests__/` and `bun run check-types`
Expected: PASS / no type errors.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/utils/verify-step.ts packages/api/src/routers/solve.ts packages/api/src/routers/index.ts packages/api/src/__tests__/solve.test.ts
git commit -m "feat(api): add solve router for analyze, generate, practice, verify, save"
```

---

### Task 4: Web — KaTeX dependency + `MathTex.svelte`

**Files:**
- Modify: `apps/web/package.json` (+ `bun.lock`)
- Modify: `apps/web/src/app.css`
- Create: `apps/web/src/lib/components/MathTex.svelte`

**Interfaces:**
- Consumes: `katex` npm package
- Produces: SSR-safe math display component with plain-text fallback (spec FR-10)

- [x] **Step 1: Install KaTeX**

Run: `bun add katex --cwd apps/web` (or `bun add katex` at root workspace if the lockfile strategy requires — verify `bun.lock` updates with `katex` + `@types/katex` if needed for TS).

- [x] **Step 2: Import KaTeX CSS**

At the top of `apps/web/src/app.css` (Tailwind v4 `@import` chain):

```css
@import "katex/dist/katex.min.css";
@import "tailwindcss";
```

- [x] **Step 3: Create `MathTex.svelte`**

```svelte
<script lang="ts">
  import katex from "katex";

  let { tex, block = false }: { tex: string; block?: boolean } = $props();

  const rendered = $derived((() => {
    if (!tex) return null;
    try {
      const html = katex.renderToString(tex, {
        throwOnError: false,
        displayMode: block,
        output: "html",
        strict: false,
      });
      // If KaTeX emitted the input unchanged (parse failure), fall back to plain text.
      return html && html !== tex ? html : null;
    } catch {
      return null;
    }
  })());
</script>

{#if rendered}
  {@html rendered}
{:else}
  <code class="inline-block rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[0.95em] text-surface-200">{tex}</code>
{/if}
```

Notes: `renderToString` is pure/synchronous → SSR-safe. `throwOnError: false` + strict false degrades malformed LaTeX gracefully.

- [x] **Step 4: Validate**

Run: `bun run check-types` (web) — no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json bun.lock apps/web/src/app.css apps/web/src/lib/components/MathTex.svelte
git commit -m "feat(web): add KaTeX math rendering component"
```

---

### Task 5: Web — create page AI mode (analyze → confirm → generate → save)

**Files:**
- Create: `apps/web/src/lib/components/solve/SolutionTypes.ts` (re-exports types from `@smart-step-mapper/api/solve`)
- Create: `apps/web/src/lib/components/solve/ProblemAnalyzer.svelte`
- Create: `apps/web/src/lib/components/solve/SolutionStepCard.svelte`
- Create: `apps/web/src/lib/components/solve/SolutionView.svelte`
- Modify: `apps/web/src/routes/create/+page.svelte`

**Interfaces:**
- Consumes: `orpc.solve.*`, `orpc.topics.list`, `MathTex.svelte`
- Produces: mode toggle (AI Generate | Manual), analyzer + confirmation strip, solution view (answer banner + method tabs + collapsible steps), Save as Map → `/maps/[id]`

- [x] **Step 1: `SolutionTypes.ts`**

```typescript
export type { AnalyzeResult, GenerateResult, GeneratedStep, AlternativeMethod, ConfirmedProblem } from "@smart-step-mapper/api/solve";
```

(The api package maps `./*` → `./src/*.ts`, so `@smart-step-mapper/api/solve` resolves to `utils/solve.ts`.)

- [x] **Step 2: `ProblemAnalyzer.svelte` (spec §7.2, FR-2)**

Props/events: `{ problemStatement, onSubmit(confirmed) }`. Internal state: `analysis` (result), `topicName`, `formula`, `variables`, `unknown`, `unit`, `clarifyingQuestions`, `busy`, `error`.
- Large textarea → **Analyze** button → `orpc.solve.analyze` mutation.
- If `needsClarification` non-empty → render questions + re-run Analyze.
- Else render the editable confirmation strip: topic (text input + `<datalist>` populated from `orpc.topics.list` + the AI guess), formula, variables, unknown, unit inputs; warnings/assumptions as amber read-only chips.
- **Generate Solution** button → builds `ConfirmedProblem` and calls `onSubmit`.
- Error state with Retry (FR-7). Input preserved on failure.

- [x] **Step 3: `SolutionStepCard.svelte` (spec §7.3, FR-3)**

Props: `{ step: GeneratedStep }`. Collapsible disclosure (default open): header = number + explanation + chevron; body = labeled rows **Formula used**, **Variables**, **Substitution**, **Calculation**, **Result** using `MathTex` for math rows (empty rows hidden). Keyboard-accessible toggle (`<button aria-expanded>`).

- [x] **Step 4: `SolutionView.svelte` (spec §7.3, FR-3/FR-5/FR-9)**

Props: `{ solution: GenerateResult & { topicName, problemStatement } }`; events: `onsave`, `onpractice`.
- Answer banner (gradient emerald card): `✓ Final Answer: {finalAnswer} {unit}` (unit omitted when empty) — renders `finalAnswer` via MathTex.
- Method tabs: primary `solution.method` + each `alternativeMethods[i].method`; switching swaps the step list (`#each` re-render); shared banner.
- Warnings list (amber) under the banner.
- Step list via `SolutionStepCard` (all visible + collapsible).
- Footer: **💾 Save as Map** (calls `orpc.solve.saveToMap`, disabled while pending, error toast) and **🏋️ Practice similar problems** (emits `onpractice`).

- [x] **Step 5: Rework `apps/web/src/routes/create/+page.svelte` (spec §7.1, FR-1)**

- Add `let mode = $state<"ai" | "manual">("ai")` toggle (segmented control, brand styling). Switching modes resets that mode's local state (drafts not preserved, FR-1).
- `{#if mode === "ai"}` → `ProblemAnalyzer` + (when submitted) `SolutionView` + (when open) `PracticePanel` (Task 6).
- `{:else}` → existing manual form unchanged (keep `StepEditor`/`MapVisualization` imports intact).
- Save success → `goto(`/maps/${mapId}`)`.
- Keep the existing `?topic=<name>` preselect effect for manual mode.

- [x] **Step 6: Validate**

Run: `bun run check-types` (web) — no errors.

- [ ] **Step 7: Manual QA (happy path)**

With a running dev server + `GROQ_API_KEY`: enter "A car travels 120 km in 2 hours. What is its average speed?" → Analyze → confirm fields (topic auto-created "Physics") → Generate → verify banner "60 km/h", method tabs, KaTeX rendering; Save as Map → lands in `/maps/[id]` with all steps `correct` and banner visible.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/routes/create/+page.svelte apps/web/src/lib/components/solve/
git commit -m "feat(web): add AI generate mode to create page with solution view"
```

---

### Task 6: Web — Practice Mode panel

**Files:**
- Create: `apps/web/src/lib/components/solve/PracticePanel.svelte`

**Interfaces:**
- Consumes: `orpc.solve.practiceProblem`, `orpc.solve.verifyStep`, `MathTex.svelte`
- Produces: ephemeral practice drawer with step entry, upfront hints, verification, reveal, endless next-problem loop, exit summary

- [x] **Step 1: Implement `PracticePanel.svelte` (spec §7.4, FR-5/FR-6/FR-11/FR-12)**

Props: `{ open, source: ConfirmedProblem, onClose }`. State machine:

```
idle → loading-problem → entering-step → verifying → (step-correct → entering-step | final → solved) → revealed → [next-problem | retry]
```

- Session tally (client-only): `problemsDone`, `problemsCorrect`, `hintsUsed`, `problemIndex`; header shows "N done · M correct · K hints".
- **Problem fetch**: on open / Next Problem → `orpc.solve.practiceProblem` with `excludeStatements` (accumulate problem statements). While loading: skeleton card.
- **Step entry**: inline form (explanation, math expression, result) styled like `StepEditor`, plus a **"This is my final step"** checkbox and a **Hint** button (reveals `hints[stepNumber]` — no API call; disabled after reveal; FR/hints persist for the session).
- **Check Step** → `orpc.solve.verifyStep` with `previouslyEnteredSteps` + `newStep` (+ expectedSteps reference). Correct → append step, clear form, advance counter; final-step-correct → `solved` state. Incorrect → amber inline feedback + suggestedStep shown; user edits and re-checks.
- **Reveal** (on solved OR "Show solution" abandon): render full worked solution (expectedSteps via `SolutionStepCard`, answer banner with `finalAnswer` + `unit`), then **Next Problem** or **Retry same problem**.
- **Exit** → summary overlay (attempted / correct / hints) → `onClose()`. Everything client-side; **no DB writes** (Q14).
- A11y: `role="dialog"`, `aria-modal`, Escape to exit, focus management; `prefers-reduced-motion` respected.

- [x] **Step 2: Wire into `SolutionView`/create page**

"Practice similar problems" → open panel with the confirmed source problem (not the generated solution — practice variants derive from the confirmed fields).

- [x] **Step 3: Validate**

Run: `bun run check-types` (web) — no errors.

- [ ] **Step 4: Manual QA**

Correct path: solve a practice problem step-by-step → "Solved!" → full solution revealed → Next Problem; hint reveals without API call (verify via network tab — no extra request); incorrect step → feedback; exit → summary; refresh page → nothing persisted.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/components/solve/PracticePanel.svelte apps/web/src/routes/create/+page.svelte
git commit -m "feat(web): add practice mode panel with hints and solution reveal"
```

---

### Task 7: Map editor — answer banner (OQ9)

**Files:**
- Modify: `apps/web/src/routes/maps/[id]/+page.svelte`

**Interfaces:**
- Consumes: `map.unit`, `map.finalAnswer`, `MathTex.svelte`
- Produces: read-only answer banner on saved AI-generated maps

- [x] **Step 1: Render the banner**

When `map.finalAnswer` is non-empty, render the same emerald answer banner (finalAnswer + unit) at the top of the center steps column (above the timeline). Read-only; editing unit/finalAnswer in the map form is **out of scope**.

- [x] **Step 2: Validate**

Run: `bun run check-types` (web).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/maps/[id]/+page.svelte
git commit -m "feat(web): show answer banner on saved generated maps"
```

---

### Task 8: Full validation + QA pass

- [x] **Step 1: API tests**

Run: `bun vitest run packages/api/src/__tests__/`
Expected: all PASS (existing + new).

- [x] **Step 2: DB tests + migration**

Run: `bun vitest run packages/db/src/__tests__/` and confirm `bun run db:generate` output reviewed.
If a database is reachable, apply: `bun run db:migrate` (or `db:push` in dev).

- [x] **Step 3: Types + lint**

Run: `bun run check-types` and `bun run lint`
Expected: no errors.

- [ ] **Step 4: End-to-end manual QA checklist**

- [ ] Mode toggle: AI Generate ↔ Manual (state resets per mode).
- [ ] Analyze → parsed fields → edit fields → Generate.
- [ ] Answer banner shows correct unit (km/h case); unitless case shows no unit.
- [ ] Method tabs switch step lists.
- [ ] KaTeX renders fractions/roots; malformed LaTeX falls back to plain text.
- [ ] `needsClarification` flow (e.g., "A car travels some distance…").
- [ ] LLM failure / bad key → error + retry, input preserved.
- [ ] Save as Map → `/maps/[id]` with steps marked correct + banner.
- [ ] Practice: hint reveal (no network), correct/incorrect step feedback, final-step completion, full solution reveal, Next Problem (no duplicates via excludeStatements), exit summary, no DB writes (devtools network check).
- [ ] Auth: logged-out user redirected (AuthGuard) + procedures return UNAUTHORIZED.

- [x] **Step 5: Code review**

Run a review pass over the diff (spawn code-reviewer-deepseek-flash) focusing on: prompt-injection surface in LLM outputs, `saveToMap` transaction integrity, topic race handling, stateless practice verifier reuse, and Svelte 5 runes correctness.

---

## Reference Files

- `docs/superpowers/specs/ai-solution-practice-spec.md` (authoritative spec)
- `packages/api/src/utils/chat.ts` — `callGroq`, `MapContext`, env access
- `packages/api/src/utils/verify-step.ts` — JSON prompt/parse pattern; source of the stateless verifier refactor
- `packages/api/src/routers/maps.ts`, `auth.ts`, `index.ts` — procedure patterns, auth guards, router registration
- `packages/db/src/schema/maps.ts`, `steps.ts`, `topics.ts`, `drizzle.config.ts`
- `apps/web/src/routes/create/+page.svelte` — integration surface
- `apps/web/src/lib/components/StepEditor.svelte` — step-form styling reference for practice entry
- `apps/web/src/routes/maps/[id]/+page.svelte` — banner placement
- `apps/web/src/app.css` — theme tokens, animation utilities
- `packages/api/src/__tests__/verify-step.test.ts`, `chat.test.ts` — test patterns
- `docs/superpowers/specs/step-verification-spec.md` — sister spec (shared conventions)
