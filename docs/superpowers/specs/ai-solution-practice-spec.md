# AI-Generated Solutions + Practice Mode — Spec

- **Status:** Draft (interview complete; no code changes yet)
- **Date:** 2026-08-06
- **Author:** Buffy (interviewed with product owner)
- **Feature short name:** `ai-solution-practice`

---

## 1. Overview

**Original request (verbatim):**

> STEP-BY-STEP EXPLANATION
> 1. Users can enter a problem.
> 2. Show a complete step-by-step solution.
> 3. Explain each step, including the formula, variables, substitution, calculations, and the final answer.
> 4. Display the correct unit in the final answer.
>
> PRACTICE MODE
> Once the user understands the topic or problem, they can proceed to Practice Mode, where they can solve similar problems on their own.

**Refined problem statement:**
Today, *Smart Step Mapper* requires the user to manually build a solution into a "map" (one step at a time, with AI verification per step). This feature inverts that: the **user enters a problem and the AI generates the complete, structured step-by-step solution** — with per-step formula, variables, substitution, calculations, and result, plus a highlighted final answer that includes the correct unit (when the problem has one). The user can then enter **Practice Mode** from the solution view to solve AI-generated variants of the same problem on their own, step by step, with on-demand hints.

The feature lives **inside the existing Create Map flow** as an "AI Generate" mode (a mode toggle alongside the existing manual form). Generated solutions are read-only while viewing but can be **saved as an editable map** (which requires extending the map/step data model). Practice Mode is **ephemeral** (no persistence, no progress tracking).

Powered by the existing **Groq LLM** (`llama-3.3-70b-versatile`) infrastructure (`packages/api/src/utils/chat.ts`), following the established patterns in `verify-step.ts` (structured JSON output, robust parsing, timeouts).

---

## 2. Goals

- Let a user type any STEM problem in plain text and receive a complete, structured, step-by-step solution.
- Each step must explicitly show: **formula used → variables (with values) → substitution → calculation → result**.
- Show the **correct unit** in a highlighted **final answer banner** (AI-inferred; no unit input needed).
- Render math with **real math notation** (KaTeX) rather than plain text.
- Show **alternative solution methods** via tabs when they exist.
- Support **any STEM subject** (math, physics, chemistry, …), auto-creating a topic row when the detected topic isn't in the seeded list.
- One-click **Practice Mode**: endless loop of AI-generated variants of the entered problem, solved step-by-step with per-step hints generated upfront, full solution revealed after each attempt, exit anytime with a client-side session summary.
- Keep everything **auth-gated** (consistent with the rest of the app).
- Reuse existing infra: Groq utilities, JSON-output patterns, map/step UI language.

## 3. Non-Goals (explicitly out of scope)

- Changing the existing manual map-creation flow or the step-verification feature (they coexist via a mode toggle).
- Persisting practice-mode attempts or mixing them into progress/accuracy stats (ephemeral by decision).
- Requiring a mastery threshold to exit practice (user decides when to stop).
- Auto-verifying every AI-generated step in the solve view (they are correct by construction; the existing verify flow applies only to user-entered steps — see §12 and Open Questions).
- Non-English content (English only).
- Editing generated steps inline before saving (read-only view; edits happen after "Save as map" in the existing editor).
- Image/photo input of problems (text only for v1).
- Changing the AI chat panel behavior.

---

## 4. Current System Context

### Flow today
1. User creates a map: topic (from a fixed seeded list), problem statement, formula, variables, title → `maps.create`.
2. User manually adds steps one at a time (explanation, math expression, result) → `maps.addStep`.
3. Each added step is AI-verified (`maps.verifyNewStep`): correct/incorrect verdict, hint, suggested step — saved to `steps.isCorrect`/`feedback`/`suggestedStep`.
4. The AI tutor chat (`chat.sendMessage`) sees full map context and answers questions.
5. Progress stats count `isCorrect` values (dashboard, progress page).

