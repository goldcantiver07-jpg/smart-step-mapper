<script lang="ts">
  import { orpc } from "$lib/orpc";
  import { createQuery, createMutation } from "@tanstack/svelte-query";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import AIChatPanel from "$lib/components/AIChatPanel.svelte";

  // ── Route params ──
  const mapId = $derived($page.params.id ?? "");

  // ── Queries ──
  const mapQuery = createQuery(() => orpc.maps.getById.queryOptions({ input: { id: mapId } }));

  // ── Mutations ──
  const updateMapMutation = createMutation(() => orpc.maps.update.mutationOptions());
  const addStepMutation = createMutation(() => orpc.maps.addStep.mutationOptions());
  const verifyMutation = createMutation(() => orpc.maps.verifyStep.mutationOptions());

  // ── UI State ──
  let sidebarOpen = $state(true);
  let aiPanelOpen = $state(true);
  let selectedStepIndex = $state<number | undefined>(undefined);

  // Map edit form state
  let editTitle = $state("");
  let editProblem = $state("");
  let editFormula = $state("");
  let editVariables = $state("");

  // Step editor state
  let stepExplanation = $state("");
  let stepMathExpr = $state("");
  let stepResult = $state("");

  // Verification state
  let expectedResult = $state("");
  let userResult = $state("");
  let verificationResults = $state<Record<string, { isCorrect: boolean; feedback: string }>>({});

  // Sync edit form when map data loads (once, on initial load only)
  let initialized = $state(false);
  $effect(() => {
    if (!initialized && mapQuery.data) {
      editTitle = mapQuery.data.title;
      editProblem = mapQuery.data.problemStatement;
      editFormula = mapQuery.data.formula ?? "";
      editVariables = mapQuery.data.variables ?? "";
      initialized = true;
    }
  });

  const currentStepNumber = $derived((mapQuery.data?.steps.length ?? 0) + 1);
  const totalSteps = $derived(mapQuery.data?.steps.length ?? 0);
  const correctCount = $derived(mapQuery.data?.steps.filter((s) => s.isCorrect === "correct").length ?? 0);
  const progressPercent = $derived(totalSteps > 0 ? Math.round((correctCount / totalSteps) * 100) : 0);

  // ── Actions ──
  function handleSaveMap() {
    updateMapMutation.mutate({
      id: mapId,
      title: editTitle,
      problemStatement: editProblem,
      formula: editFormula,
      variables: editVariables,
    });
  }

  async function handleAddStep() {
    if (!stepExplanation && !stepMathExpr && !stepResult) return;
    await addStepMutation.mutateAsync({
      mapId,
      stepNumber: currentStepNumber,
      explanation: stepExplanation,
      mathExpression: stepMathExpr,
      result: stepResult,
    });
    stepExplanation = "";
    stepMathExpr = "";
    stepResult = "";
    mapQuery.refetch();
  }

  async function handleVerify(stepId: string) {
    if (!expectedResult || !userResult) return;
    const result = await verifyMutation.mutateAsync({
      stepId,
      expectedResult,
      userResult,
    });
    verificationResults[stepId] = result;
    mapQuery.refetch();
    expectedResult = "";
    userResult = "";
  }

  function handleSelectStep(index: number) {
    selectedStepIndex = selectedStepIndex === index ? undefined : index;
  }

  function handleStatusChange(status: string) {
    updateMapMutation.mutate({ id: mapId, status });
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "completed": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
      case "in_progress": return "bg-amber-500/15 text-amber-400 border-amber-500/25";
      case "review": return "bg-violet-500/15 text-violet-400 border-violet-500/25";
      default: return "bg-surface-800 text-surface-400 border-surface-700";
    }
  }

  const statusOptions = ["in_progress", "completed", "review"] as const;
  function statusLabel(s: string) {
    return s === "in_progress" ? "In Progress" : s === "completed" ? "Completed" : "Under Review";
  }
</script>

<svelte:head>
  <title>{mapQuery.data?.title ?? "Map Editor"} — Smart Step Mapper</title>
</svelte:head>

