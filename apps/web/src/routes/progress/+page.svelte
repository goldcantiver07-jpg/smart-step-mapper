<script lang="ts">
  import { orpc } from "$lib/orpc";
  import { createQuery } from "@tanstack/svelte-query";
  import { goto } from "$app/navigation";

  const summaryQuery = createQuery(() => orpc.progress.summary.queryOptions());
</script>

<div class="mx-auto max-w-3xl px-4 py-6">
  <h1 class="mb-6 text-2xl font-bold">My Progress</h1>

  {#if summaryQuery.isLoading}
    <div class="text-center text-neutral-500">Loading progress...</div>
  {:else if summaryQuery.data}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 text-center">
        <div class="text-3xl font-bold text-blue-400">{summaryQuery.data.totalMaps}</div>
        <div class="mt-1 text-sm text-neutral-400">Total Maps</div>
      </div>
      <div class="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 text-center">
        <div class="text-3xl font-bold text-purple-400">{summaryQuery.data.totalSteps}</div>
        <div class="mt-1 text-sm text-neutral-400">Total Steps</div>
      </div>
      <div class="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 text-center">
        <div class="text-3xl font-bold text-green-400">{summaryQuery.data.correctSteps}</div>
        <div class="mt-1 text-sm text-neutral-400">Correct Steps</div>
      </div>
      <div class="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 text-center">
        <div class="text-3xl font-bold text-yellow-400">{summaryQuery.data.accuracy}%</div>
        <div class="mt-1 text-sm text-neutral-400">Accuracy</div>
      </div>
    </div>

    {#if summaryQuery.data.totalSteps > 0}
      <div class="mt-8">
        <h2 class="mb-3 text-lg font-medium">Accuracy Breakdown</h2>
        <div class="mb-2 flex items-center justify-between text-sm text-neutral-400">
          <span>Correct: {summaryQuery.data.correctSteps}</span>
          <span>Incorrect: {summaryQuery.data.incorrectSteps}</span>
        </div>
        <div class="h-4 overflow-hidden rounded-full bg-neutral-800">
          <div
            class="h-full rounded-full bg-gradient-to-r from-green-500 to-yellow-500 transition-all"
            style="width: {summaryQuery.data.accuracy}%"
          ></div>
        </div>
      </div>
    {/if}

    {#if summaryQuery.data.totalMaps === 0}
      <div class="mt-12 text-center">
        <p class="mb-3 text-neutral-500">No activity yet. Start solving problems to see your progress!</p>
        <button
          onclick={() => goto("/create")}
          class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Create Your First Map
        </button>
      </div>
    {/if}
  {/if}
</div>
