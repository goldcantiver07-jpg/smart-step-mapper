# Step Verification on Add — Spec

- **Status:** Draft (interview complete; no code changes yet)
- **Date:** 2026-08-05
- **Author:** Buffy (interviewed with product owner)
- **Feature short name:** `step-verification`

---

## 1. Overview

**Original request (verbatim):**
> in add step, when adding per step, verify it if its correct step/ process or not, it wrong then help the user to guide it

**Refined problem statement:**
When a user adds a step to a map in *Smart Step Mapper* (a step-by-step math tutoring app), the app should automatically verify whether that step is correct — both **mathematically sound** and **the right next step in the solution process**. If the step is wrong, the app should not block the user, but should **flag the step as incorrect and guide the user inline** toward the correct step (hint first, with an optional reveal of a suggested corrected step).

The feature applies to **every "Add Step" action**, on both add-step surfaces, powered by the existing **Groq LLM** (the same model already used by the AI chat).

---

## 2. Goals

- Verify each added step automatically for mathematical soundness **and** logical fit as the next step in the process.
- Never block the user: the step is always saved; a wrong step is saved and flagged `incorrect` with guidance.
- Guide the user inline, under the step form, with a short hint and an optional "Show correct step" reveal.
- Accept **alternative valid approaches** as correct (e.g., factoring vs. quadratic formula).
- Provide a **"Skip AI check"** toggle for users who don't want a step checked.
- Reuse existing infrastructure: Groq chat utilities, the `steps.isCorrect` / `steps.feedback` columns, and the existing step-card UI patterns.

## 3. Non-Goals (explicitly out of scope)

- Changing the existing detail-page `verifyStep` (expected-result vs. user-result) flow — it stays exactly as-is.
- Force-marking a step correct without AI confirmation (no "mark as correct anyway").
- A "re-check this saved step later" button for skipped steps (the skip toggle is the only control; see Open Questions).
- Re-verification of a step when it is later edited via `maps.updateStep` (noted in Edge Cases).
- Inserting/reordering steps mid-sequence (step numbers remain sequential append-only in this flow).
- Non-English hints/guidance (English only).
- Chat panel changes; guidance is inline only.

---

## 4. Current System Context

### Flow today
1. User creates a map: topic, problem statement, formula, variables, title → `maps.create`.
2. User adds steps one at a time (explanation, math expression, result) → `maps.addStep`.
3. On the map detail page, each step card shows a status badge (`Open`/`Correct`/`Incorrect`) and, when expanded, an **expected-result vs. user-result** "Verify" box → `maps.verifyStep`, which uses a **deterministic** string comparison.
4. The AI chat (`AIChatPanel` → `chat.sendMessage`) sees the full map context and gives hints without revealing answers.

### Relevant files
| File | Role |
|---|---|
| `apps/web/src/routes/maps/[id]/+page.svelte` | **Primary add-step surface.** Inline "New Step #N" form at the bottom; step cards with status badges; expanded area shows `step.feedback` + solve-time Verify box. Also has `handleAddStep`, `handleVerify`, progress bar, `correctCount`. |
| `apps/web/src/lib/components/StepEditor.svelte` | Secondary add-step component (`explanation`/`mathExpression`/`result` + "Add Step"). Imported by the create page but **currently not rendered in its template** — effectively vestigial. |
| `apps/web/src/routes/create/+page.svelte` | Create-map page; imports `StepEditor` and has a `steps_list`/`handleAddStep` that are not wired into the rendered template. Redirects to `/maps/[id]` after map creation. |
| `packages/api/src/routers/maps.ts` | `create`, `list`, `getById`, `addStep`, `updateStep`, `verifyStep` (deterministic), `update`, `delete`. |
| `packages/api/src/utils/adaptive-engine.ts` | `verifyStepResult(expected, user)` — deterministic string comparison + canned feedback. Unchanged by this feature. |
| `packages/api/src/utils/chat.ts` | `sendChatMessage` (Groq `llama-3.3-70b-versatile`), `buildSystemPrompt`, `MapContext` type. Reused pattern for the new verifier call. |
| `packages/api/src/routers/chat.ts` | `chatRouter.sendMessage` — fetches map + steps, builds `MapContext`, calls Groq. |
| `packages/db/src/schema/steps.ts` | `steps` table: `stepNumber`, `explanation`, `mathExpression`, `result`, `isCorrect` (`unchecked|correct|incorrect`), `feedback`. **Needs new `suggestedStep` column.** |
| `packages/db/src/schema/progress.ts`, `packages/api/src/routers/progress.ts` | Progress stats count `isCorrect = 'correct'` / `'incorrect'` — **will now include add-time verdicts** (accepted consequence, see §12). |
| `packages/api/src/__tests__/` | `adaptive-engine.test.ts`, `chat.test.ts` — patterns for new unit tests. |
| `apps/web/src/lib/components/MapVisualization.svelte` | Colors step nodes by `isCorrect` — automatically reflects add-time verdicts. |

