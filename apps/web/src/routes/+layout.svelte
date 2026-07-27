<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';
  import '../app.css';
  import { queryClient } from '$lib/orpc';
  import AuthGuard from '$lib/components/AuthGuard.svelte';
  import Header from '$lib/components/Header.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';

  const { children } = $props();
</script>

<QueryClientProvider client={queryClient}>
  <AuthGuard />
  <div class="grid h-svh grid-rows-[auto_1fr]">
    <Header />
    <main class="overflow-y-auto pb-20 md:pb-0">
      {@render children()}
    </main>
    <BottomNav />
  </div>
  <SvelteQueryDevtools />
</QueryClientProvider>