<!-- ===== BACKGROUND ===== -->
<div class="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
  <div class="animate-gradient absolute -left-[10%] -top-[20%] h-[60%] w-[50%] rounded-full bg-gradient-to-br from-brand-500/10 via-brand-600/5 to-transparent blur-[120px]" />
  <div class="absolute -bottom-[15%] -right-[10%] h-[50%] w-[40%] rounded-full bg-gradient-to-tl from-violet-500/10 via-purple-600/5 to-transparent blur-[100px]" />
  <div class="absolute inset-0 opacity-[0.02]"
    style="background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJmIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgbnVtT2N0YXZlcz0iMyIgc3R5bGU9ImZsb2NvbG9yOiB3aGl0ZTtjb2xvcjogd2hpdGUiLz48ZmVTY29yZWxpZ2h0aW5nIHJlc3VsdD0ic3R1ZmYiLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjZikiLz48L3N2Zz4=')" />
</div>

<!-- ===== LOADING STATE ===== -->
{#if mapQuery.isLoading}
  <div class="flex h-[calc(100vh-4rem)] items-center justify-center">
    <div class="flex flex-col items-center gap-4">
      <div class="h-10 w-10 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-400" />
      <p class="text-sm text-surface-500">Loading map...</p>
    </div>
  </div>

{:else if !mapQuery.data}
  <div class="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
    <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-800/50 text-surface-500">
      <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </div>
    <p class="text-surface-400">Map not found</p>
    <button onclick={() => goto("/maps")} class="text-sm text-brand-400 transition-colors hover:text-brand-300">
      &larr; Back to Maps
    </button>
  </div>

{:else}
  {@const map = mapQuery.data}

  <!-- ===== TOP BAR ===== -->
  <header class="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-surface-950/80 px-4 backdrop-blur-xl">
    <div class="flex items-center gap-3">
      <button
        onclick={() => goto("/maps")}
        class="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-white/[0.06] hover:text-surface-200"
        title="Back to Maps"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </button>

      <div class="h-5 w-px bg-white/[0.06]" />

      <!-- Status badge -->
      <select
        value={map.status}
        onchange={(e) => handleStatusChange((e.target as HTMLSelectElement).value)}
        class="rounded-lg border px-2.5 py-1 text-xs font-medium transition-all outline-none {getStatusColor(map.status)}"
      >
        {#each statusOptions as s}
          <option value={s} class="bg-surface-900">{statusLabel(s)}</option>
        {/each}
      </select>

      <span class="hidden text-xs text-surface-500 sm:inline">
        {totalSteps} step{totalSteps !== 1 ? "s" : ""}
      </span>
    </div>

    <div class="flex items-center gap-2">
      <!-- Progress indicator -->
      {#if totalSteps > 0}
        <div class="hidden items-center gap-2 md:flex">
          <div class="flex h-2 w-24 overflow-hidden rounded-full bg-surface-800">
            <div
              class="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-400 transition-all duration-500"
              style="width: {progressPercent}%"
            />
          </div>
          <span class="text-xs text-surface-500">{progressPercent}%</span>
        </div>
      {/if}

      <!-- Sidebar toggle -->
      <button
        onclick={() => (sidebarOpen = !sidebarOpen)}
        class="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-white/[0.06] hover:text-surface-200"
        title="Toggle sidebar"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      </button>

      <!-- AI Panel toggle -->
      <button
        onclick={() => (aiPanelOpen = !aiPanelOpen)}
        class="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-white/[0.06] hover:text-surface-200"
        title="Toggle AI Assistant"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </button>
    </div>
  </header>

  <!-- ===== MAIN THREE-PANEL LAYOUT ===== -->
  <div class="flex flex-1">
    <!-- ─── LEFT SIDEBAR: Map Details ─── -->
    <aside
      class="animate-scale-in stagger-1 w-72 shrink-0 overflow-y-auto border-r border-white/[0.06] bg-surface-950/50 transition-all duration-300 max-md:fixed max-md:inset-y-14 max-md:left-0 max-md:z-20 max-md:w-80 max-md:border-r max-md:bg-surface-900/95 max-md:backdrop-blur-xl {sidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'} {sidebarOpen ? '' : 'hidden md:hidden'}"
    >
      <div class="p-4">
        <div class="mb-5 flex items-center gap-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
            <svg class="h-3.5 w-3.5 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <h2 class="font-display text-sm font-semibold text-surface-200">Map Details</h2>
        </div>

        <!-- Map edit form -->
        <div class="space-y-4">
          <div class="space-y-1.5">
            <label for="editTitle" class="text-xs font-medium text-surface-500">Title</label>
            <input
              id="editTitle"
              bind:value={editTitle}
              class="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-surface-200 outline-none transition-all placeholder:text-surface-600 focus:border-brand-500/40 focus:bg-brand-500/[0.04] focus:shadow-[0_0_0_1px_rgba(12,142,233,0.15)]"
              placeholder="Map title"
            />
          </div>

          <div class="space-y-1.5">
            <label for="editProblem" class="text-xs font-medium text-surface-500">Problem Statement</label>
            <textarea
              id="editProblem"
              bind:value={editProblem}
              rows={3}
              class="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-surface-200 outline-none transition-all placeholder:text-surface-600 focus:border-brand-500/40 focus:bg-brand-500/[0.04] focus:shadow-[0_0_0_1px_rgba(12,142,233,0.15)]"
              placeholder="Describe the problem..."
            ></textarea>
          </div>

          <div class="space-y-1.5">
            <label for="editFormula" class="text-xs font-medium text-surface-500">Formula</label>
            <input
              id="editFormula"
              bind:value={editFormula}
              class="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-sm text-brand-300 outline-none transition-all placeholder:text-surface-600 focus:border-brand-500/40 focus:bg-brand-500/[0.04] focus:shadow-[0_0_0_1px_rgba(12,142,233,0.15)]"
              placeholder="e.g., x = (-b ± √(b² - 4ac)) / 2a"
            />
          </div>

          <div class="space-y-1.5">
            <label for="editVariables" class="text-xs font-medium text-surface-500">Variables</label>
            <input
              id="editVariables"
              bind:value={editVariables}
              class="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-sm text-amber-300 outline-none transition-all placeholder:text-surface-600 focus:border-brand-500/40 focus:bg-brand-500/[0.04] focus:shadow-[0_0_0_1px_rgba(12,142,233,0.15)]"
              placeholder="e.g., a=2, b=5, c=-3, x=?"
            />
          </div>

          <button
            onclick={handleSaveMap}
            disabled={updateMapMutation.isPending}
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-brand-500/15 transition-all hover:shadow-brand-500/25 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
          >
            {#if updateMapMutation.isPending}
              <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            {:else}
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save Changes
            {/if}
          </button>

          <!-- Stats -->
          <div class="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-surface-500">Statistics</h3>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs text-surface-400">Total Steps</span>
                <span class="text-sm font-medium text-surface-200">{totalSteps}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-surface-400">Correct</span>
                <span class="text-sm font-medium text-emerald-400">{correctCount}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-surface-400">Progress</span>
                <span class="text-sm font-medium text-brand-400">{progressPercent}%</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-surface-400">Status</span>
                <select
                  value={map.status}
                  onchange={(e) => handleStatusChange((e.target as HTMLSelectElement).value)}
                  class="rounded-md border border-white/[0.06] bg-surface-900 px-2 py-0.5 text-xs outline-none transition-colors focus:border-brand-500/40"
                >
                  {#each statusOptions as s}
                    <option value={s}>{statusLabel(s)}</option>
                  {/each}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- ─── CENTER: Canvas / Steps ─── -->
    <main class="flex flex-1 flex-col overflow-hidden">
      <!-- Toolbar -->
      <div class="flex items-center justify-between border-b border-white/[0.06] bg-surface-950/40 px-3 py-2">
        <div class="flex items-center gap-1">
          <!-- Add Step -->
          <button
            onclick={() => document.getElementById("step-editor")?.scrollIntoView({ behavior: "smooth" })}
            class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-surface-300 transition-colors hover:bg-brand-500/10 hover:text-brand-400"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Add Step
          </button>

          <div class="mx-1 h-4 w-px bg-white/[0.06]" />

          <!-- Zoom out -->
          <button class="flex h-7 w-7 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-white/[0.06] hover:text-surface-300" title="Zoom Out">
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="8" y1="11" x2="14" y2="11" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <span class="mx-1 min-w-[2.5rem] text-center text-xs text-surface-500">100%</span>
          <!-- Zoom in -->
          <button class="flex h-7 w-7 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-white/[0.06] hover:text-surface-300" title="Zoom In">
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>

        <!-- Right toolbar info -->
        {#if totalSteps > 0}
          <span class="text-xs text-surface-500">
            <span class="text-surface-400">{correctCount}</span> / {totalSteps} verified
          </span>
        {/if}
      </div>

      <!-- Steps Timeline -->
      <div class="flex-1 overflow-y-auto p-4 md:p-6">
        {#if totalSteps === 0}
          <!-- Empty state -->
          <div class="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div class="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-surface-700 bg-surface-900/30">
              <svg class="h-8 w-8 text-surface-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div>
              <h3 class="font-display text-lg font-semibold text-surface-200">Start Your Problem-Solving Journey</h3>
              <p class="mt-1 text-sm text-surface-500">Click "Add Step" to create your first step</p>
            </div>
          </div>
        {:else}
          <!-- Steps list -->
          <div class="mx-auto max-w-2xl space-y-3">
            {#each map.steps as step, i}
              {@const isSelected = selectedStepIndex === i}
              {@const isVerified = step.isCorrect !== "unchecked"}
              {@const isCorrect = step.isCorrect === "correct"}
              {@const canVerify = step.isCorrect === "unchecked" || (verificationResults[step.id] && !verificationResults[step.id].isCorrect)}

              <div
                class="animate-fade-in-up stagger-{Math.min(i + 1, 6)} group relative rounded-xl border border-white/[0.06] bg-surface-900/40 transition-all duration-200 hover:border-white/[0.10] {isSelected ? 'border-brand-500/30 bg-brand-500/[0.03]' : ''}"
                style={isSelected ? 'box-shadow: 0 0 0 1px rgba(12,142,233,0.15)' : ''}
              >
                <!-- Step Number badge -->
                <div class="absolute -left-3 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface-800 bg-surface-900 text-xs font-bold {isCorrect ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'text-surface-400'}">
                  {step.stepNumber}
                </div>

                <!-- Vertical connector line -->
                {#if i < map.steps.length - 1}
                  <div class="absolute left-0.5 top-[2.25rem] bottom-0 w-0.5 translate-x-[0.5625rem] bg-gradient-to-b from-white/[0.06] to-white/[0.02]" />
                {/if}

                <button
                  onclick={() => handleSelectStep(i)}
                  class="flex w-full items-start gap-3 px-4 py-3 text-left"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                      <h4 class="text-sm font-medium text-surface-200">Step {step.stepNumber}</h4>
                      <span
                        class="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider
                          {isCorrect ? 'bg-emerald-500/15 text-emerald-400' :
                            step.isCorrect === 'incorrect' ? 'bg-red-500/15 text-red-400' :
                            'bg-surface-800 text-surface-500'}"
                      >
                        {isCorrect ? "Correct" : step.isCorrect === "incorrect" ? "Incorrect" : "Open"}
                      </span>
                    </div>
                    {#if step.explanation}
                      <p class="mt-1 text-sm leading-relaxed text-surface-400">{step.explanation}</p>
                    {/if}
                    {#if step.mathExpression}
                      <code class="mt-1.5 inline-block rounded-md bg-surface-950 px-2.5 py-1 font-mono text-sm text-brand-300">{step.mathExpression}</code>
                    {/if}
                    {#if step.result}
                      <p class="mt-1.5 text-sm">
                        <span class="text-surface-500">Result: </span>
                        <span class="font-mono text-emerald-300">{step.result}</span>
                      </p>
                    {/if}
                  </div>

                  <!-- Expand indicator -->
                  <svg
                    class="mt-0.5 h-4 w-4 shrink-0 text-surface-600 transition-transform duration-200 {isSelected ? 'rotate-180' : ''}"
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

                <!-- Expanded: Verification -->
                {#if isSelected}
                  <div class="border-t border-white/[0.06] px-4 pb-4 pt-3">
                    {#if step.feedback}
                      <div class="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                        <span class="font-medium">Feedback:</span> {step.feedback}
                      </div>
                    {/if}

                    {#if canVerify}
                      <div class="space-y-2">
                        <div class="flex gap-2">
                          <input
                            bind:value={expectedResult}
                            placeholder="Expected result"
                            class="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-xs text-surface-200 outline-none transition-all placeholder:text-surface-600 focus:border-brand-500/40"
                          />
                          <input
                            bind:value={userResult}
                            placeholder="Your result"
                            class="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-xs text-surface-200 outline-none transition-all placeholder:text-surface-600 focus:border-brand-500/40"
                          />
                          <button
                            onclick={() => handleVerify(step.id)}
                            disabled={verifyMutation.isPending || !expectedResult || !userResult}
                            class="shrink-0 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-3 py-2 text-xs font-medium text-white shadow-lg shadow-brand-500/10 transition-all hover:shadow-brand-500/20 hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
                          >
                            {verifyMutation.isPending ? "..." : "Verify"}
                          </button>
                        </div>
                      </div>
                    {:else if isCorrect}
                      <div class="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2">
                        <svg class="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span class="text-xs text-emerald-400">Verified correct</span>
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        <!-- Step Editor Form -->
        <div id="step-editor" class="mx-auto mt-8 max-w-2xl animate-fade-in-up stagger-3">
          <div class="rounded-xl border border-white/[0.08] bg-surface-900/30 p-5">
            <div class="mb-4 flex items-center gap-2">
              <div class="flex h-6 w-6 items-center justify-center rounded-md bg-brand-500/10">
                <svg class="h-3.5 w-3.5 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <h3 class="font-display text-sm font-semibold text-surface-200">New Step #{currentStepNumber}</h3>
            </div>

            <div class="space-y-3">
              <textarea
                bind:value={stepExplanation}
                rows={2}
                class="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-surface-200 outline-none transition-all placeholder:text-surface-600 focus:border-brand-500/40 focus:bg-brand-500/[0.04]"
                placeholder="What do you do in this step?"
              ></textarea>

              <div class="flex gap-2">
                <input
                  bind:value={stepMathExpr}
                  class="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-sm text-brand-300 outline-none transition-all placeholder:text-surface-600 focus:border-brand-500/40 focus:bg-brand-500/[0.04]"
                  placeholder="e.g., x = (-5 + 7) / 2"
                />
                <input
                  bind:value={stepResult}
                  class="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-sm text-emerald-300 outline-none transition-all placeholder:text-surface-600 focus:border-brand-500/40 focus:bg-brand-500/[0.04]"
                  placeholder="e.g., x = 1"
                />
              </div>

              <button
                onclick={handleAddStep}
                disabled={addStepMutation.isPending || (!stepExplanation && !stepMathExpr && !stepResult)}
                class="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-500/15 transition-all hover:shadow-brand-500/25 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {#if addStepMutation.isPending}
                  <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Adding...
                {:else}
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  Add Step
                {/if}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- ─── RIGHT PANEL: AI Tutor Chat ─── -->
    <aside
      class="animate-scale-in stagger-2 flex w-72 shrink-0 flex-col overflow-hidden border-l border-white/[0.06] bg-surface-950/50 transition-all duration-300 max-md:fixed max-md:inset-y-14 max-md:right-0 max-md:z-20 max-md:w-80 max-md:border-l max-md:bg-surface-900/95 max-md:backdrop-blur-xl {aiPanelOpen ? 'max-md:translate-x-0' : 'max-md:translate-x-full'} {aiPanelOpen ? '' : 'hidden md:hidden'}"
    >
      <div class="flex-1 overflow-y-auto p-4">
        <AIChatPanel
          mapId={map.id}
          mapTitle={map.title}
          problemStatement={map.problemStatement}
        />
      </div>
    </aside>
  </div>
{/if}
