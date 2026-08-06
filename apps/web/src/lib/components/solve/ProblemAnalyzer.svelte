<script lang="ts">
  import { orpc } from "$lib/orpc";
  import { createQuery, createMutation } from "@tanstack/svelte-query";
  import type { ConfirmedProblem, GenerateResult } from "./SolutionTypes";

  let {
    onSubmit,
  }: {
    onSubmit: (
      result: GenerateResult & { topicId?: string | null; topicName: string },
      confirmed: ConfirmedProblem,
    ) => void;
  } = $props();

  const topicsQuery = createQuery(() => orpc.topics.list.queryOptions());
  const analyzeMutation = createMutation(() => orpc.solve.analyze.mutationOptions());
  const generateMutation = createMutation(() => orpc.solve.generate.mutationOptions());

  type AnalyzeOutput = {
    topicId: string | null;
    topicName: string | null;
    formula: string;
    variables: string;
    unknown: string;
    unit: string;
    assumptions: string[];
    warnings: string[];
    needsClarification: string[];
  };

  // ── Problem entry ──
  let problemStatement = $state("");
  let analyzing = $state(false);
  let error = $state<string | null>(null);

  // ── Analysis / confirmation state ──
  let analysis = $state<AnalyzeOutput | null>(null);
  let clarificationInput = $state("");

  // Editable confirmation fields
  let topicName = $state("");
  let formula = $state("");
  let variables = $state("");
  let unknown = $state("");
  let unit = $state("");
  let generating = $state(false);
  let generateError = $state<string | null>(null);

  const needsClarification = $derived(analysis?.needsClarification?.length ? analysis.needsClarification : []);

  async function handleAnalyze() {
    const statement = problemStatement.trim();
    if (!statement || analyzing) return;
    analyzing = true;
    error = null;
    analysis = null;
    generateError = null;
    try {
      // When re-running from the clarification flow, append the user's answers.
      const fullStatement = clarificationInput.trim()
        ? `${statement}\n\nAdditional details: ${clarificationInput.trim()}`
        : statement;
      const result = await analyzeMutation.mutateAsync({ problemStatement: fullStatement });
      analysis = result;
      topicName = result.topicName ?? "";
      formula = result.formula ?? "";
      variables = result.variables ?? "";
      unknown = result.unknown ?? "";
      unit = result.unit ?? "";
      clarificationInput = "";
      // The topic may have been auto-created — refresh the dropdown.
      topicsQuery.refetch();
    } catch (e) {
      error = e instanceof Error ? e.message : "Couldn't analyze the problem. Please try again.";
    } finally {
      analyzing = false;
    }
  }

  function backToEntry() {
    analysis = null;
    generateError = null;
  }

  async function handleGenerate() {
    const confirmed: ConfirmedProblem = {
      problemStatement: problemStatement.trim(),
      topicName: topicName.trim(),
      formula: formula.trim(),
      variables: variables.trim(),
      unknown: unknown.trim(),
      unit: unit.trim(),
    };
    if (!confirmed.problemStatement || !confirmed.topicName || generating) return;
    generating = true;
    generateError = null;
    try {
      const result = await generateMutation.mutateAsync(confirmed);
      onSubmit(result, confirmed);
    } catch (e) {
      generateError =
        e instanceof Error ? e.message : "Couldn't generate the solution. Please try again.";
    } finally {
      generating = false;
    }
  }

  const allTopicNames = $derived([
    ...new Set(
      [...(topicsQuery.data ?? []).map((t) => t.name), topicName].filter((n) => n.trim().length > 0),
    ),
  ]);
</script>