### Relevant files
| File | Role |
|---|---|
| `apps/web/src/routes/create/+page.svelte` | **Primary integration surface.** Current manual create form; `StepEditor` imported but unwired; redirects to `/maps/[id]` after creation. Gains the AI/Manual mode toggle. |
| `apps/web/src/routes/maps/[id]/+page.svelte` | Map editor the generated solution is saved into. |
| `apps/web/src/lib/components/StepEditor.svelte` | Vestigial add-step form component (explanation/math/result). Reusable for practice-mode step entry. |
| `apps/web/src/lib/components/AIChatPanel.svelte` | Existing chat panel (untouched by this feature). |
| `apps/web/src/lib/components/MapVisualization.svelte` | Colors step nodes by `isCorrect` — reflects saved generated steps. |
| `packages/api/src/routers/maps.ts` | `create`, `list`, `getById`, `addStep`, `updateStep`, `verifyStep`, `verifyNewStep`, `update`, `delete`. |
| `packages/api/src/routers/topics.ts` | `list` — reads seeded topics. Topic auto-creation hooks in here or in the new solver. |
| `packages/api/src/utils/chat.ts` | `callGroq`, `sendChatMessage`, `buildSystemPrompt`, `MapContext`. Shared Groq call pattern. |
| `packages/api/src/utils/verify-step.ts` | `verifyStepWithAI` — structured JSON prompt + parse pattern to reuse for practice verification. |
| `packages/db/src/schema/steps.ts` | Steps table — **needs new structured-breakdown columns.** |
| `packages/db/src/schema/maps.ts` | Maps table — **needs unit + final-answer columns.** |
| `packages/db/src/schema/topics.ts` | Topics table — `name` unique; rows are auto-created when the AI detects a new STEM topic. |
| `packages/db/src/seed.ts` | 10 seeded math topics (Linear Equations → Statistics & Probability). |
| `packages/api/src/__tests__/` | `verify-step.test.ts`, `chat.test.ts`, `adaptive-engine.test.ts` — patterns for new unit tests. |

---

## 5. Interview Decisions (final answers)

| # | Question | Answer | Implication |
|---|---|---|---|
| Q1 | Relation to existing map flow | **(c) Both, user's choice** — a fast Solve view for learning, plus an option to save the generated solution as a map to edit later. | New "AI Generate" mode in create page; "Save as map" button. |
| Q2 | Solution presentation | **(c) All steps visible + collapsible** — full solution shown immediately, each step expandable/collapsible. | No progressive reveal; disclosure toggles per step. |
| Q3 | Feature placement | **(c) Inside create-map page** — an AI-assisted "Generate solution" option within the existing Create Map flow. | Create page gains a mode toggle (§7.1); no new top-level route. |
| Q4 | Topic determination | **(c) Both** — auto-detect the topic, show it pre-filled in a dropdown the user can change. | Analyzer returns a topic guess; UI renders an editable topic select. |
| Q5 | Problem input format | **(c) Free-text + AI parsing** — AI extracts structured fields shown back for confirmation. | Analyze → confirm → generate, two-step interaction (§7.2). |
| Q6 | Step anatomy | **(a) Full structured breakdown** — each step explicitly shows formula used → variables with values → substitution → calculation → result. | New per-step structured fields (§11). |
| Q7 | Units | **(a) AI infers, no input** — unit derived from problem text (e.g., "120 km" → km/h). | Unit lives in generated data + maps table; no unit input field. |
| Q8 | Final answer | **(a) Banner + last step** — a dedicated highlighted answer banner (e.g., "Answer: 60 km/h") in addition to the last step's result. | New map-level `finalAnswer` + `unit` fields (§11). |
| Q9 | Subjects | **(c) Any STEM** — math, physics, chemistry, etc. | Topic auto-creation when the topic is new (§10). |
| Q10 | Editability | **(a) Read-only, save to map** — generated solution is read-only while viewing; "Save as map" copies it into the editable editor. | No inline editing in solve view. |
| Q11 | Practice source | **(a) AI from this problem** — variants of the exact entered problem (same formula/concept, different numbers). | Practice generator receives the source problem + solution as context. |
| Q12 | Practice solve method | **(c) Step-by-step, hints available** — user enters each step (explanation/math/result) with optional per-step hint buttons. | Reuse step-entry UI; stateless AI verification per step. |
| Q13 | Mastery | **(c) User decides** — practice as long as they want; nothing blocks exit. | No correctness quota. |
| Q14 | Progress stats | **(c) No tracking** — practice is ephemeral; nothing recorded. | No DB writes in practice; session summary is client-side only. |
| Q15 | Practice reveal | **(a) Yes, always reveal** — full worked solution shown after submission (correct or not). | Practice problem payload includes a hidden full solution. |
| Q16 | Entering practice | **(a) One-click button** — prominent "Practice similar problems" button under the solution. | No comprehension gate. |
| Q17 | Alternative methods | **(b) Method tabs** — show the primary method, with tabs to view alternatives. | Generator returns `method` + `alternativeMethods[]`. |
| Q18 | Hint sourcing | **(a) Generated upfront** — hints for every step are generated when the practice problem is created; instant, no extra call per hint. | Practice problem payload includes per-step hints. |
| Q19 | Topic table for non-math | **(c) Auto-create topics** — AI-detected topic creates a new row on the fly when none matches. | Insert-else-find logic with unique `name`. |
| Q20 | Generation failure | **(c) Both** — attempt best-effort with assumptions flagged inline; if truly stuck, prompt for more info. | `warnings`/`assumptions` in responses; clarify state in the UI. |
| Q21 | Auth | **(a) Keep auth-gated** — same as the rest of the app. | All new procedures require `context.user`. |
| Q22 | Math rendering | **(b) Add a math renderer** — KaTeX (or similar) for real math notation in steps and answers. | New dependency + render component; LaTeX-ish storage. |
| Q23 | Create page structure | **(a) Mode toggle** — "AI Generate" vs "Manual" modes on the create page. | Existing manual form untouched behind its tab. |
| Q24 | Practice session length | **(a) Endless + exit anytime** — "next problem" loop; exit whenever; small session summary (done, correct) on exit. | Client-side session counter only. |
| Q25 | Save fidelity | **(a) Extend the model** — schema gains unit, final answer banner, and per-step structured breakdown columns so nothing is lost on save. | Drizzle migration (§11). |

