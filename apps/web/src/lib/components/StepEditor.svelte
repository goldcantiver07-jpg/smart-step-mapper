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
  let skipVerification = $state(false);

  type SuggestedStep = { explanation: string; mathExpression: string; result: string };
  let verdictState = $state<"idle" | "verifying" | "correct" | "incorrect" | "unavailable">("idle");
  let feedback = $state("");
  let suggestedStep = $state<SuggestedStep | null>(null);
  let showSuggestion = $state(false);

  const addStepMutation = createMutation(() => orpc.maps.addStep.mutationOptions());
  const verifyNewStepMutation = createMutation(() => orpc.maps.verifyNewStep.mutationOptions());

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

    verdictState = "idle";
    feedback = "";
    suggestedStep = null;
    showSuggestion = false;

    if (skipVerification) return;

    verdictState = "verifying";
    try {
      const verdict = await verifyNewStepMutation.mutateAsync({ stepId: step.id, mode: "auto" });
      if (verdict.unavailable) {
        verdictState = "unavailable";
      } else {
        verdictState = verdict.isCorrect ? "correct" : "incorrect";
        feedback = verdict.feedback;
        suggestedStep = verdict.suggestedStep;
      }
    } catch {
      verdictState = "unavailable";
    }
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

  <div class="mt-3 flex items-center justify-between gap-2">
    <button
      onclick={handleSave}
      disabled={addStepMutation.isPending}
      class="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
    >
      {addStepMutation.isPending ? "Saving..." : "Add Step"}
    </button>

    <label class="flex cursor-pointer select-none items-center gap-1.5 text-xs text-neutral-400" title="Save this step without an AI check">
      <input type="checkbox" bind:checked={skipVerification} class="h-3.5 w-3.5 accent-blue-500" />
      Skip AI check
    </label>
  </div>

  {#if verdictState === "verifying"}
    <p class="mt-2 text-xs text-blue-400">Verifying this step…</p>
  {:else if verdictState === "correct"}
    <p class="mt-2 text-xs text-emerald-400">✅ This step looks correct.</p>
  {:else if verdictState === "incorrect"}
    <p class="mt-2 text-xs text-amber-400">⚠ {feedback || "This step doesn't look right."}</p>
    {#if suggestedStep}
      <button
        onclick={() => (showSuggestion = !showSuggestion)}
        class="mt-2 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
      >
        {showSuggestion ? "Hide suggested step" : "Show correct step"}
      </button>
      {#if showSuggestion}
        <div class="mt-2 rounded border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-neutral-300">
          <p class="mb-1 font-medium text-blue-300">Suggested correct step:</p>
          {#if suggestedStep.explanation}<p class="leading-relaxed">{suggestedStep.explanation}</p>{/if}
          {#if suggestedStep.mathExpression}<code class="mt-1 block rounded bg-neutral-950 px-2 py-0.5 font-mono text-blue-200">{suggestedStep.mathExpression}</code>{/if}
          {#if suggestedStep.result}<p class="mt-1">Result: <span class="font-mono text-emerald-300">{suggestedStep.result}</span></p>{/if}
        </div>
      {/if}
    {/if}
  {:else if verdictState === "unavailable"}
    <p class="mt-2 text-xs text-neutral-500">Couldn't verify this step — it was saved without a check.</p>
  {/if}
</div>