<div class="rounded-xl border border-white/[0.08] bg-surface-900/40 p-5">
  <div class="mb-4 flex items-center gap-2">
    <span class="flex h-6 w-6 items-center justify-center rounded-md bg-brand-500/10">
      <svg class="h-3.5 w-3.5 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
      </svg>
    </span>
    <h2 class="font-display text-sm font-semibold text-surface-200">Describe the problem</h2>
  </div>

  {#if !analysis}
    <textarea
      bind:value={problemStatement}
      rows={4}
      class="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-surface-200 outline-none transition-all placeholder:text-surface-600 focus:border-brand-500/40 focus:bg-brand-500/[0.04]"
      placeholder="Describe the problem, e.g. “A car travels 120 km in 2 hours. What is its average speed?”"
    ></textarea>

    {#if error}
      <div class="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-sm text-red-400">
        <p>{error}</p>
        <button
          onclick={handleAnalyze}
          disabled={analyzing}
          class="mt-2 rounded-md bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
        >
          {analyzing ? "Analyzing..." : "Try again"}
        </button>
      </div>
    {/if}

    <button
      onclick={handleAnalyze}
      disabled={!problemStatement.trim() || analyzing}
      class="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-500/15 transition-all hover:shadow-brand-500/25 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {#if analyzing}
        <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Analyzing…
      {:else}
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Analyze
      {/if}
    </button>
  {:else if needsClarification.length > 0}
    <div class="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
      <h3 class="flex items-center gap-2 text-sm font-semibold text-amber-300">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        A bit more info is needed
      </h3>
      <ul class="mt-2 space-y-1.5">
        {#each needsClarification as q}
          <li class="flex items-start gap-2 text-sm text-amber-200/90">
            <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            {q}
          </li>
        {/each}
      </ul>
      <textarea
        bind:value={clarificationInput}
        rows={2}
        class="mt-3 w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-surface-200 outline-none transition-all placeholder:text-surface-600 focus:border-amber-500/40"
        placeholder="Add the missing details (or edit the problem below), then re-analyze…"
      ></textarea>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          onclick={handleAnalyze}
          disabled={analyzing}
          class="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-amber-500/15 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
        >
          {analyzing ? "Analyzing…" : "Re-analyze"}
        </button>
        <button
          onclick={backToEntry}
          class="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-surface-300 transition-colors hover:bg-white/[0.08]"
        >
          Back
        </button>
      </div>
      {#if error}
        <p class="mt-3 text-xs text-red-400">{error}</p>
      {/if}
    </div>
  {:else}
    <!-- Parsed details — editable confirmation strip -->
    <div class="rounded-lg border border-white/[0.08] bg-surface-950/40 p-4">
      <div class="mb-3 flex items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-surface-200">Parsed details — review &amp; edit</h3>
        <button
          onclick={backToEntry}
          class="text-xs font-medium text-surface-500 transition-colors hover:text-surface-300"
        >
          ← Edit problem
        </button>
      </div>

      <div class="space-y-3">
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="space-y-1">
            <label class="text-xs font-medium text-surface-500" for="ai-topic">Topic</label>
            <input
              id="ai-topic"
              bind:value={topicName}
              list="ai-topic-options"
              class="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-surface-200 outline-none transition-all placeholder:text-surface-600 focus:border-brand-500/40"
              placeholder="e.g., Physics"
            />
            <datalist id="ai-topic-options">
              {#each allTopicNames as name}
                <option value={name} />
              {/each}
            </datalist>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-medium text-surface-500" for="ai-unit">Answer unit</label>
            <input
              id="ai-unit"
              bind:value={unit}
              class="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-sm text-surface-200 outline-none transition-all placeholder:text-surface-600 focus:border-brand-500/40"
              placeholder="e.g., km/h (blank if none)"
            />
          </div>
        </div>

        <div class="space-y-1">
          <label class="text-xs font-medium text-surface-500" for="ai-formula">Formula</label>
          <input
            id="ai-formula"
            bind:value={formula}
            class="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-sm text-brand-300 outline-none transition-all placeholder:text-surface-600 focus:border-brand-500/40"
            placeholder="e.g., v = d / t"
          />
        </div>

        <div class="space-y-1">
          <label class="text-xs font-medium text-surface-500" for="ai-variables">Variables / givens</label>
          <input
            id="ai-variables"
            bind:value={variables}
            class="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-sm text-amber-300 outline-none transition-all placeholder:text-surface-600 focus:border-brand-500/40"
            placeholder="e.g., d = 120 km, t = 2 h"
          />
        </div>

        <div class="space-y-1">
          <label class="text-xs font-medium text-surface-500" for="ai-unknown">Unknown (what's asked)</label>
          <input
            id="ai-unknown"
            bind:value={unknown}
            class="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-surface-200 outline-none transition-all placeholder:text-surface-600 focus:border-brand-500/40"
            placeholder="e.g., average speed v"
          />
        </div>

        {#if (analysis?.assumptions ?? []).length || (analysis?.warnings ?? []).length}
          <div class="space-y-1.5 rounded-lg border border-amber-500/15 bg-amber-500/[0.04] p-3">
            {#each analysis?.assumptions ?? [] as a}
              <p class="flex items-start gap-2 text-xs text-amber-300/90">
                <svg class="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                {a}
              </p>
            {/each}
            {#each analysis?.warnings ?? [] as w}
              <p class="flex items-start gap-2 text-xs text-amber-300/70">
                <span class="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                {w}
              </p>
            {/each}
          </div>
        {/if}
      </div>

      {#if generateError}
        <div class="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-sm text-red-400">
          {generateError}
        </div>
      {/if}

      <button
        onclick={handleGenerate}
        disabled={!topicName.trim() || !problemStatement.trim() || generating}
        class="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-500/15 transition-all hover:shadow-brand-500/25 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {#if generating}
          <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Generating…
        {:else}
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
          </svg>
          Generate Solution
        {/if}
      </button>
      {#if !topicName.trim()}
        <p class="mt-2 text-center text-xs text-surface-500">Pick or type a topic to generate a solution.</p>
      {/if}
    </div>
  {/if}
</div>
