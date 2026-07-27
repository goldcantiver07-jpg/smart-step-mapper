<script lang="ts">
  import { orpc } from "$lib/orpc";
  import { createQuery, createMutation } from "@tanstack/svelte-query";
  import { goto } from "$app/navigation";
  import StepEditor from "$lib/components/StepEditor.svelte";
  import MapVisualization from "$lib/components/MapVisualization.svelte";

  const topicsQuery = createQuery(() => orpc.topics.list.queryOptions());

  let topicId = $state("");
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

      <div class="mb-4">
        <label class="mb-1 block text-sm text-neutral-400">Topic</label>
        <select
          bind:value={topicId}
          class="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select a topic...</option>
          {#each topicsQuery.data ?? [] as topic}
            <option value={topic.id}>{topic.name}</option>
          {/each}
        </select>
      </div>

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