---

## 5. Interview Decisions (final answers)

| # | Question | Answer | Implication |
|---|---|---|---|
| Q1 | What does "verify" check? | **(c) Both** — mathematical soundness **and** logical correctness as the next step. | Requires LLM judgment; deterministic checks are insufficient. |
| Q2 | When does verification run? | **(a) Automatically** on every "Add Step" click. | One Groq call per step (unless skipped). |
| Q3 | If wrong, what happens? | **(b)** Still save; mark `incorrect` with feedback. | Never blocks the user. |
| Q4 | Where does guidance appear? | **(a)** Inline under the step form. | New inline guidance panel in `StepEditor`-style forms; no chat changes. |
| Q5 | What powers verification? | **(a)** The existing LLM (Groq). | New verifier prompt + structured JSON output. |
| Q6 | Verifier context? | **(b)** Problem statement + formula + variables **+ all previously added steps**. | Prompt includes prior steps (incl. flagged ones) to judge "right next step" and repeats. |
| Q7 | Guidance style? | **(b)** Hint + a "Show correct step" toggle that reveals a full suggested step. | Two-part feedback payload: hint + suggested step. |
| Q8 | User override? | **(c)** AI accepts alternative valid approaches as correct; user can request re-verification with that framing. | No force-mark; AI is final arbiter. |
| Q9 | Timing & failure? | **(b)** Save instantly; verdict arrives async. On LLM failure → step stays `unchecked`, show "couldn't verify". | Save-then-verify architecture; never block on LLM. |
| Q10 | Explanation-only steps? | **(a)** Still verify — judge the explanation's logical fit as the next step. | Verifier handles steps with no math/result. |
| Q11 | Storage? | **(a)** Reuse `isCorrect`/`feedback` (feedback = hint) + **new `suggestedStep` column** for the suggested step. | Add-time `incorrect` marks flow into progress stats (accepted). |
| Q12 | Scope/misc | Detail-page `verifyStep` stays as-is; **English only**; **skip verification** option required. | — |
| Q13 | Which add-step surfaces? | **(a) Both** — create page `StepEditor` and map detail inline form. | Shared behavior; recommend extracting a shared component. |
| Q14 | Skip UX | **(b)** A "Skip AI check" toggle **on the step form**. | Toggle (default off, persists while on the page) suppresses the Groq call. |
| Q15 | Alternative-override UX | **(a)** A "This is a valid alternative method" button that re-runs the AI with that framing; **AI decides**. | No "mark correct anyway" path. |
| Q16 | Suggested-step usage | **(b)** Shown as a **pre-filled, editable draft for the next step** (user adjusts then submits). | Reveal pre-fills the add-step form; it then goes through verification again. |

---

## 6. Functional Requirements

### FR-1 — Automatic verification on add (both surfaces)
- Clicking **Add Step** (map detail inline form **and** create-page `StepEditor`) with the "Skip AI check" toggle off:
  1. Saves the step immediately via the existing `maps.addStep` (unchanged semantics).
  2. After the save succeeds, the client fires the new verification call (§8) with the new step's `stepId`.
  3. The step card shows a "Verifying…" state (spinner/badge) until the verdict returns.

### FR-2 — Verdict display (per step card)
- **Correct:** existing green badge (`Correct`), no feedback shown.
- **Incorrect:** existing red badge (`Incorrect`) + inline guidance panel under the step form containing:
  - The hint text (`feedback` column), styled like the existing amber feedback block.
  - A **"Show correct step"** toggle that reveals the suggested step (from the new `suggestedStep` column).
- **Unchecked** (skipped or verification failure): existing neutral badge (`Open`) + a subtle "Couldn't verify this step" note only when a verification attempt failed.

