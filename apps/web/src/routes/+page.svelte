<script lang="ts">
  import { orpc } from "$lib/orpc";
  import { createQuery } from "@tanstack/svelte-query";
  import { goto } from "$app/navigation";

  const userQuery = createQuery(() => orpc.auth.me.queryOptions({
    retry: false,
    staleTime: 5 * 60 * 1000,
  }));

  const mapsQuery = createQuery(() => orpc.maps.list.queryOptions({
    enabled: () => !!userQuery.data,
  }));

  const progressQuery = createQuery(() => orpc.progress.summary.queryOptions({
    enabled: () => !!userQuery.data,
  }));

  // Learning tips
  const tips = [
    { title: "Break It Down", text: "Break down complex problems into smaller steps. Use the mapping feature to visualize each step and understand the logical flow of your solution." },
    { title: "Practice Daily", text: "Consistency is key. Spend at least 15 minutes a day practicing math problems to build and retain your skills." },
    { title: "Visualize The Math", text: "Draw diagrams and maps to see relationships between concepts. Visual learning can improve retention by up to 400%." },
    { title: "Explain It To Someone", text: "Teaching a concept is the best way to master it. Try explaining each step of your solution out loud." },
    { title: "Review Mistakes", text: "Every mistake is a learning opportunity. Review incorrect steps to understand where your thinking went off track." },
  ];

  let currentTip = $state(0);

  function nextTip() {
    currentTip = (currentTip + 1) % tips.length;
  }

  function handleCreateMap() {
    goto("/create");
  }

  function handleViewProgress() {
    goto("/progress");
  }

  const recentMaps = $derived(
    (mapsQuery.data ?? []).slice(0, 6)
  );

  // Time-based greeting
  function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  function formatDate(dateStr: string | Date): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function statusLabel(status: string): string {
    return status === "completed" ? "Completed" : "In Progress";
  }

  function statusColor(status: string): string {
    return status === "completed"
      ? "border-green-500/30 text-green-400 bg-green-500/10"
      : "border-yellow-500/30 text-yellow-400 bg-yellow-500/10";
  }
</script>

<svelte:head>
  <title>Dashboard — Smart Step Mapper</title>
</svelte:head>

<!-- ===== BACKGROUND ATMOSPHERE ===== -->
<div class="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
  <!-- Animated gradient orbs -->
  <div class="animate-float absolute -left-[10%] -top-[15%] h-[50%] w-[45%] rounded-full bg-gradient-to-br from-brand-500/15 via-brand-600/8 to-transparent blur-[140px]" />
  <div class="animate-float absolute -bottom-[15%] -right-[8%] h-[45%] w-[38%] rounded-full bg-gradient-to-tl from-violet-500/12 via-purple-600/8 to-transparent blur-[120px]" style="animation-delay: -3s" />
  <div class="animate-float absolute left-[40%] top-[30%] h-[25%] w-[25%] rounded-full bg-gradient-to-r from-cyan-500/8 to-blue-600/8 blur-[100px]" style="animation-delay: -6s" />
  <!-- Grain overlay -->
  <div class="absolute inset-0 opacity-[0.02]" style="background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJmIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgbnVtT2N0YXZlcz0iMyIgc3R5bGU9ImZsb2NvbG9yOiB3aGl0ZTtjb2xvcjogd2hpdGUiLz48ZmVTY29yZWxpZ2h0aW5nIHJlc3VsdD0ic3R1ZmYiLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjZikiLz48L3N2Zz4=')" />
</div>

