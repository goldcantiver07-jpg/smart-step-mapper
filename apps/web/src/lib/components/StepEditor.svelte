<script lang="ts">
  import { orpc } from "$lib/orpc";
  import { createMutation } from "@tanstack/svelte-query";

  let {
    mapId,
    stepNumber,
    onStepSaved,
  }: {
    mapId: string;
    stepNumber: number;
    onStepSaved?: (step: { stepNumber: number; explanation: string; mathExpression: string; result: string }) => void;
  } = $props();

  let explanation = $state("");
  let mathExpression = $state("");
  let result = $state("");

  const addStepMutation = createMutation(() => orpc.maps.addStep.mutationOptions());

  async function handleSave() {
    if (!explanation && !mathExpression && !result) return;
    const step = await addStepMutation.mutateAsync({
      mapId,
      stepNumber,
      explanation,
      mathExpression,
      result,
    });
    onStepSaved?.(step);
    explanation = "";
    mathExpression = "";
    result = "";
  }
</script>

<div class="rounded-lg border border-neutral-800 bg-neutral-900/30 p-4">
  <h3 class="mb-3 font-medium">Step {stepNumber}</h3>

  <div class="mb-3">
    <label class="mb-1 block text-xs text-neutral-400">Explanation</label>
    <textarea
      bind:value={explanation}
      rows={2}
      class="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      placeholder="What do you do in this step?"
    ></textarea>
  </div>

  <div class="mb-3">
    <label class="mb-1 block text-xs text-neutral-400">Math Expression</label>
    <input
      bind:value={mathExpression}
      class="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
      placeholder="e.g., x = (-5 + 7) / 2"
    />
  </div>

  <div class="mb-3">
    <label class="mb-1 block text-xs text-neutral-400">Result</label>
    <input
      bind:value={result}
      class="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
      placeholder="e.g., x = 1"
    />
  </div>

  <button
    onclick={handleSave}
    disabled={addStepMutation.isPending}
    class="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
  >
    {addStepMutation.isPending ? "Saving..." : "Add Step"}
  </button>
</div>
