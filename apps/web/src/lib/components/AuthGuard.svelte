<script lang="ts">
  import { browser } from "$app/environment";
  import { createQuery } from "@tanstack/svelte-query";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { orpc } from "$lib/orpc";

  const publicPaths = ["/login", "/register"];
  const currentPath = $derived($page.url.pathname);

  const userQuery = createQuery(() => ({
    ...orpc.auth.me.queryOptions({
      retry: false,
      staleTime: 60 * 1000,
    }),
    enabled: browser,
  }));

  $effect(() => {
    if (
      browser &&
      !userQuery.isLoading &&
      !userQuery.data &&
      !publicPaths.some((p) => currentPath.startsWith(p))
    ) {
      goto("/login");
    }
  });
</script>