<div class="mx-auto max-w-6xl px-4 pb-16 pt-6 md:px-6 lg:px-8">
  <!-- ===== HERO SECTION ===== -->
  <section class="animate-fade-in-up stagger-1 relative mb-10 overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-surface-900/80 via-surface-900/60 to-surface-950/80 px-6 py-8 shadow-xl shadow-black/20 backdrop-blur-xl md:px-10 md:py-12">
    <!-- Decorative top border -->
    <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/30 to-transparent" />

    <!-- Floating decorative dots -->
    <div class="absolute right-6 top-6 flex gap-1.5" aria-hidden="true">
      <div class="h-2 w-2 rounded-full bg-brand-400/20" />
      <div class="h-2 w-2 rounded-full bg-violet-400/15" />
      <div class="h-2 w-2 rounded-full bg-cyan-400/15" />
    </div>

    <div class="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
      <!-- Hero content -->
      <div class="flex-1">
        <div class="mb-4 flex items-center gap-3">
          {#if userQuery.data}
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-lg font-bold text-white shadow-lg shadow-brand-500/20">
              {userQuery.data.displayName.charAt(0).toUpperCase()}
            </div>
          {/if}
          <div>
            <h1 class="font-display text-2xl font-semibold text-surface-100 md:text-3xl">
              {greeting()}{userQuery.data ? `, ${userQuery.data.displayName.split(' ')[0]}!` : "!"}
              <span class="ml-1 inline-block animate-pulse-glow">👋</span>
            </h1>
            <p class="mt-1 text-sm text-surface-400 md:text-base">
              Ready to organize your mathematical thinking and solve problems step by step?
            </p>
          </div>
        </div>

        <div class="mt-6 flex flex-wrap gap-3">
          <button
            onclick={handleCreateMap}
            class="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-brand-500/30 hover:brightness-110 active:scale-[0.97]"
          >
            <svg class="h-4 w-4 transition-transform group-hover:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create New Map
          </button>
          <button
            onclick={handleViewProgress}
            class="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-surface-300 transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.08] hover:text-surface-100 active:scale-[0.97]"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            View Progress
          </button>
        </div>
      </div>

      <!-- Stats cards -->
      <div class="grid grid-cols-3 gap-3 md:gap-4">
        <div class="animate-scale-in stagger-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center backdrop-blur-sm transition-all duration-200 hover:border-brand-500/20 hover:bg-brand-500/[0.04]">
          <div class="mb-1 inline-flex items-center justify-center rounded-lg bg-brand-500/10 p-2">
            <svg class="h-4 w-4 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          <p class="font-display text-xl font-bold text-surface-100 md:text-2xl">
            {progressQuery.data?.totalMaps ?? "—"}
          </p>
          <p class="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-surface-500">Maps</p>
        </div>
        <div class="animate-scale-in stagger-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center backdrop-blur-sm transition-all duration-200 hover:border-violet-500/20 hover:bg-violet-500/[0.04]">
          <div class="mb-1 inline-flex items-center justify-center rounded-lg bg-violet-500/10 p-2">
            <svg class="h-4 w-4 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <p class="font-display text-xl font-bold text-surface-100 md:text-2xl">
            {progressQuery.data?.totalSteps ?? "—"}
          </p>
          <p class="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-surface-500">Steps</p>
        </div>
        <div class="animate-scale-in stagger-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center backdrop-blur-sm transition-all duration-200 hover:border-green-500/20 hover:bg-green-500/[0.04]">
          <div class="mb-1 inline-flex items-center justify-center rounded-lg bg-green-500/10 p-2">
            <svg class="h-4 w-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <p class="font-display text-xl font-bold text-surface-100 md:text-2xl">
            {progressQuery.data ? `${progressQuery.data.accuracy}%` : "—"}
          </p>
          <p class="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-surface-500">Accuracy</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ===== MAIN CONTENT GRID ===== -->
  <div class="grid gap-8 lg:grid-cols-3">
    <!-- Left: Recent Maps + Quick Start (2/3 width on lg) -->
    <div class="space-y-8 lg:col-span-2">
      <!-- Recent Maps -->
      <section class="animate-fade-in-up stagger-2">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="font-display text-lg font-semibold text-surface-100">Recent Maps</h2>
          <a
            href="/maps"
            class="group flex items-center gap-1 text-sm font-medium text-surface-400 transition-colors hover:text-brand-400"
          >
            View all
            <svg class="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        </div>

        {#if mapsQuery.isLoading}
          <div class="grid gap-3 sm:grid-cols-2">
            {#each { length: 4 } as _}
              <div class="animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <div class="mb-3 h-4 w-3/4 rounded bg-white/[0.06]" />
                <div class="mb-2 h-3 w-full rounded bg-white/[0.04]" />
                <div class="mb-3 h-3 w-1/2 rounded bg-white/[0.04]" />
                <div class="flex items-center justify-between">
                  <div class="h-5 w-20 rounded-full bg-white/[0.06]" />
                  <div class="h-3 w-12 rounded bg-white/[0.04]" />
                </div>
              </div>
            {/each}
          </div>
        {:else if recentMaps.length === 0}
          <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center">
            <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/10">
              <svg class="h-7 w-7 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
            </div>
            <h3 class="mb-1 font-display text-base font-semibold text-surface-300">No maps yet</h3>
            <p class="mb-5 max-w-sm text-sm text-surface-500">Start your mathematical journey by creating your first step map.</p>
            <button
              onclick={handleCreateMap}
              class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 active:scale-[0.97]"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create Your First Map
            </button>
          </div>
        {:else}
          <div class="grid gap-3 sm:grid-cols-2">
            {#each recentMaps as map (map.id)}
              <button
                onclick={() => goto(`/maps/${map.id}`)}
                class="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all duration-200 hover:border-brand-500/20 hover:bg-brand-500/[0.04] hover:shadow-lg hover:shadow-brand-500/5 active:scale-[0.98]"
              >
                <!-- Hover indicator -->
                <div class="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-brand-400 opacity-0 transition-all duration-200 group-hover:opacity-100" />

                <div class="mb-2 flex items-start justify-between gap-2">
                  <h3 class="truncate text-sm font-medium text-surface-200 transition-colors group-hover:text-brand-300">
                    {map.title || "Untitled Map"}
                  </h3>
                  <span
                    class="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider {statusColor(map.status)}"
                  >
                    {statusLabel(map.status)}
                  </span>
                </div>
                <p class="mb-3 line-clamp-2 text-xs leading-relaxed text-surface-500">
                  {map.problemStatement}
                </p>
                <div class="flex items-center justify-between">
                  <span class="text-[11px] text-surface-600">{formatDate(map.updatedAt)}</span>
                  <svg class="h-3.5 w-3.5 text-surface-600 transition-all group-hover:translate-x-0.5 group-hover:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </section>

      <!-- Quick Start -->
      <section class="animate-fade-in-up stagger-3">
        <h2 class="mb-4 font-display text-lg font-semibold text-surface-100">Quick Start</h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            onclick={() => goto("/create?topic=algebra")}
            class="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-all duration-200 hover:border-orange-500/20 hover:bg-orange-500/[0.04] hover:shadow-lg hover:shadow-orange-500/5 active:scale-[0.97]"
          >
            <div class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 transition-colors group-hover:bg-orange-500/20">
              <svg class="h-5 w-5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="9" x2="15" y2="15" />
                <line x1="15" y1="9" x2="9" y2="15" />
              </svg>
            </div>
            <h3 class="text-sm font-medium text-surface-300 transition-colors group-hover:text-orange-300">Algebra</h3>
            <p class="mt-0.5 text-[11px] text-surface-500">Equations & expressions</p>
          </button>

          <button
            onclick={() => goto("/create?topic=geometry")}
            class="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-all duration-200 hover:border-blue-500/20 hover:bg-blue-500/[0.04] hover:shadow-lg hover:shadow-blue-500/5 active:scale-[0.97]"
          >
            <div class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 transition-colors group-hover:bg-blue-500/20">
              <svg class="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <h3 class="text-sm font-medium text-surface-300 transition-colors group-hover:text-blue-300">Geometry</h3>
            <p class="mt-0.5 text-[11px] text-surface-500">Shapes & angles</p>
          </button>

          <button
            onclick={() => goto("/create?topic=statistics")}
            class="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-all duration-200 hover:border-green-500/20 hover:bg-green-500/[0.04] hover:shadow-lg hover:shadow-green-500/5 active:scale-[0.97]"
          >
            <div class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 transition-colors group-hover:bg-green-500/20">
              <svg class="h-5 w-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                <path d="M22 12A10 10 0 0 0 12 2v10z" />
              </svg>
            </div>
            <h3 class="text-sm font-medium text-surface-300 transition-colors group-hover:text-green-300">Statistics</h3>
            <p class="mt-0.5 text-[11px] text-surface-500">Data & probability</p>
          </button>

          <button
            onclick={() => goto("/create?topic=calculus")}
            class="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-all duration-200 hover:border-purple-500/20 hover:bg-purple-500/[0.04] hover:shadow-lg hover:shadow-purple-500/5 active:scale-[0.97]"
          >
            <div class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 transition-colors group-hover:bg-purple-500/20">
              <svg class="h-5 w-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </div>
            <h3 class="text-sm font-medium text-surface-300 transition-colors group-hover:text-purple-300">Calculus</h3>
            <p class="mt-0.5 text-[11px] text-surface-500">Derivatives & integrals</p>
          </button>
        </div>
      </section>
    </div>

    <!-- Right: Tips & Stats sidebar (1/3 width on lg) -->
    <div class="space-y-6">
      <!-- Learning Tips Card -->
      <section class="animate-fade-in-up stagger-4">
        <div class="relative overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br from-brand-500/5 via-brand-500/[0.02] to-transparent p-5">
          <!-- Decorative corner -->
          <div class="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-brand-500/10 blur-xl" aria-hidden="true" />

          <div class="relative z-10">
            <div class="mb-3 flex items-center gap-2">
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-base">💡</span>
              <h3 class="font-display text-sm font-semibold text-surface-200">{tips[currentTip].title}</h3>
            </div>
            <p class="text-sm leading-relaxed text-surface-400">
              {tips[currentTip].text}
            </p>
            <div class="mt-4 flex items-center justify-between">
              <div class="flex gap-1.5">
                {#each tips as _, i}
                  <button
                    onclick={() => currentTip = i}
                    class="h-1.5 rounded-full transition-all duration-300 {i === currentTip ? 'w-5 bg-brand-400' : 'w-1.5 bg-white/[0.12] hover:bg-white/[0.2]'}"
                    aria-label="Tip {i + 1}"
                  />
                {/each}
              </div>
              <button
                onclick={nextTip}
                class="flex items-center gap-1 text-xs font-medium text-brand-400 transition-colors hover:text-brand-300"
              >
                Next
                <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Accuracy Ring (when data available) -->
      {#if progressQuery.data && progressQuery.data.totalSteps > 0}
        <section class="animate-fade-in-up stagger-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h3 class="mb-4 font-display text-sm font-semibold text-surface-200">Accuracy Breakdown</h3>
          <div class="mb-4 flex items-center justify-center">
            <div class="relative flex h-28 w-28 items-center justify-center">
              <!-- Background ring -->
              <svg class="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="6"
                  class="text-white/[0.06]"
                />
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="6"
                  stroke-linecap="round"
                  stroke-dasharray={`${2 * Math.PI * 42}`}
                  stroke-dashoffset={`${2 * Math.PI * 42 * (1 - progressQuery.data.accuracy / 100)}`}
                  class="text-brand-400 transition-all duration-700"
                />
              </svg>
              <span class="font-display text-2xl font-bold text-surface-100">{progressQuery.data.accuracy}%</span>
            </div>
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="flex items-center gap-1.5 text-surface-400">
                <span class="h-2 w-2 rounded-full bg-green-400" />
                Correct
              </span>
              <span class="font-medium text-surface-200">{progressQuery.data.correctSteps}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="flex items-center gap-1.5 text-surface-400">
                <span class="h-2 w-2 rounded-full bg-yellow-400" />
                Incorrect
              </span>
              <span class="font-medium text-surface-200">{progressQuery.data.incorrectSteps}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="flex items-center gap-1.5 text-surface-400">
                <span class="h-2 w-2 rounded-full bg-brand-400" />
                Total
              </span>
              <span class="font-medium text-surface-200">{progressQuery.data.totalSteps}</span>
            </div>
          </div>
        </section>
      {/if}

      <!-- Quick Links -->
      <section class="animate-fade-in-up stagger-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h3 class="mb-3 font-display text-sm font-semibold text-surface-200">Quick Links</h3>
        <nav class="space-y-1" aria-label="Quick links">
          <a
            href="/maps"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-surface-400 transition-colors hover:bg-white/[0.04] hover:text-surface-200"
          >
            <svg class="h-4 w-4 text-surface-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
            All Maps
          </a>
          <a
            href="/progress"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-surface-400 transition-colors hover:bg-white/[0.04] hover:text-surface-200"
          >
            <svg class="h-4 w-4 text-surface-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Progress Tracker
          </a>
          <a
            href="/profile"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-surface-400 transition-colors hover:bg-white/[0.04] hover:text-surface-200"
          >
            <svg class="h-4 w-4 text-surface-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Your Profile
          </a>
          <a
            href="/create"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-surface-400 transition-colors hover:bg-white/[0.04] hover:text-surface-200"
          >
            <svg class="h-4 w-4 text-surface-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Map
          </a>
        </nav>
      </section>
    </div>
  </div>

  <!-- ===== FOOTER ===== -->
  <footer class="mt-12 border-t border-white/[0.06] pt-8">
    <div class="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
      <p class="text-xs text-surface-500">
        &copy; 2026 Smart Step Mapper.
      </p>
      <div class="flex gap-4">
        <a href="#" class="text-xs text-surface-600 transition-colors hover:text-surface-400">About</a>
        <a href="#" class="text-xs text-surface-600 transition-colors hover:text-surface-400">Help</a>
        <a href="#" class="text-xs text-surface-600 transition-colors hover:text-surface-400">Privacy</a>
        <a href="#" class="text-xs text-surface-600 transition-colors hover:text-surface-400">Terms</a>
      </div>
    </div>
  </footer>
</div>
