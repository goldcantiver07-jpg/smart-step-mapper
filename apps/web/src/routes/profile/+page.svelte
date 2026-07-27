<script lang="ts">
  import { orpc } from "$lib/orpc";
  import { createQuery } from "@tanstack/svelte-query";
  import { goto } from "$app/navigation";

  const userQuery = createQuery(() => orpc.auth.me.queryOptions({
    retry: false,
    staleTime: 60 * 1000,
  }));

  function logout() {
    document.cookie = "session=; path=/; max-age=0";
    goto("/login");
  }
</script>

<div class="mx-auto max-w-md px-4 py-6">
  <h1 class="mb-6 text-2xl font-bold">Profile</h1>

  {#if userQuery.isLoading}
    <div class="text-neutral-500">Loading...</div>
  {:else if userQuery.data}
    <div class="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
      <div class="mb-4 flex items-center gap-4">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
          {userQuery.data.displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 class="text-xl font-semibold">{userQuery.data.displayName}</h2>
          <p class="text-sm text-neutral-400">{userQuery.data.email}</p>
        </div>
      </div>

      <hr class="mb-4 border-neutral-800" />

      <button
        onclick={logout}
        class="w-full rounded bg-red-600/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-600/30"
      >
        Sign Out
      </button>
    </div>
  {:else}
    <div class="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 text-center">
      <p class="mb-3 text-neutral-400">Not signed in</p>
      <button
        onclick={() => goto("/login")}
        class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Sign In
      </button>
    </div>
  {/if}
</div>