### FR-3 — Suggested step reveal & prefill
- Revealing the suggested step displays its `explanation` / `mathExpression` / `result`.
- Per Q16, revealing it also **pre-fills the "New Step #N" form** with those values as an **editable draft**. The user can adjust and submit it (which triggers verification again).
- The saved, flagged step is **not** modified by this prefill.

### FR-4 — Skip AI check
- A "Skip AI check" toggle on the add-step form (default **off**; persists while the user is on the page; a reasonable default: resets on page load).
- When on: Add Step saves without firing the verifier; the step stays `unchecked`.
- Skipped steps are **not** re-checkable in this iteration (Open Questions).

### FR-5 — Alternative-approach override
- On an `incorrect` step card, a **"This is a valid alternative method"** button re-runs the verifier in `alternative` mode (§8) with a prompt instruction telling the AI the user believes the step is a valid alternate path.
- AI decides: if it confirms, the step flips to `correct`; if not, the step stays `incorrect` and the (possibly updated) feedback is shown.
- No force-mark path exists (Q15a).

### FR-6 — Failure fallback
- If the verifier throws, times out, or returns unparseable output: the step remains `unchecked`, the UI shows "Couldn't verify this step", and nothing else changes. The user is never blocked.

### FR-7 — Verification context
- The verifier receives: topic name, title, problem statement, formula, variables, the **new step**, and **all previously added steps** (in order, including their `isCorrect`/`feedback` states).

---

## 7. UI Wireframes

> ASCII sketches of the map detail page layout (the primary add-step surface). The create-page `StepEditor` uses the same step-form + guidance components, minus the surrounding panels. All states reuse the existing visual language: emerald = correct, red = incorrect, neutral = unchecked, brand blue = pending/verifying.

### 7.1 Layout overview (map detail page)

```
┌────────────────────────┬────────────────────────────────────┬──────────────────┐
│ LEFT SIDEBAR           │  CENTER — Steps timeline           │ RIGHT PANEL      │
│ Map Details            │  ───────────────────────────────   │ AI Tutor Chat    │
│  Title        [x]      │  Toolbar: [＋ Add Step] [⇱][100%][⇲] │  (AIChatPanel)   │
│  Topic        [v]      │  "{correctCount} / {totalSteps} verified" │                │
│  Problem [textarea]    │                                      │                  │
│  Formula [ ]  Vars [ ] │   (1) Step 1   [✅ Correct]          │                  │
│  [Save Changes]        │   (2) Step 2   [❌ Incorrect] ◄─ new │                  │
│  Statistics            │   (3) Step 3   [⏳ Verifying…] ◄─ new│                  │
│   Total 3  Correct 1   │   (4) Step 4   [Open]                │                  │
│   Progress 33%         │                                      │                  │
│                        │   ┌─ New Step #5 (form, §7.2) ────┐ │                  │
│                        │   └───────────────────────────────┘ │                  │
└────────────────────────┴────────────────────────────────────┴──────────────────┘
```

### 7.2 Add-step form — with "Skip AI check" toggle

```
┌─────────────────────────────────────────────────────┐
│  ➕ New Step #5                      [🔍 Skip AI check] │   ← toggle, default OFF
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ What do you do in this step? (explanation)    │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────┐ ┌─────────────────┐  │
│  │ x = (-5 + 7) / 2          │ │ x = 1           │  │   ← math expr | result
│  └───────────────────────────┘ └─────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │                    Add Step                   │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  · Toggle ON  → Add Step saves WITHOUT verification │
│    (badge stays "Open", no Groq call)              │
│  · Toggle OFF → Add Step saves, then "Verifying…"   │
└─────────────────────────────────────────────────────┘
```

### 7.3 Step card — "Verifying…" (immediately after Add Step)

```
┌────────────────────────────────────────────────────┐
│ (5)  Step 5                          [⏳ Verifying…] │  ← brand-blue spinner badge
│      Explanation: "Combine like terms"             │
│      [3x + 2 - 2x]                Result: x = 2    │
│      (card body dimmed; user may keep adding)      │
└────────────────────────────────────────────────────┘
```

### 7.4 Step card — Correct (verdict arrived)

```
┌────────────────────────────────────────────────────┐
│ (5)  Step 5                          [✅ Correct]   │  ← emerald badge (existing)
│      Explanation: "Combine like terms"             │
│      [3x + 2 - 2x]                Result: x = 2    │
│      (no feedback; nothing else shown)             │
└────────────────────────────────────────────────────┘
```

