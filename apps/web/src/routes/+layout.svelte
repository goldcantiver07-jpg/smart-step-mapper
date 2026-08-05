<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';
  import { page } from '$app/stores';
  import '../app.css';
  import { queryClient } from '$lib/orpc';
  import AuthGuard from '$lib/components/AuthGuard.svelte';
  import Navbar from '$lib/components/Navbar.svelte';

  const { children } = $props();

  const isAuthPage = $derived(['/login', '/register'].includes($page.url.pathname));
</script>

<QueryClientProvider client={queryClient}>
  <AuthGuard />
  <div class="min-h-svh">
    {#if !isAuthPage}
      <Navbar />
    {/if}
    <main class:pt-14={!isAuthPage}>
      {@render children()}
    </main>
  </div>
  <SvelteQueryDevtools />
</QueryClientProvider>
