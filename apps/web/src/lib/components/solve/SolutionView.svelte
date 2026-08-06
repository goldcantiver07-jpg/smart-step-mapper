<script lang="ts">
  import { orpc } from "$lib/orpc";
  import { createMutation } from "@tanstack/svelte-query";
  import { goto } from "$app/navigation";
  import MathTex from "$lib/components/MathTex.svelte";
  import SolutionStepCard from "./SolutionStepCard.svelte";
  import type { GenerateResult, ConfirmedProblem } from "./SolutionTypes";

  let {
    solution,
    confirmed,
    onBack,
    onPractice,
  }: {
    solution: GenerateResult & { topicId?: string | null; topicName: string };
    confirmed: ConfirmedProblem;
    onBack: () => void;
    onPractice: () => void;
  } = $props();

  const saveMutation = createMutation(() =>
    orpc.solve.saveToMap.mutationOptions({
      onSuccess: (data) => goto(`/maps/${data.mapId}`),
      onError: (e) => {
        saveError = e instanceof Error ? e.message : "Couldn't save the map. Please try again.";
      },
    }),
  );

  let saveError = $state<string | null>(null);

  const methodTabs = $derived([
    solution.method || "Standard",
    ...solution.alternativeMethods.map((a) => a.method),
  ]);

  let activeMethod = $state(0);

  const activeSteps = $derived(
    activeMethod === 0
      ? solution.steps
      : (solution.alternativeMethods[activeMethod - 1]?.steps ?? solution.steps),
  );

  function handleSave() {
    saveError = null;
    saveMutation.mutate({
      topicName: confirmed.topicName,
      title: solution.title?.trim() || confirmed.problemStatement.slice(0, 80),
      problemStatement: confirmed.problemStatement,
      formula: confirmed.formula,
      variables: confirmed.variables,
      unknown: confirmed.unknown,
      unit: solution.unit || confirmed.unit,
      finalAnswer: solution.finalAnswer,
      method: solution.method || "Standard",
      alternativeMethods: solution.alternativeMethods,
      steps: solution.steps,
    });
  }
</script>

<div class="animate-fade-in-up stagger-1">
  <!-- Problem header -->
  <div class="mb-4 flex items-start justify-between gap-3">
    <div class="min-w-0">
      <div class="mb-1.5 flex flex-wrap items-center gap-2">
        <span class="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-xs text-brand-300">
          {confirmed.topicName}
        </span>
        {#if solution.unit}
          <span class="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-300">
            unit: {solution.unit}
          </span>
        {/if}
      </div>
      <h2 class="font-display text-base font-semibold leading-snug text-surface-100">
        {confirmed.problemStatement}
      </h2>
    </div>
    <button
      onclick={onBack}
      class="shrink-0 text-xs font-medium text-surface-500 transition-colors hover:text-surface-300"
    >
      ← Edit problem
    </button>
  </div>

  <!-- Final answer banner -->
  <div class="mb-4 overflow-hidden rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-brand-500/10">
    <div class="flex items-center gap-3 px-4 py-3.5">
      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
        <svg class="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </span>
      <div class="min-w-0">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/80">Final Answer</p>
        <p class="flex flex-wrap items-baseline gap-x-1.5 text-lg font-semibold text-emerald-200">
          <MathTex tex={solution.finalAnswer} />
          {#if solution.unit}
            <span class="text-base font-medium text-emerald-300/90">{solution.unit}</span>
          {/if}
        </p>
      </div>
    </div>
  </div>

  <!-- Warnings -->
  {#if solution.warnings.length > 0}
    <div class="mb-4 space-y-1.5 rounded-lg border border-amber-500/15 bg-amber-500/[0.04] px-3 py-2.5">
      {#each solution.warnings as w}
        <p class="flex items-start gap-2 text-xs text-amber-300/80">
          <svg class="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {w}
        </p>
      {/each}
    </div>
  {/if}

  <!-- Method tabs -->
  {#if methodTabs.length > 1}
    <div class="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Solution methods">
      {#each methodTabs as method, i}
        <button
          role="tab"
          aria-selected={activeMethod === i}
          onclick={() => (activeMethod = i)}
          class="rounded-lg px-3 py-1.5 text-xs font-medium transition-all {activeMethod === i
            ? 'bg-brand-500/15 text-brand-300 shadow-[0_0_0_1px_rgba(12,142,233,0.3)]'
            : 'border border-white/[0.08] bg-white/[0.03] text-surface-400 hover:bg-white/[0.06] hover:text-surface-200'}"
        >
          {method}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Steps -->
  <div class="space-y-2.5">
    {#each activeSteps as step}
      <SolutionStepCard {step} />
    {/each}
  </div>

  <!-- Actions -->
  <div class="mt-6 flex flex-col gap-2.5 sm:flex-row">
    <button
      onclick={handleSave}
      disabled={saveMutation.isPending}
      class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-500/15 transition-all hover:shadow-brand-500/25 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {#if saveMutation.isPending}
        <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Saving…
      {:else}
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        Save as Map
      {/if}
    </button>

    <button
      onclick={onPractice}
      class="flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300 transition-all hover:bg-emerald-500/20 active:scale-[0.98]"
    >
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6.5 6.5h11v11h-11z" />
        <path d="M21 21l-4.35-4.35M11 8a2.5 2.5 0 0 0-2.5 2.5" />
      </svg>
      Practice similar problems
    </button>
  </div>

  {#if saveError}
    <p class="mt-3 text-center text-xs text-red-400">{saveError}</p>
  {/if}
</div>
