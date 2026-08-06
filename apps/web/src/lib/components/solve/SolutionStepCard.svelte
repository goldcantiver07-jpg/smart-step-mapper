<script lang="ts">
  import MathTex from "$lib/components/MathTex.svelte";
  import type { GeneratedStep } from "./SolutionTypes";

  let {
    step,
    defaultOpen = true,
  }: {
    step: GeneratedStep;
    defaultOpen?: boolean;
  } = $props();

  let open = $state(defaultOpen);
</script>

<div class="overflow-hidden rounded-xl border border-white/[0.08] bg-surface-900/40 transition-colors hover:border-white/[0.14]">
  <button
    onclick={() => (open = !open)}
    aria-expanded={open}
    class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
  >
    <span
      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-500/30 bg-brand-500/10 text-xs font-bold text-brand-400"
    >
      {step.stepNumber}
    </span>
    <span class="min-w-0 flex-1 text-sm font-medium text-surface-200">
      {step.explanation || `Step ${step.stepNumber}`}
    </span>
    <svg
      class="h-4 w-4 shrink-0 text-surface-600 transition-transform duration-200 {open ? 'rotate-180' : ''}"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  </button>

  {#if open}
    <div class="space-y-3 border-t border-white/[0.06] px-4 py-3.5">
      {#if step.formulaUsed}
        <div>
          <p class="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-surface-500">Formula used</p>
          <MathTex tex={step.formulaUsed} />
        </div>
      {/if}

      {#if step.variablesUsed}
        <div>
          <p class="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-surface-500">Variables</p>
          <p class="font-mono text-sm text-surface-300">{step.variablesUsed}</p>
        </div>
      {/if}

      {#if step.substitution}
        <div>
          <p class="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-surface-500">Substitution</p>
          <MathTex tex={step.substitution} />
        </div>
      {/if}

      {#if step.calculation}
        <div>
          <p class="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-surface-500">Calculation</p>
          <MathTex tex={step.calculation} />
        </div>
      {/if}

      {#if step.result}
        <div>
          <p class="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-surface-500">Result</p>
          <MathTex tex={step.result} />
        </div>
      {/if}

      {#if !step.formulaUsed && !step.variablesUsed && !step.substitution && !step.calculation && !step.result}
        <p class="text-xs text-surface-500">No math breakdown for this step.</p>
      {/if}
    </div>
  {/if}
</div>
