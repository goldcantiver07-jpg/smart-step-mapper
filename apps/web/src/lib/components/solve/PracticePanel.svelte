<script lang="ts">
  import { orpc } from "$lib/orpc";
  import { createMutation } from "@tanstack/svelte-query";
  import MathTex from "$lib/components/MathTex.svelte";
  import SolutionStepCard from "./SolutionStepCard.svelte";
  import type { ConfirmedProblem, PracticeProblem } from "./SolutionTypes";

  let {
    open,
    source,
    onClose,
  }: {
    open: boolean;
    source: ConfirmedProblem;
    onClose: () => void;
  } = $props();

  type UserStep = { explanation: string; mathExpression: string; result: string };
  type CheckResult = {
    isCorrect: boolean;
    feedback: string;
    suggestedStep: UserStep | null;
    unavailable?: boolean;
  };

  const practiceMutation = createMutation(() => orpc.solve.practiceProblem.mutationOptions());
  const verifyMutation = createMutation(() => orpc.solve.verifyStep.mutationOptions());

  // ── Session tally (client-side only, nothing persisted) ──
  let problemsDone = $state(0);
  let problemsCorrect = $state(0);
  let hintsUsed = $state(0);
  let problemIndex = $state(0);
  let excludeStatements = $state<string[]>([]);

  // ── Current problem ──
  let problem = $state<PracticeProblem | null>(null);
  let loadingProblem = $state(false);
  let problemError = $state<string | null>(null);

  // ── Solving state ──
  let enteredSteps = $state<UserStep[]>([]);
  let explanation = $state("");
  let math = $state("");
  let result = $state("");
  let isFinalStep = $state(false);
  let checking = $state(false);
  let checkResult = $state<CheckResult | null>(null);
  let revealedHints = $state<Record<number, boolean>>({});
  let revealed = $state(false);
  let solved = $state(false);
  let summaryOpen = $state(false);

  const currentStepNumber = $derived(enteredSteps.length + 1);
  const totalExpectedSteps = $derived(problem?.expectedSteps.length ?? 0);
  const currentHint = $derived(
    problem?.hints.find((h) => h.stepNumber === currentStepNumber)?.hint ?? null,
  );

  function resetSolving() {
    enteredSteps = [];
    explanation = "";
    math = "";
    result = "";
    isFinalStep = false;
    checking = false;
    checkResult = null;
    revealedHints = {};
    revealed = false;
    solved = false;
  }

  function resetSession() {
    problemsDone = 0;
    problemsCorrect = 0;
    hintsUsed = 0;
    problemIndex = 0;
    excludeStatements = [];
    problem = null;
    problemError = null;
    summaryOpen = false;
    resetSolving();
  }

  async function loadProblem() {
    if (loadingProblem) return;
    loadingProblem = true;
    problemError = null;
    try {
      const p = await practiceMutation.mutateAsync({
        source,
        excludeStatements,
      });
      problem = p;
      excludeStatements = [...excludeStatements, p.problemStatement];
      resetSolving();
    } catch {
      problemError = "Couldn't create a practice problem. Please try again.";
    } finally {
      loadingProblem = false;
    }
  }

  $effect(() => {
    if (open && problem === null && !loadingProblem && !problemError) {
      void loadProblem();
    }
  });

  // Escape closes the panel (summary → panel).
  $effect(() => {
    if (!open) return;
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (summaryOpen) {
          closeFromSummary();
        } else {
          summaryOpen = true;
        }
      }
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  });

  function finishProblem(correct: boolean) {
    problemsDone += 1;
    if (correct) problemsCorrect += 1;
    solved = correct;
    revealed = true;
  }

  async function handleCheckStep() {
    if (!problem || checking) return;
    if (!explanation.trim() && !math.trim() && !result.trim()) return;

    const newStep: UserStep = {
      explanation: explanation.trim(),
      mathExpression: math.trim(),
      result: result.trim(),
    };
    const wasFinalStep = isFinalStep;
    checking = true;
    checkResult = null;

    try {
      const verdict = await verifyMutation.mutateAsync({
        problemStatement: problem.problemStatement,
        topicName: source.topicName,
        formula: source.formula,
        variables: source.variables,
        unit: source.unit,
        expectedSteps: problem.expectedSteps.map((s) => ({
          stepNumber: s.stepNumber,
          explanation: s.explanation,
          result: s.result,
        })),
        previouslyEnteredSteps: enteredSteps,
        newStep,
      });

      if (verdict.unavailable) {
        // Checker down — accept the step so practice isn't blocked.
        enteredSteps = [...enteredSteps, newStep];
        explanation = "";
        math = "";
        result = "";
        isFinalStep = false;
        checkResult = {
          isCorrect: true,
          feedback: "",
          suggestedStep: null,
          unavailable: true,
        };
        if (wasFinalStep) {
          // Never verified — count as attempted (not correct), still reveal the solution.
          finishProblem(false);
        }
        return;
      }

      if (verdict.isCorrect) {
        enteredSteps = [...enteredSteps, newStep];
        explanation = "";
        math = "";
        result = "";
        isFinalStep = false;
        if (wasFinalStep) {
          finishProblem(true);
        }
      } else {
        checkResult = {
          isCorrect: false,
          feedback: verdict.feedback || "This step doesn't look right — try again.",
          suggestedStep: verdict.suggestedStep,
        };
      }
    } catch {
      checkResult = {
        isCorrect: false,
        feedback: "Couldn't check this step — please try again.",
        suggestedStep: null,
        unavailable: true,
      };
    } finally {
      checking = false;
    }
  }

  function handleHint() {
    if (currentHint === null || revealedHints[currentStepNumber]) return;
    revealedHints[currentStepNumber] = true;
    hintsUsed += 1;
  }

  function handleShowSolution() {
    if (revealed) return;
    finishProblem(false);
  }

  async function handleNextProblem() {
    problemIndex += 1;
    problem = null;
    problemError = null;
    await loadProblem();
  }

  function handleRetry() {
    resetSolving();
  }

  function handleExit() {
    summaryOpen = true;
  }

  function closeFromSummary() {
    summaryOpen = false;
    onClose();
    resetSession();
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex justify-end">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-surface-950/70 backdrop-blur-sm animate-fade-in-up"
      style="animation-duration: 0.2s"
      role="presentation"
      onclick={() => (summaryOpen ? closeFromSummary() : handleExit())}
    ></div>

    <!-- Drawer -->
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Practice mode"
      class="animate-scale-in relative flex h-full w-full max-w-md flex-col border-l border-white/[0.08] bg-surface-900/95 shadow-2xl backdrop-blur-xl sm:max-w-lg"
      style="animation-duration: 0.25s"
    >
      <!-- Header -->
      <header class="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <div class="flex items-center gap-2">
          <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15">
            <svg class="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6.5 6.5h11v11h-11z" />
              <path d="M21 21l-4.35-4.35M11 8a2.5 2.5 0 0 0-2.5 2.5" />
            </svg>
          </span>
          <h2 class="font-display text-sm font-semibold text-surface-200">Practice Mode</h2>
          <span class="rounded-full bg-surface-800 px-2 py-0.5 text-[11px] font-medium text-surface-400">
            {problemsDone} done · {problemsCorrect} correct · {hintsUsed} hint{hintsUsed === 1 ? "" : "s"}
          </span>
        </div>
        <button
          onclick={handleExit}
          class="flex h-7 w-7 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-white/[0.06] hover:text-surface-200"
          title="Exit practice"
          aria-label="Exit practice"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <div class="flex-1 overflow-y-auto p-4">
        {#if summaryOpen}
          <!-- Exit summary -->
          <div class="flex h-full flex-col items-center justify-center gap-5 text-center">
            <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10">
              <svg class="h-8 w-8 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="8 12 11 15 16 9" />
              </svg>
            </div>
            <div>
              <h3 class="font-display text-lg font-semibold text-surface-100">Great work!</h3>
              <p class="mt-1 text-sm text-surface-500">Here's how your practice session went:</p>
            </div>
            <div class="grid w-full max-w-xs grid-cols-3 gap-2">
              <div class="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                <p class="text-2xl font-bold text-surface-100">{problemsDone}</p>
                <p class="text-[11px] text-surface-500">Attempted</p>
              </div>
              <div class="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
                <p class="text-2xl font-bold text-emerald-400">{problemsCorrect}</p>
                <p class="text-[11px] text-surface-500">Correct</p>
              </div>
              <div class="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
                <p class="text-2xl font-bold text-amber-400">{hintsUsed}</p>
                <p class="text-[11px] text-surface-500">Hints</p>
              </div>
            </div>
            <button
              onclick={closeFromSummary}
              class="rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-500/15 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Done
            </button>
          </div>

        {:else if loadingProblem || (!problem && !problemError)}
          <!-- Loading skeleton -->
          <div class="space-y-3">
            <div class="h-24 animate-pulse rounded-xl border border-white/[0.06] bg-surface-800/40" />
            <div class="h-40 animate-pulse rounded-xl border border-white/[0.06] bg-surface-800/40" />
            <div class="h-12 animate-pulse rounded-xl border border-white/[0.06] bg-surface-800/40" />
          </div>

        {:else if problemError}
          <!-- Error + retry -->
          <div class="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
              <svg class="h-7 w-7 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p class="text-sm text-surface-400">{problemError}</p>
            <button
              onclick={loadProblem}
              class="rounded-lg bg-brand-500/15 px-4 py-2 text-sm font-medium text-brand-300 transition-colors hover:bg-brand-500/25"
            >
              Try again
            </button>
          </div>

        {:else if problem}
          <div class="mb-3 flex items-center justify-between">
            <span class="text-xs font-medium text-surface-500">Problem {problemIndex + 1}</span>
            <span class="text-xs text-surface-500">
              {totalExpectedSteps > 0 ? `~${totalExpectedSteps} steps` : ""}
            </span>
          </div>

          <!-- Problem statement -->
          <div class="mb-4 rounded-xl border border-white/[0.08] bg-surface-950/50 p-4">
            <p class="text-sm leading-relaxed text-surface-200">{problem.problemStatement}</p>
          </div>

          {#if revealed}
            <!-- Solved / revealed -->
            <div class="mb-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
              <p class="flex items-center gap-2 font-display text-sm font-semibold text-emerald-300">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                {solved ? "Solved — nice work!" : "Solution revealed"}
              </p>
              {#if solved}
                <p class="mt-1 text-xs text-emerald-400/70">Your steps were verified correct. Here's the full worked solution.</p>
              {:else}
                <p class="mt-1 text-xs text-emerald-400/70">Review the full worked solution, then try another one.</p>
              {/if}
            </div>

            <!-- Answer banner -->
            <div class="mb-3 overflow-hidden rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/15 to-brand-500/10 px-4 py-3">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/80">Final Answer</p>
              <p class="flex flex-wrap items-baseline gap-x-1.5 text-lg font-semibold text-emerald-200">
                <MathTex tex={problem.finalAnswer} />
                {#if problem.unit}
                  <span class="text-base font-medium text-emerald-300/90">{problem.unit}</span>
                {/if}
              </p>
            </div>

            <!-- Full solution -->
            <div class="space-y-2">
              {#each problem.expectedSteps as step}
                <SolutionStepCard {step} />
              {/each}
            </div>

            <!-- Your steps (if any) -->
            {#if enteredSteps.length > 0}
              <div class="mt-4">
                <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-surface-500">Your steps</p>
                <ol class="space-y-1.5">
                  {#each enteredSteps as s, i}
                    <li class="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-surface-300">
                      <span class="mr-1.5 font-semibold text-emerald-400">{i + 1}.</span>
                      {s.explanation || s.mathExpression || s.result}
                    </li>
                  {/each}
                </ol>
              </div>
            {/if}

            <div class="mt-5 flex gap-2">
              <button
                onclick={handleNextProblem}
                disabled={loadingProblem}
                class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-500/15 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
              >
                {loadingProblem ? "Loading…" : "Next Problem"}
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
              {#if !solved}
                <button
                  onclick={handleRetry}
                  class="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-surface-300 transition-colors hover:bg-white/[0.08]"
                >
                  Retry
                </button>
              {/if}
            </div>

          {:else}
            <!-- Step entry -->
            <div class="mb-2 flex items-center justify-between">
              <span class="text-xs font-medium text-surface-400">
                Step {currentStepNumber}{totalExpectedSteps > 0 ? ` of ~${totalExpectedSteps}` : ""}
              </span>
              {#if enteredSteps.length > 0}
                <span class="text-[11px] text-surface-600">{enteredSteps.length} step{enteredSteps.length === 1 ? "" : "s"} done</span>
              {/if}
            </div>

            <div class="space-y-3 rounded-xl border border-white/[0.08] bg-surface-950/40 p-4">
              <textarea
                bind:value={explanation}
                rows={2}
                autofocus
                class="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-surface-200 outline-none transition-all placeholder:text-surface-600 focus:border-brand-500/40"
                placeholder="What do you do in this step?"
              ></textarea>

              <div class="flex gap-2">
                <input
                  bind:value={math}
                  class="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-sm text-brand-300 outline-none transition-all placeholder:text-surface-600 focus:border-brand-500/40"
                  placeholder="Math (e.g., v = 240 / 3)"
                />
                <input
                  bind:value={result}
                  class="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-sm text-emerald-300 outline-none transition-all placeholder:text-surface-600 focus:border-brand-500/40"
                  placeholder="Result (e.g., v = 80)"
                />
              </div>

              <label class="flex cursor-pointer select-none items-center gap-2 text-xs text-surface-400">
                <input type="checkbox" bind:checked={isFinalStep} class="h-3.5 w-3.5 accent-emerald-500" />
                This is my final step
              </label>

              <div class="flex items-center gap-2">
                <button
                  onclick={handleCheckStep}
                  disabled={checking || (!explanation.trim() && !math.trim() && !result.trim())}
                  class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-500/15 transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {#if checking}
                    <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Checking…
                  {:else}
                    Check Step
                  {/if}
                </button>

                <button
                  onclick={handleHint}
                  disabled={currentHint === null || revealedHints[currentStepNumber]}
                  title={revealedHints[currentStepNumber] ? "Hint already revealed" : "Reveal a hint"}
                  class="flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-300 transition-all hover:bg-amber-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 18h6" />
                    <path d="M10 22h4" />
                    <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z" />
                  </svg>
                  Hint
                </button>
              </div>

              {#if revealedHints[currentStepNumber] && currentHint}
                <div class="animate-scale-in rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5 text-xs text-amber-200/90" style="animation-duration: 0.2s">
                  <span class="mr-1.5 font-semibold text-amber-300">💡 Hint:</span>
                  {currentHint}
                </div>
              {/if}

              {#if checkResult}
                {#if checkResult.isCorrect}
                  <p class="text-xs text-emerald-400">✅ Step accepted{checkResult.unavailable ? " (checker was unavailable — saved without a verdict)" : ""}.</p>
                {:else}
                  <div class="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5 text-xs text-amber-300">
                    <p class="font-medium">⚠ {checkResult.feedback}</p>
                    {#if checkResult.suggestedStep}
                      <div class="mt-2 rounded border border-white/[0.08] bg-surface-950/60 p-2.5 text-surface-300">
                        <p class="mb-1 font-medium text-brand-300">Suggested correct step:</p>
                        {#if checkResult.suggestedStep.explanation}
                          <p class="leading-relaxed">{checkResult.suggestedStep.explanation}</p>
                        {/if}
                        {#if checkResult.suggestedStep.mathExpression}
                          <code class="mt-1 block rounded bg-surface-950 px-2 py-0.5 font-mono text-brand-300">{checkResult.suggestedStep.mathExpression}</code>
                        {/if}
                        {#if checkResult.suggestedStep.result}
                          <p class="mt-1">Result: <span class="font-mono text-emerald-300">{checkResult.suggestedStep.result}</span></p>
                        {/if}
                      </div>
                    {/if}
                  </div>
                {/if}
              {/if}
            </div>

            <button
              onclick={handleShowSolution}
              class="mt-3 w-full text-center text-xs font-medium text-surface-500 transition-colors hover:text-surface-300"
            >
              Stuck? Show the full solution
            </button>
          {/if}
        {/if}
      </div>
    </div>
  </div>
{/if}
