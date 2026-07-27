<script lang="ts">
  import { orpc } from "$lib/orpc";
  import { createQuery } from "@tanstack/svelte-query";
  import { goto } from "$app/navigation";
  import MapCard from "$lib/components/MapCard.svelte";
  import SearchBar from "$lib/components/SearchBar.svelte";

  let searchQuery = $state("");
  let statusFilter = $state("all");

  const mapsQuery = createQuery(() => orpc.maps.list.queryOptions());

  const filteredMaps = $derived(
    (mapsQuery.data ?? []).filter((m) => {
      const matchesSearch = !searchQuery ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.problemStatement.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    }),
  );
</script>

<div class="mx-auto max-w-5xl px-4 py-6">
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <h1 class="text-2xl font-bold">All Maps</h1>
    <button
      onclick={() => goto("/create")}
      class="inline-flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
    >
      + New Map
    </button>
  </div>

  <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
    <div class="flex-1">
      <SearchBar bind:value={searchQuery} placeholder="Search maps..." />
    </div>
    <select
      bind:value={statusFilter}
      class="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
    >
      <option value="all">All Status</option>
      <option value="in_progress">In Progress</option>
      <option value="completed">Completed</option>
    </select>
  </div>

  {#if mapsQuery.isLoading}
    <div class="mt-8 text-center text-neutral-500">Loading...</div>
  {:else if filteredMaps.length === 0}
    <div class="mt-16 text-center text-neutral-500">
      {#if searchQuery || statusFilter !== "all"}
        <p>No maps match your filters.</p>
      {:else}
        <p>No maps yet. <a href="/create" class="text-blue-400 hover:underline">Create one</a></p>
      {/if}
    </div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each filteredMaps as map (map.id)}
        <MapCard {map} onclick={() => goto(`/maps/${map.id}`)} />
      {/each}
    </div>
  {/if}
</div>
