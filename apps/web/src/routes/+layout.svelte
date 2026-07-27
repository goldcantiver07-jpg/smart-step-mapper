<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';
  import '../app.css';
  import { queryClient } from '$lib/orpc';
  import AuthGuard from '$lib/components/AuthGuard.svelte';
  import Navbar from '$lib/components/Navbar.svelte';

  const { children } = $props();
</script>

<QueryClientProvider client={queryClient}>
  <AuthGuard />
  <div class="min-h-svh">
    <Navbar />
    <main class="pt-14">
      {@render children()}
    </main>
  </div>
  <SvelteQueryDevtools />
</QueryClientProvider>
