<script lang="ts">
  import { orpc } from "$lib/orpc";
  import { createQuery, createMutation } from "@tanstack/svelte-query";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import StepEditor from "$lib/components/StepEditor.svelte";
  import MapVisualization from "$lib/components/MapVisualization.svelte";

  const topicsQuery = createQuery(() => orpc.topics.list.queryOptions());

  // ── Topic selection ──
  let topicId = $state("");
  let topicSearch = $state("");
  let preselected = $state(false);

  // Preselect a topic when arriving via ?topic=<name> (e.g. dashboard Quick Start cards)
  $effect(() => {
    const param = $page.url.searchParams.get("topic");
    const topics = topicsQuery.data;
    if (preselected || !param || !topics?.length) return;
    // Attempt the match only once per URL — don't re-evaluate on later refetches
    preselected = true;
    const normalized = param.trim().toLowerCase();
    const match =
      topics.find((t) => t.name.toLowerCase() === normalized) ??
      topics.find((t) => t.name.toLowerCase().includes(normalized));
    if (match) {
      topicId = match.id;
    }
  });

  const filteredTopics = $derived(
    (topicsQuery.data ?? []).filter(
      (t) =>
        !topicSearch ||
        t.name.toLowerCase().includes(topicSearch.toLowerCase()) ||
        t.description.toLowerCase().includes(topicSearch.toLowerCase()),
    ),
  );

  const selectedTopic = $derived(topicsQuery.data?.find((t) => t.id === topicId));

  let problemStatement = $state("");
  let formula = $state("");
  let variables = $state("");
  let title = $state("");
  let steps_list = $state<Array<{ stepNumber: number; explanation: string; mathExpression: string; result: string; isCorrect: string; feedback: string }>>([]);
  let currentStepNumber = $state(1);
  let createdMapId = $state<string | null>(null);

  const createMapMutation = createMutation(() => orpc.maps.create.mutationOptions({
    onSuccess: (data) => { createdMapId = data.id; },
  }));

  const addStepMutation = createMutation(() => orpc.maps.addStep.mutationOptions());

  async function handleCreateMap() {
    if (!topicId || !problemStatement) return;
    createMapMutation.mutate({
      topicId,
      problemStatement,
      formula,
      variables,
      title: title || problemStatement.slice(0, 80),
    });
  }

  async function handleAddStep(step: { explanation: string; mathExpression: string; result: string }) {
    if (!createdMapId) return;
    const saved = await addStepMutation.mutateAsync({
      mapId: createdMapId,
      stepNumber: currentStepNumber,
      ...step,
    });
    steps_list = [...steps_list, { ...saved, feedback: "", isCorrect: "unchecked" }];
    currentStepNumber++;
  }

  function handleStepVerified(index: number, isCorrect: boolean, feedback: string) {
    steps_list = steps_list.map((s, i) =>
      i === index ? { ...s, isCorrect: isCorrect ? "correct" : "incorrect", feedback } : s,
    );
  }

  $effect(() => {
    if (createdMapId) {
      goto(`/maps/${createdMapId}`);
    }
  });
</script>

<div class="mx-auto max-w-3xl px-4 py-6">
  <h1 class="mb-6 text-2xl font-bold">Create New Map</h1>

  {#if !createdMapId}
    <div class="mb-8 rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
      <h2 class="mb-4 text-lg font-medium">Problem Details</h2>

      <fieldset class="mb-4">
        <legend class="mb-1 flex items-center justify-between gap-2 text-sm text-neutral-400">
          <span>Topic</span>
          {#if selectedTopic}
            <span class="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400">
              <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              {selectedTopic.name}
            </span>
          {/if}
        </legend>

        {#if topicsQuery.isLoading}
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {#each { length: 4 } as _}
              <div class="h-[4.5rem] animate-pulse rounded-lg border border-neutral-800 bg-neutral-900/50"></div>
            {/each}
          </div>
        {:else if topicsQuery.isError}
          <div class="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            <p class="mb-2">Couldn't load topics. Please try again.</p>
            <button
              onclick={() => topicsQuery.refetch()}
              class="rounded bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20"
            >
              Retry
            </button>
          </div>
        {:else if (topicsQuery.data ?? []).length === 0}
          <div class="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 text-sm text-neutral-400">
            No topics available yet. Please try again later.
          </div>
        {:else}
          <div class="relative mb-3">
            <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              bind:value={topicSearch}
              type="search"
              placeholder="Search topics..."
              aria-label="Search topics"
              class="w-full rounded-lg border border-neutral-700 bg-neutral-900 py-2 pl-9 pr-3 text-sm placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {#if filteredTopics.length === 0}
            <div class="rounded-lg border border-dashed border-neutral-800 bg-neutral-900/30 p-4 text-center text-sm text-neutral-500">
              No topics match "{topicSearch}".
            </div>
          {:else}
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {#each filteredTopics as topic}
                <button
                  type="button"
                  onclick={() => {
                    topicId = topic.id;
                    preselected = true;
                  }}
                  aria-pressed={topicId === topic.id}
                  class="group relative rounded-lg border p-3 text-left transition-all duration-150 active:scale-[0.98] {topicId === topic.id
                    ? 'border-blue-500/60 bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]'
                    : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 hover:bg-neutral-900'}"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-sm font-medium {topicId === topic.id ? 'text-blue-300' : 'text-neutral-200'}">
                        {topic.name}
                      </p>
                      <p class="mt-0.5 line-clamp-2 text-xs leading-relaxed text-neutral-500">
                        {topic.description}
                      </p>
                    </div>
                    {#if topicId === topic.id}
                      <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </span>
                    {/if}
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        {/if}
      </fieldset>

      <div class="mb-4">
        <label class="mb-1 block text-sm text-neutral-400">Problem Statement</label>
        <textarea
          bind:value={problemStatement}
          rows={3}
          class="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Enter the math problem..."
        ></textarea>
      </div>

      <div class="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm text-neutral-400">Formula (optional)</label>
          <input
            bind:value={formula}
            class="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="e.g., x = (-b ± √(b² - 4ac)) / 2a"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm text-neutral-400">Variables (optional)</label>
          <input
            bind:value={variables}
            class="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="e.g., a=1, b=5, c=6"
          />
        </div>
      </div>

      <div class="mb-4">
        <label class="mb-1 block text-sm text-neutral-400">Title (optional)</label>
        <input
          bind:value={title}
          class="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Short title for your map"
        />
      </div>

      <button
        onclick={handleCreateMap}
        disabled={!topicId || !problemStatement || createMapMutation.isPending}
        class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {createMapMutation.isPending ? "Creating..." : "Create Map & Start Solving"}
      </button>
    </div>
  {/if}
</div>
