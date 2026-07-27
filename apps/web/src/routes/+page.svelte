<script lang="ts">
  import { orpc } from "$lib/orpc";
  import { createQuery } from "@tanstack/svelte-query";
  import { goto } from "$app/navigation";
  import MapCard from "$lib/components/MapCard.svelte";
  import SearchBar from "$lib/components/SearchBar.svelte";

  let searchQuery = $state("");

  const mapsQuery = createQuery(() => orpc.maps.list.queryOptions());

  const filteredMaps = $derived(
    (mapsQuery.data ?? []).filter(
      (m) =>
        !searchQuery ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.problemStatement.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );
</script>

<div class="mx-auto max-w-4xl px-4 py-6">
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <h1 class="text-2xl font-bold">My Maps</h1>
    <button
      onclick={() => goto("/create")}
      class="inline-flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
    >
      + Create New Map
    </button>
  </div>

  <SearchBar bind:value={searchQuery} placeholder="Search your maps..." />

  {#if mapsQuery.isLoading}
    <div class="mt-8 text-center text-neutral-500">Loading maps...</div>
  {:else if filteredMaps.length === 0}
    <div class="mt-16 text-center text-neutral-500">
      {#if searchQuery}
        <p>No maps matching "{searchQuery}"</p>
      {:else}
        <p class="mb-2">No maps yet.</p>
        <button
          onclick={() => goto("/create")}
          class="text-blue-400 hover:underline"
        >
          Create your first map
        </button>
      {/if}
    </div>
  {:else}
    <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each filteredMaps as map (map.id)}
        <MapCard {map} onclick={() => goto(`/maps/${map.id}`)} />
      {/each}
    </div>
  {/if}
</div>
