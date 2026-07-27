<script lang="ts">
  import { orpc } from "$lib/orpc";
  import { createMutation } from "@tanstack/svelte-query";
  import { isEmailValid } from "$lib/validation";
  import { goto } from "$app/navigation";

  let email = $state("");
  let password = $state("");
  let error = $state("");

  const loginMutation = createMutation(() => orpc.auth.login.mutationOptions({
    onSuccess: (data) => {
      document.cookie = `session=${data.token}; path=/; max-age=604800; samesite=lax`;
      goto("/");
    },
    onError: (err) => { error = err.message; },
  }));

  function handleSubmit(e: Event) {
    e.preventDefault();
    error = "";
    if (!isEmailValid(email)) { error = "Enter a valid email."; return; }
    loginMutation.mutate({ email, password });
  }
</script>

<div class="mx-auto max-w-sm px-4 pt-20">
  <h1 class="mb-6 text-2xl font-bold">Sign In</h1>
  {#if error}
    <div class="mb-4 rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>
  {/if}
  <form onsubmit={handleSubmit} class="flex flex-col gap-4">
    <input
      bind:value={email}
      type="email"
      placeholder="Email"
      class="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      required
    />
    <input
      bind:value={password}
      type="password"
      placeholder="Password"
      class="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      required
    />
    <button
      type="submit"
      disabled={loginMutation.isPending}
      class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
    >
      {loginMutation.isPending ? "Signing in..." : "Sign In"}
    </button>
  </form>
  <p class="mt-4 text-center text-sm text-neutral-400">
    No account? <a href="/register" class="text-blue-400 hover:underline">Register</a>
  </p>
</div>