### 7.5 Step card — Incorrect (expanded): hint + reveal + alternative button

```
┌────────────────────────────────────────────────────┐
│ (5)  Step 5                          [❌ Incorrect]  │  ← red badge (existing)
│      Explanation: "x² = 25 → x = 5"                │
│      [√(x²) = √25]                Result: x = 5    │
│  ┌───────────────────────────────────────────────┐ │
│  │ ⚠ Hint (feedback): "x² = 25 has two solutions │ │  ← amber block (existing style)
│  │   — did you consider ±√25?"                   │ │
│  └───────────────────────────────────────────────┘ │
│  [Show correct step ▾]      [↺ This is a valid     │
│                              alternative method]   │
│  ┌─ revealed (toggle) ───────────────────────────┐ │
│  │ Suggested step — also pre-fills New Step #6:  │ │  ← FR-3 prefill
│  │   Explanation: "Take the square root of both  │ │
│  │     sides"                                    │ │
│  │   [x = ±√25]                 Result: [x = ±5] │ │  ← editable draft
│  │   ✎ user edits → clicks Add Step → re-verified │ │
│  └───────────────────────────────────────────────┘ │
│  · "This is a valid alternative method" → re-runs  │  ← FR-5 (AI decides)
│    verifier in `alternative` mode; badge flips to  │
│    ✅ Correct only if the AI confirms              │
└────────────────────────────────────────────────────┘
```

### 7.6 Step card — Skipped / verification failure (unchecked)

```
┌────────────────────────────────────────────────────┐
│ (6)  Step 6                            [Open]      │  ← neutral badge (existing)
│      Explanation: "…"                              │
│      [ … ]                       Result: …        │
│      · Skipped via toggle          → no note       │
│      · Verification failed/timeout → subtle note:  │
│        "Couldn't verify this step"                 │
└────────────────────────────────────────────────────┘
```

### 7.7 Notes & micro-interactions

- **Verifying state** is transient; the badge flips to Correct/Incorrect/Open when the verdict (or failure) lands — the card otherwise stays as-is (no layout shift).
- The **"Show correct step"** reveal is a disclosure toggle; revealing it pre-fills the next-step form with editable values (FR-3 / Q16b). The flagged step is never modified by the prefill.
- The **alternative-method button** appears only on `incorrect` cards (FR-5); while re-verifying it shows the same "Verifying…" treatment and is disabled to prevent double-clicks.
- The **skip toggle** persists while on the page and resets on page load (Q14b).
- All new controls follow existing button/badge styling (gradient brand buttons, `surface-*` borders) and respect `prefers-reduced-motion` (spinner animations disabled when reduced motion is on).

---

## 8. API Design

### New procedure: `maps.verifyNewStep`
```
input:  {
  stepId: string (uuid),
  mode:   "auto" | "alternative"   // default "auto"
}
output: {
  isCorrect:      boolean,
  feedback:       string,          // hint text ("" when correct)
  suggestedStep:  { explanation: string, mathExpression: string, result: string } | null,
  verifiedAt:     string (ISO)     // informational
}
```