---

## 6. Functional Requirements

### FR-1 — Create-page mode toggle
- The Create Map page gains a toggle: **AI Generate** | **Manual** (default: AI Generate — the new primary path; Manual stays fully available, unchanged).
- The two modes share the page route; state is reset when switching modes (drafts are not preserved across modes).

### FR-2 — Problem entry & analysis (AI mode)
- A large free-text area: "Describe the problem, e.g. *A car travels 120 km in 2 hours. What is its average speed?*"
- Clicking **Analyze** calls the analyzer (§9.1) and returns structured fields shown in a confirmation strip:
  - **Topic** (editable dropdown — pre-filled with the AI guess; includes any auto-created topics)
  - **Formula** (editable, e.g., `v = d / t`)
  - **Variables / givens** (editable, e.g., `d = 120 km, t = 2 h`)
  - **Unknown** (what's being asked, editable)
  - **Answer unit** (editable, pre-filled from the AI guess; may be empty for unitless math)
  - **Assumptions/warnings** (read-only notes, e.g., "assuming constant speed")
- If the analyzer reports it cannot parse the problem (ambiguous/missing info), the strip instead shows clarifying questions; the user answers and re-runs Analyze (FR-7).

### FR-3 — Solution generation
- Clicking **Generate Solution** (enabled once a topic is set and the problem is non-empty) calls the generator (§9.2) with the **confirmed** fields.
- Renders the full solution: a problem header, a **final-answer banner** at the top or bottom (§7.3), and the **ordered list of steps**, all visible with collapsible disclosure per step.
- Each step card shows, when expanded: **Explanation**, **Formula used**, **Variables (with values)**, **Substitution**, **Calculation**, **Result** — rendered with KaTeX (§FR-10).
- If the generator returns alternative methods, a **method tab bar** switches the step list (§FR-9).
- While generating: skeleton/loading state; on failure, a retry control (FR-7).

### FR-4 — Save as map
- A **Save as Map** button persists the solution: creates a map (title = problem statement truncated to 80 chars) with topic, problem statement, formula, variables, unit, final answer, and all steps (including structured breakdown columns) via a transactional procedure (§8.4).
- Saved steps are marked `isCorrect = 'correct'` (AI-authored) — Open Question 3.
- On success, navigate to the new map's editor `/maps/[id]` where everything is editable as usual.
- Save is disabled while a save is in flight and shows a success/error state.

### FR-5 — Practice Mode entry
- A prominent **Practice similar problems** button under the generated solution (one click, no readiness gate).
- Opens the practice panel (§7.4). The original solution stays visible/accessible behind the panel.

### FR-6 — Practice Mode session
- **Ephemeral**: no DB writes, no progress/accuracy impact. Client-side state only.
- **Problem loop**: the panel requests one practice problem at a time (FR-11); after finishing each problem, **Next Problem** fetches the next variant; loop is endless until the user exits.
- **Solving**: the user enters steps one at a time (explanation, math expression, result — reusing the step-form UI). Each submitted step is verified by a **stateless** AI verifier (§9.4) — correct → proceed; incorrect → inline feedback + the pre-generated hint is offered.
- **Hints**: each step has a **Hint** button that reveals the pre-generated hint for that step (no extra API call). A hint is a nudge, never the full solution.
- **Completion**: when the user's final step is verified correct, show a success state, then **always reveal the full worked solution** of the practice problem (FR-12), regardless of success or failure.
- **Exit & summary**: an exit button ends the session and shows a client-side summary (problems attempted, problems solved correctly, hints used); closing the summary leaves practice mode. Nothing is persisted.

### FR-7 — Failure handling (analyze / generate / practice)
- **Best-effort + assumptions**: the generator always tries to produce a solution; any assumptions it had to make are returned as `warnings` and rendered inline (e.g., "assuming x is an integer").
- **Genuinely stuck**: the analyzer returns a `needsClarification` payload with specific questions; the UI prompts the user and re-runs Analyze.
- **LLM/network errors**: friendly error + retry button; state preserved; never a blank screen or lost input.
- **Unparseable JSON** from the model: treated as failure with retry (same pattern as `verify-step.ts`).

### FR-8 — Topic auto-creation
- When the confirmed/analyzed topic name has no matching `topics.name`, a new topic row is created (unique-name check then insert; `displayOrder` = max+1). Auto-created topics appear in the create-page topic dropdown and everywhere topics are listed.
- Topic auto-creation happens server-side at analyze or save time (see §10).

### FR-9 — Alternative solution methods
- The generator returns a primary method (default tab) plus `alternativeMethods[]` when the problem admits them (e.g., factoring vs. quadratic formula).
- A tab bar lets the user switch; the answer banner and problem header are shared across methods.
- Alternative methods are also stored on the map when saved (Open Question 5).

### FR-10 — Math rendering
- Add **KaTeX** for displaying math content (`mathExpression`, `substitution`, `calculation`, formulas, answer). Model output for math fields is **LaTeX**; the renderer falls back to plain text when KaTeX parsing fails.
- Introduce a small `MathTex.svelte` display component (SSR-safe) used across the solve view, map editor, and practice panel.

### FR-11 — Practice problem generation
- Each "Next Problem" requests **one** new problem variant from the AI: same formula/concept, different numbers (e.g., different distance/time for the speed problem).
- The payload includes: problem statement, expected step-by-step solution (hidden until completion), and **per-step hints** (generated upfront).
- The generator is instructed to vary numbers and avoid repeating an identical problem within a session; extreme/awkward numbers (negative time, etc.) are prohibited by prompt rules.

### FR-12 — Practice reveal
- After a practice problem is completed (correct final step) or abandoned (user clicks "Show solution" / fails), the full worked solution (steps + final answer with unit) is displayed.
- Always revealed, per Q15.

---

## 7. UI Design

> Sketches of the new surfaces. Visual language reuses the existing dark `surface-*` theme, brand-blue accents, gradient primary buttons, and emerald/amber/red status colors. New math content renders via KaTeX.

### 7.1 Create page — mode toggle

```
┌───────────────────────────────────────────────────────────────┐
│  Create New Map                                    ┌─────────┐ │
│  [ AI Generate ]  [ Manual ]                       │ (toggle)│ │
│  ─────────────────────────────────────────────────────────    │
│  (AI mode)  (Manual mode = current form, unchanged)           │
└───────────────────────────────────────────────────────────────┘
```

### 7.2 AI mode — problem entry + analyze/confirm

```
┌───────────────────────────────────────────────────────────────┐
│  ➤ Describe the problem                                        │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ A car travels 120 km in 2 hours. What is its average    │  │
│  │ speed?                                                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                       [ 🔍 Analyze ]                          │
│                                                               │
│  ┌── Parsed details (editable) ────────────────────────────┐  │
│  │ Topic     [ Physics ▾ (auto-detected) ]                 │  │
│  │ Formula   [ v = d / t                         ]         │  │
│  │ Variables [ d = 120 km, t = 2 h               ]         │  │
│  │ Unknown   [ average speed v                   ]         │  │
│  │ Unit      [ km/h                              ]         │  │
│  │ ⚠ Assumption: constant speed assumed                    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                       [ ✨ Generate Solution ]                │
└───────────────────────────────────────────────────────────────┘
```

### 7.3 Generated solution view

```
┌───────────────────────────────────────────────────────────────┐
│  🔬 Physics — A car travels 120 km in 2 hours…          [🎯    │
│                                                            ]  │
│  ╔═══════════════════════════════════════════════════════╗    │
│  ║  ✓ Final Answer:  60 km/h                             ║    │  ← answer banner
│  ╚═══════════════════════════════════════════════════════╝    │
│                                                               │
│  Method: [ Standard ] [ via unit analysis ]   ← method tabs   │
│                                                               │
│  (1)  ▾ Identify the knowns                     [Formula]     │
│       Formula used:  v = d / t                               │
│       Variables:     d = 120 km, t = 2 h                     │
│       Substitution:  v = 120 / 2                             │
│       Calculation:   120 ÷ 2 = 60                            │
│       Result:        v = 60                                  │
│  (2)  ▸ Attach units to the result                            │
│  (3)  ▸ State the answer                                      │
│                                                               │
│              [ 💾 Save as Map ]  [ 🏋️ Practice similar        │
│                                   problems ]                  │
└───────────────────────────────────────────────────────────────┘
```

- Steps are all visible; each step header toggles its body (collapsed = just number + explanation title).
- Math content (`Substitution`, `Calculation`, `Result`) renders with KaTeX.

### 7.4 Practice Mode panel (overlay/drawer over the solution view)

```
┌───────────────────────────────────────────────────────────────┐
│  🏋️ Practice Mode                            [✕ Exit] 3 done · │
│                                               2 correct · 1 hint│
│  ─────────────────────────────────────────────────────────    │
│  Problem 4/∞                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ A train travels 240 km in 3 hours. What is its average  │  │
│  │ speed?                                                  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  Step 2 of ~3                                                │
│  ┌ Explanation: ___________________________________________┐  │
│  │ Math:        [ v = 240 / 3        ]  Result: [ v = 80 ]  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                    [ Check Step ]  [💡 Hint]                  │
│  ┌ hint reveal ────────────────────────────────────────────┐  │
│  │ 💡 Substitute the distance and time into v = d / t.     │  │
│  └─────────────────────────────────────────────────────────┘  │
│  · After final step correct → "🎉 Solved!" + full solution    │
│    revealed (FR-12) → [ Next Problem ]                        │
│  · After failure/abandon → full solution revealed → [ Retry ] │
└───────────────────────────────────────────────────────────────┘
```

- Session header shows a live client-side tally: problems done · correct · hints used.
- Practice entry inputs reuse the step-form component (§StepEditor) with verification feedback inline.

### 7.5 Notes & micro-interactions

- Mode toggle, collapsible steps, method tabs, and the practice drawer all animate with the app's existing transitions and respect `prefers-reduced-motion`.
- KaTeX blocks get loading/fallback treatment (plain text) so nothing ever renders as broken raw LaTeX.
- Practice hint buttons disable once revealed (hint persists for the session on that step).
- All new controls use existing button/badge styling (gradient brand buttons, `surface-*` borders).

---

## 8. API Design

New router: **`solve`** (`packages/api/src/routers/solve.ts`), registered alongside existing routers. All procedures are `publicProcedure` with `context.user` guards (auth-gated, Q21) and ownership checks where a map is involved.

### 8.1 `solve.analyze`
```
input:  { problemStatement: string (min 1) }
output: {
  topic:           { name: string } | null,     // best guess, may be null
  formula:         string,                       // best guess, may be ""
  variables:       string,                       // e.g. "d = 120 km, t = 2 h"
  unknown:         string,                       // what is being asked
  unit:            string,                       // "" when none
  assumptions:     string[],                     // flagged assumptions
  warnings:        string[],
  needsClarification: string[] | null            // non-null → ask these, re-run
}
```
Handler: auth check → build analyzer prompt (§9.1) → `callGroq` (low temperature, timeout) → parse JSON → validate with zod → return. Topic auto-creation is **not** performed here (only at generate/save time, see §8.2/§8.4) — but the UI's topic dropdown must include auto-created topics, so generation persists the topic.

### 8.2 `solve.generate`
```
input:  {
  problemStatement: string,
  topicName:        string,        // confirmed/edited by user
  formula:          string,        // confirmed
  variables:        string,        // confirmed
  unknown:          string,        // confirmed
  unit:             string,        // confirmed (may be "")
}
output: {
  steps: Array<{
    stepNumber:   number,
    explanation:  string,
    formulaUsed:  string,          // "" when N/A
    variablesUsed: string,         // "d = 120 km, t = 2 h" (values actually used in this step)
    substitution: string,          // LaTeX-ish, e.g. "v = \\frac{120}{2}"
    calculation:  string,          // LaTeX-ish
    result:       string,          // LaTeX-ish
  }>,
  finalAnswer:    string,          // "60"
  unit:           string,          // "km/h" or ""
  method:         string,          // e.g. "Standard"
  alternativeMethods: Array<{ method: string, steps: [...] }>,  // may be empty
  warnings:       string[],
  title:          string | null    // optional suggested title
}
```
Handler: auth → resolve/auto-create topic by `topicName` (§10) → generator prompt (§9.2) with confirmed fields → `callGroq` → parse + zod-validate → return. The response is **not persisted** until the user clicks Save (FR-4).

### 8.3 `solve.practiceProblem`
```
input:  {
  source: {                       // the confirmed/generated problem the user practiced
    problemStatement: string,
    topicName:        string,
    formula:          string,
    variables:        string,
    unknown:          string,
    unit:             string,
  },
  excludeStatements: string[],    // already-seen problem statements this session (avoid repeats)
}
output: {
  problemStatement: string,
  expectedSteps: Array<{ stepNumber, explanation, formulaUsed, substitution, calculation, result }>,
  hints: Array<{ stepNumber: number, hint: string }>,   // generated upfront (Q18)
  finalAnswer: string,
  unit: string,
}
```
Handler: auth → practice prompt (§9.3) → `callGroq` → parse + validate. The `expectedSteps` and `finalAnswer` are held **client-side only** and revealed on completion (FR-12). No DB writes.

### 8.4 `solve.saveToMap` (or extend `maps` router)
```
input:  {
  topicName:   string,
  title:       string,
  problemStatement: string,
  formula:     string,
  variables:   string,
  unit:        string,
  finalAnswer: string,
  method:      string,
  steps:       Array<{ stepNumber, explanation, formulaUsed, variablesUsed, substitution, calculation, result }>,
  alternativeMethods?: Array<{ method: string, steps: [...] }>,
}
output: { mapId: string }
```
Handler: auth → resolve/auto-create topic (§10) → **single transaction**: insert map (with new `unit`/`finalAnswer` columns; `status = 'in_progress'`) + insert all steps (`isCorrect = 'correct'`; structured columns populated; `suggestedStep = ''`) → return `mapId`. Alternative methods stored per Open Question 5 (default: keep in a JSON column or skip storing).

**Why separate procedures (not inline in `maps.create`)**: keeps the read-only solve experience free of persistence, matches the two-step analyze→generate interaction, and isolates practice from the DB entirely.

### 8.5 Practice step verification (stateless)
Reuse the existing `verifyStepWithAI` design, extracted to accept a problem context instead of a map:
```
input:  {
  problemStatement, topicName, formula, variables, unit,
  previouslyEnteredSteps: [{ explanation, mathExpression, result }],
  newStep:                { explanation, mathExpression, result },
}
output: { isCorrect: boolean, hint: string, suggestedStep: { explanation, mathExpression, result } | null }
```
Refactor note: extract the verifier prompt builder in `verify-step.ts` so the existing map-backed `verifyNewStep` and the new stateless practice verifier share one code path.

---

## 9. LLM Prompt Contracts

All calls reuse `callGroq` (`model: llama-3.3-70b-versatile`). Sensible params: analyzer `temperature: 0.2, maxTokens: 512, timeoutMs: 15_000`; generator `temperature: 0.3, maxTokens: 2048, timeoutMs: 30_000`; practice generator `temperature: 0.7, maxTokens: 1536, timeoutMs: 20_000` (higher temp for variety); practice verifier reuses verifier settings. Every prompt ends with "Respond with ONLY a JSON object" and every response goes through a robust JSON extractor (reuse the fence-stripping + first-`{`…`}` parse from `verify-step.ts`).

### 9.1 Analyzer prompt (sketch)
```
You extract structured information from a STEM word problem. Return JSON only:
{
  "topic": "best topic name (math/physics/chemistry/...; null if unknown)",
  "formula": "the core formula to apply, e.g. v = d / t, or \"\"",
  "variables": "given values with units, e.g. \"d = 120 km, t = 2 h\"",
  "unknown": "what is being asked",
  "unit": "the answer unit, e.g. \"km/h\", or \"\" if unitless",
  "assumptions": ["any assumptions you must make"],
  "warnings": ["ambiguities worth flagging"],
  "needsClarification": null | ["specific questions if the problem is missing info or ambiguous"]
}
Rules: infer units from the text; do not fabricate givens; if the problem is unparseable,
list exactly what is missing in needsClarification.
```

### 9.2 Solution generator prompt (sketch)
```
You are a STEM tutor for "Smart Step Mapper". Given the confirmed problem details below,
produce a complete step-by-step solution. Return JSON only:
{
  "steps": [
    {
      "stepNumber": 1,
      "explanation": "what we do in this step",
      "formulaUsed": "formula applied, or \"\"",
      "variablesUsed": "variable values used in THIS step, e.g. \"d = 120 km, t = 2 h\"",
      "substitution": "numbers plugged into the formula (LaTeX)",
      "calculation": "the working/arithmetic (LaTeX)",
      "result": "this step's result (LaTeX)"
    }
  ],
  "finalAnswer": "numeric/expression answer, e.g. \"60\"",
  "unit": "correct unit, e.g. \"km/h\", or \"\" if none",
  "method": "name of this method, e.g. \"Standard\"",
  "alternativeMethods": [ { "method": "name", "steps": [ ...same shape... ] } ] | [],
  "warnings": ["assumptions made"],
  "title": "a short suggested map title"
}
Rules:
- Every step must include formula → variables → substitution → calculation → result where applicable.
- The final answer must carry the correct unit (infer from the givens; flag in warnings if uncertain).
- If the problem admits multiple methods, provide alternativeMethods (max 2) with full steps.
- Do not skip required moves; steps must be logically ordered and complete.
- Explanation-only steps (e.g. "Attach units") are allowed but must not hide math.
- Respond with ONLY a JSON object.
```
Input context includes: confirmed topic, problem statement, formula, variables, unknown, unit.

### 9.3 Practice problem generator prompt (sketch)
```
You generate practice variants for "Smart Step Mapper". Given a source problem, create ONE
new problem that tests the SAME concept/formula with DIFFERENT numbers. Return JSON only:
{
  "problemStatement": "...",
  "expectedSteps": [ { stepNumber, explanation, formulaUsed, substitution, calculation, result } ],
  "hints": [ { "stepNumber": 1, "hint": "a nudge, not the answer" } ],
  "finalAnswer": "...",
  "unit": "..."
}
Rules: use realistic numbers (no negative distances/times, no division by zero);
vary the numbers meaningfully from the source problem; if given excludeStatements, avoid them;
one hint per step, escalating in helpfulness but never revealing the final answer.
Respond with ONLY a JSON object.
```

### 9.4 Practice step verifier
Reuse the `VERIFIER_SYSTEM_PROMPT` structure from `verify-step.ts` (correctness = mathematically sound **and** the right next step; accept valid alternatives), with the map context replaced by the practice problem context and the previously entered steps. Same JSON contract (`verdict`, `hint`, `suggestedStep`, `reason`).

---

## 10. Topic Auto-Creation Logic

`resolveTopicByName(name)` (new helper in `packages/api`):
1. Normalize/trim the name; look up `topics` by `name` (case-insensitive).
2. If found → return existing id.
3. If not → insert `{ name, description: "Auto-detected topic", displayOrder: max(displayOrder)+1 }` (handle the unique-constraint race by catching and re-selecting). Return new id.
- Called from `solve.generate` and `solve.saveToMap` (and, if desired, from `solve.analyze` — default: no, keep analyze side-effect-free).
- All existing topic-listing surfaces (`topics.list`, create page, map editor dropdown) pick up auto-created topics with no change.

---

## 11. Data Model Changes

### `packages/db/src/schema/steps.ts` — new columns
```ts
formulaUsed:  text("formula_used").notNull().default(""),
variablesUsed: text("variables_used").notNull().default(""),   // human-readable string (matches UI field style)
substitution: text("substitution").notNull().default(""),      // LaTeX
calculation:  text("calculation").notNull().default(""),        // LaTeX
```
- Existing `explanation`, `mathExpression`, `result` stay (backward-compatible; `mathExpression` keeps serving as the step's main display line for `MapVisualization`).
- `isCorrect`, `feedback`, `suggestedStep` unchanged (saved generated steps use `isCorrect = 'correct'`).

### `packages/db/src/schema/maps.ts` — new columns
```ts
unit:         text("unit").notNull().default(""),
finalAnswer:  text("final_answer").notNull().default(""),
```
- Optionally `method: text` + `alternativeMethods: text` (JSON) for the active method and alternatives (Open Question 5).

### Migration
- Drizzle migration via `bun run db:generate` + apply (`db:migrate` / `db:push`). Existing rows default to `""` — no backfill needed.

### Practice Mode
- **No new tables.** Practice is entirely ephemeral (Q14); session data lives in client state.

---

## 12. Impact on Existing Features

| Feature | Impact |
|---|---|
| **Create Map page** | Gains a mode toggle; manual form untouched. `StepEditor` may finally be wired into practice-mode step entry (it is currently vestigial). |
| **Map editor / step-verification** | Unchanged; saved generated maps land there as normal maps with all steps `correct`. User edits after saving go through the normal flow. |
| **Progress stats** | Saved generated maps contribute steps (counted as correct) to progress/accuracy, same as any map. Practice attempts do NOT count (Q14). |
| **Topics list** | Grows dynamically via auto-creation (Q19). |
| **AI chat** | Unchanged; on saved maps it will see the AI-authored steps as normal context. |
| **MapVisualization** | No change; renders saved generated steps by `isCorrect`. |
| **Dependencies** | New: KaTeX (+ small `MathTex.svelte` component). No other new deps expected. |

---

## 13. Edge Cases & Failure Modes

| Case | Handling |
|---|---|
| Ambiguous / missing-info problem | Analyzer returns `needsClarification`; UI asks the questions and re-runs (FR-7). |
| Assumption required (e.g., "assuming constant speed") | Best-effort generation with `warnings` rendered inline (FR-7). |
| Unitless math problem | `unit = ""`; answer banner shows just the answer. |
| Multi-answer (x = ±5) | Generator must include both in the final answer; banner shows "x = ±5". |
| Unit inferred but uncertain | Flag in `warnings`; unit field editable in the confirmation strip. |
| Non-math STEM (physics/chem) | Supported; topic auto-created (Q19). |
| LLM error / timeout / unparseable JSON | Friendly error + retry; input preserved (FR-7). |
| Topic auto-create race (unique name) | Insert-else-reselect helper (§10). |
| Practice problem generation yields unsolvable/duplicate problem | Prompt rules + `excludeStatements`; if the model still fails validation, generate again (max N attempts) or surface a friendly "try again". |
| Practice session runs long (endless loop) | No DB cost; token cost per "Next Problem" — consider a soft session cap (e.g., 20) — see Open Question 4. |
| KaTeX parse failure | `MathTex.svelte` falls back to plain text (FR-10). |
| Very long problems / solutions | Cap prompt context (recent steps / max steps) as a hardening item, consistent with step-verification spec. |
| Save-as-map mid-generation | Save button disabled while a generation/save is in flight. |
| Method tabs with differing step counts | Independent step lists per method; answer banner shared. |
| Hint reveals spoiling the answer | Prompt rules: hints are nudges only; verifier tests on completion. |
| Reduced motion / a11y | Tabs and disclosures are keyboard-accessible; animations respect `prefers-reduced-motion`. |

---

## 14. Testing Strategy

- **Unit tests (packages/api):** follow `verify-step.test.ts` / `chat.test.ts` patterns.
  - Prompt builders: analyzer, generator, practice generator, practice verifier (input → prompt contains confirmed fields, `excludeStatements`, alternative-method instructions, etc.).
  - JSON parsers: valid JSON, fenced output, garbage → null → failure path.
  - Zod validation of LLM outputs (all new procedures validate with zod before returning).
  - `resolveTopicByName`: existing match, new insert, race (duplicate-key → reselect).
  - `solve.saveToMap`: transaction inserts map + steps with structured columns; ownership guards.
- **Web manual QA checklist** (in implementation plan): mode toggle; analyze → confirm → generate happy path (with units, answer banner, KaTeX rendering); alternative-method tabs; assumptions/warnings; clarification flow; LLM failure → retry; save-as-map → lands in editor with all fields; practice: hint reveal, correct/incorrect per step, full solution reveal, next-problem loop, exit summary, no DB writes (verify via network/devtools), auth gating.
- **Validation commands:** `bun test` in `packages/api`; `bun run check-types`; oxlint; `bun run db:generate` to verify the migration is generated.

---

## 15. Suggested Implementation Plan (not yet executed)

1. **DB:** add `steps` columns (`formulaUsed`, `variablesUsed`, `substitution`, `calculation`) and `maps` columns (`unit`, `finalAnswer`); generate migration. `(packages/db)`
2. **API utils:** new `solve.ts` prompt builders + parsers; extract shared practice verifier from `verify-step.ts`; `resolveTopicByName` helper. `(packages/api)`
3. **API router:** `solve` router (analyze, generate, practiceProblem, saveToMap) + zod validation + tests. `(packages/api)`
4. **Web — math rendering:** add KaTeX; `MathTex.svelte` component. `(apps/web)`
5. **Web — create page:** AI/Manual mode toggle; analyze → confirmation strip → generate → solution view (collapsible steps, method tabs, answer banner) → Save as Map. `(apps/web)`
6. **Web — practice panel:** drawer/overlay; step entry (reuse step-form component); stateless verification; upfront hints; reveal; next-problem loop; exit summary. `(apps/web)`
7. **Validate:** API unit tests, typecheck web + api, oxlint, manual QA checklist (§14).

---

## 16. Open Questions (resolved — see implementation plan)

All open questions are now **resolved** in `docs/superpowers/plans/2026-08-06-ai-solution-practice.md` ("Resolved Open Questions" table):

1. ~~`solve.analyze` topic creation~~ → **Create at analyze** (returns `topicId`).
2. ~~Combine analyze + generate~~ → **Keep the two-step confirmation UX** (unchanged decision).
3. ~~Saved step status~~ → **Mark all `correct`**.
4. ~~Practice session cap~~ → **Truly unlimited** (no cap).
5. ~~Alternative-method persistence~~ → **Store on map** (`maps.method` + `maps.alternativeMethods` JSON); editor shows primary only.
6. ~~KaTeX specifics~~ → **`katex` npm package + custom SSR-safe `MathTex.svelte`** with plain-text fallback; per-field rendering.
7. ~~Practice panel placement~~ → **Overlay drawer** over the solution view (default).
8. ~~Naming~~ → **`solve.analyze` / `solve.generate` / `solve.practiceProblem` / `solve.verifyStep` / `solve.saveToMap`**; step columns `formulaUsed`, `variablesUsed`, `substitution`, `calculation`; map columns `unit`, `finalAnswer`, `method`, `alternativeMethods`.
9. ~~Answer banner scope~~ → **Solve view + map editor** (stored `unit`/`finalAnswer` rendered on `/maps/[id]`).

---

## 17. Reference Files for Implementation

- `apps/web/src/routes/create/+page.svelte` (primary integration surface)
- `apps/web/src/lib/components/StepEditor.svelte` (reusable step-entry component for practice)
- `apps/web/src/routes/maps/[id]/+page.svelte` (map editor target of Save as Map)
- `apps/web/src/lib/components/AIChatPanel.svelte`, `MapVisualization.svelte` (visual conventions)
- `packages/api/src/routers/maps.ts`, `topics.ts` (procedure patterns, ownership guards)
- `packages/api/src/utils/chat.ts` (`callGroq`, `MapContext`, env access)
- `packages/api/src/utils/verify-step.ts` (JSON prompt + parse pattern; verifier to extend)
- `packages/db/src/schema/maps.ts`, `steps.ts`, `topics.ts` (schema to extend)
- `packages/api/src/__tests__/verify-step.test.ts`, `chat.test.ts` (test patterns)
- `docs/superpowers/specs/step-verification-spec.md` (sister spec; shared conventions)
