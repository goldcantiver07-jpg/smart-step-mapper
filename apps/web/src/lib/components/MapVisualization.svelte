<script lang="ts">
  type StepData = {
    id: string;
    stepNumber: number;
    explanation: string;
    mathExpression: string;
    result: string;
    isCorrect: string;
    feedback: string;
  };

  let {
    steps: steps_list,
    currentStep,
  }: {
    steps: StepData[];
    currentStep?: number;
  } = $props();
</script>

<div class="overflow-x-auto py-4">
  <div class="flex items-start gap-2">
    {#each steps_list as step, i}
      <div class="flex flex-col items-center">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold
            {step.isCorrect === 'correct' ? 'bg-green-600 text-white' :
              step.isCorrect === 'incorrect' ? 'bg-red-600 text-white' :
              step.stepNumber === (currentStep ?? -1) ? 'bg-blue-600 text-white' :
              'bg-neutral-800 text-neutral-300'}"
        >
          {step.stepNumber}
        </div>
        <div
          class="mt-1 max-w-[140px] truncate rounded bg-neutral-900 px-2 py-1 text-xs text-neutral-400"
        >
          {step.explanation || step.mathExpression || `Step ${step.stepNumber}`}
        </div>
        {#if i < steps_list.length - 1}
          <div class="mt-1 h-8 w-0.5 bg-neutral-700"></div>
          <div class="text-xs text-neutral-600">▼</div>
        {/if}
      </div>
    {/each}
  </div>
</div>
