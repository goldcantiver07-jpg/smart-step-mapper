<script lang="ts">
  import { orpc } from "$lib/orpc";
  import { createQuery } from "@tanstack/svelte-query";
  import { goto } from "$app/navigation";

  const userQuery = createQuery(() => orpc.auth.me.queryOptions({
    retry: false,
    staleTime: 5 * 60 * 1000,
  }));

  function logout() {
    document.cookie = "session=; path=/; max-age=0";
    goto("/login");
  }
</script>

<div>
  <div class="flex flex-row items-center justify-between px-4 py-2 md:px-6">
    <nav class="flex gap-4 text-lg">
      <a href="/" class="transition-colors hover:text-neutral-400">Smart Step Mapper</a>
    </nav>
    <div class="flex items-center gap-2">
      {#if userQuery.data}
        <span class="text-sm text-neutral-400">{userQuery.data.displayName}</span>
        <button onclick={logout} class="text-sm text-neutral-500 transition-colors hover:text-red-400">Logout</button>
      {:else if !userQuery.isLoading}
        <a href="/login" class="text-sm text-blue-400 transition-colors hover:text-blue-300">Sign In</a>
      {/if}
    </div>
  </div>
  <hr class="border-neutral-800" />
</div>