Handler logic:
1. **Auth/ownership** — same guards as other procedures: step must exist, belong to a map owned by `context.user` (mirror `updateStep`'s lookup).
2. Fetch map (with `topicName`), and all steps ordered by `stepNumber`.
3. Build the verifier context (§10 prompt) and call Groq via a new utility `verifyStepWithAI` (see below).
4. Parse the structured JSON response (§9). On any failure, **do not write** — return `{ isCorrect: false, feedback: "", suggestedStep: null, ... }` plus an `unavailable` flag, OR throw a typed error the client maps to "couldn't verify". (Decision point: prefer a non-throwing result with `status: "unavailable"` so the client never treats it as a blocking error.)
5. On success, update the step row: `isCorrect = "correct" | "incorrect"`, `feedback = hint`, `suggestedStep = JSON.stringify(suggestedStep) | ""`. Return the verdict.

### Why a separate procedure (not inline in `addStep`)
- Keeps `addStep` unchanged and instant (FR/Q9b save-first).
- Supports the `alternative` re-verification mode (FR-5) and future re-checks.
- Lets the client control skip (FR-4) and concurrency.

### New utility: `packages/api/src/utils/verify-step.ts`
- `verifyStepWithAI(ctx: MapContext-ish, step, mode): Promise<VerifierResult>` — builds the prompt, calls Groq (reuse the fetch/ENV pattern from `chat.ts`; consider extracting a small shared `callGroq(messages, {temperature, maxTokens})` helper to avoid duplication).
- Parameters: `temperature: 0.2` (deterministic-ish structured output), `max_tokens: 512`, add a **timeout** (e.g., AbortController ~15s — the current chat call has none; add it here at minimum).
- JSON parsing helper: robust extraction of a JSON object from the response (strip ```json fences, find first `{...}`), returns `null` on failure (→ `unavailable`).

---

## 9. Structured Output Contract

The LLM must return exactly one JSON object:

```json
{
  "verdict": "correct" | "incorrect",
  "hint": "short tutoring hint ("" if correct)",
  "suggestedStep": {
    "explanation": "What to do in the corrected step",
    "mathExpression": "e.g. x = (-5 + 7) / 2",
    "result": "e.g. x = 1"
  },
  "reason": "one-line justification for the verdict"
}
```

Rules for the model:
- `suggestedStep` is **null/omitted** when `verdict` is `correct`; required when `incorrect`.
- `hint` must be a hint, not the full solution (tutoring style, consistent with the chat system prompt).
- When `mode = "alternative"`, the user claims an alternative valid method; the model must evaluate it as such and may flip the verdict to `correct` if it's mathematically valid and a legitimate step.

---

## 10. Verifier Prompt (sketch for implementation)

```
You are a step-verifier for "Smart Step Mapper", a math tutoring app. A student is
solving a problem one step at a time and has just added a new step.

## Problem
Title: ...
Topic: ...
Problem Statement: ...
Formula: ...
Variables: ...

## Previously added steps (in order)
Step 1: <explanation> [Math: ...] → Result: ... [✅ Correct | ❌ Incorrect | ⏳ Unchecked]
...

## New step to verify (Step N)
Explanation: ...
Math Expression: ...
Result: ...

## Verification rules
1. The new step is correct only if it is BOTH mathematically sound AND the correct
   next step in solving the problem (no skipped required moves, no repetition of an
   earlier step).
2. Accept ANY mathematically valid alternative approach as correct (e.g., factoring
   vs. quadratic formula) even if it differs from a "standard" path.
3. For steps without math (explanation only), judge the explanation's logical
   correctness as the next step.
4. If incorrect, provide a short hint (do not reveal the full solution) and a complete
   suggested corrected step the student could use.
5. Respond with ONLY a JSON object:
   {"verdict":"correct"|"incorrect","hint":"...","suggestedStep":{...}|null,"reason":"..."}
```

[When `mode = "alternative"`: append — "The student claims this step is a valid
alternative method. Evaluate it on its own mathematical merits. If it is a valid
alternative step, mark it correct; otherwise explain why it is not."]

---

## 11. Data Model

### `packages/db/src/schema/steps.ts` — new column
```ts
suggestedStep: text("suggested_step").notNull().default(""),
```
- Stores `JSON.stringify({ explanation, mathExpression, result })` when the verifier flags a step incorrect; `""` otherwise.
- Drizzle migration required (repo uses drizzle; see `packages/db/drizzle.config.ts`).
- `feedback` semantics unchanged: hint text when `incorrect`, `""` when `correct`/`unchecked`.
- Existing `isCorrect` values (`unchecked|correct|incorrect`) reused as-is.

---

## 12. Impact on Existing Features

| Feature | Impact |
|---|---|
| **Progress stats** (dashboard, progress page, map sidebar) | Count `correct`/`incorrect` from `isCorrect` — add-time verdicts now count. **Accepted consequence of Q11a.** A step flagged `incorrect` at add time counts as incorrect in progress before the user "solves" it. Flagged in Open Questions as a UX risk. |
| **Map detail toolbar** ("{correctCount} / {totalSteps} verified") | Reflects add-time verdicts. Consider renaming to "checked" later (Open Questions). |
| **Solve-time Verify box** (expected vs. user result) | Untouched (Q12). Note `canVerify` in the step card is `unchecked || (previously incorrect)`; since add-time verdicts set `correct`/`incorrect`, newly added steps will no longer show the solve-time box unless flagged incorrect. Acceptable; revisit if desired. |
| **AI chat context** | Already renders ❌/✅ from `isCorrect` — automatically reflects new verdicts. |
| **MapVisualization** | Colors by `isCorrect` — automatically reflects new verdicts. |
| **Step badge colors** | Reuse existing badge styles; add a subtle "Verifying…" state (new, small). |

---

## 13. Edge Cases & Failure Modes

| Case | Handling |
|---|---|
| LLM error / timeout / rate limit | Step stays `unchecked`; UI shows "Couldn't verify this step". Never blocks. |
| Unparseable / non-JSON model output | Treated as failure → `unchecked`, no DB write. |
| Explanation-only step | Still verified (Q10a); `suggestedStep.mathExpression`/`result` may be empty. |
| Empty form fields | Add button already disabled when all three fields are empty (existing behavior). |
| Step repeats an earlier step / skips a required move | Verifier instructed to flag as `incorrect`. |
| Alternative valid method | Accepted by default (prompt rule 2) + `alternative` re-verification (FR-5). |
| Rapid consecutive adds | Each verification snapshots the map at its own call time; possible minor races are acceptable for v1. |
| Very long maps (many steps) | Prompt grows with steps; v1 accepts, note truncation strategy (e.g., cap context at N most recent steps) as a future hardening item. |
| Step edited after verification (`updateStep`) | Verdict may go stale; re-verify-on-edit is out of scope (noted). |
| User turns skip toggle on mid-session | Only affects subsequent adds. |
| `suggestedStep` JSON stored but step later marked correct (alternative override) | Leave the stored suggestion (harmless) or clear it; decide at implementation (prefer clear-on-correct). |

---

## 14. Testing Strategy

- **Unit tests (packages/api):**
  - `verify-step.test.ts`: prompt builder includes problem/formula/variables, all prior steps with statuses, and the new step; `alternative` mode appends the alternative-method instruction.
  - JSON parser: valid JSON, fenced (```json) output, garbage → `null`.
  - Verdict→DB mapping logic.
- **Procedure test:** `maps.verifyNewStep` — ownership guard, `unavailable` on LLM failure (mock or skip real network; follow existing test patterns which test pure functions).
- **Web manual QA checklist** (in plan): happy path correct step; wrong step → hint + reveal + prefill; skip toggle; alternative override; LLM failure (temporarily bad key) → "couldn't verify", step saved; both surfaces.

---

## 15. Suggested Implementation Plan (not yet executed)

1. **DB:** add `suggested_step` column + migration (`packages/db`).
2. **API:** new `utils/verify-step.ts` (prompt + Groq call + JSON parse, with timeout), `maps.verifyNewStep` procedure with ownership checks, unit tests. Optionally extract shared `callGroq` helper.
3. **Web — map detail page:** wire add-step form → save then verify; per-step "Verifying…" state; verdict rendering (badge, hint panel, "Show correct step" reveal + next-step prefill); "Skip AI check" toggle; "This is a valid alternative method" button.
4. **Web — create page/StepEditor:** apply the same behavior (recommend extracting a shared step-form component used by both surfaces, since `StepEditor` is currently unwired).
5. **Validate:** `bun test` in `packages/api`, typecheck web + api, oxlint, manual QA.

---

## 16. Open Questions (for follow-up fleshing out)

1. Should add-time `incorrect` verdicts count toward progress stats, or should progress only reflect solve-time verification? (Currently counts — Q11a consequence.)
2. Should skipped steps get a "Check this step" button later (was part of Q14 option c, not chosen)?
3. Re-verify on step edit via `updateStep`?
4. Truncation strategy for very long maps (prompt size)?
5. Should the "Show correct step" reveal also offer "Replace the flagged step with this" (Q16 was answered as prefill-next-step, not replacement)?
6. Exact naming of the new procedure / column.

---

## 17. Reference Files for Implementation

- `apps/web/src/routes/maps/[id]/+page.svelte`
- `apps/web/src/lib/components/StepEditor.svelte`
- `apps/web/src/routes/create/+page.svelte`
- `packages/api/src/routers/maps.ts`
- `packages/api/src/utils/chat.ts` (Groq call pattern, `MapContext`)
- `packages/api/src/utils/adaptive-engine.ts` (existing deterministic verifier — unchanged)
- `packages/db/src/schema/steps.ts`
- `packages/api/src/__tests__/chat.test.ts`, `adaptive-engine.test.ts`
