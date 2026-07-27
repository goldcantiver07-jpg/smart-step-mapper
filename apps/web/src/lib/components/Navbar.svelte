<script lang="ts">
  import { orpc } from "$lib/orpc";
  import { createQuery } from "@tanstack/svelte-query";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";

  const userQuery = createQuery(() => orpc.auth.me.queryOptions({
    retry: false,
    staleTime: 5 * 60 * 1000,
  }));

  let drawerOpen = $state(false);
  let dropdownOpen = $state(false);

  const currentPath = $derived($page.url.pathname);

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/maps", label: "Maps" },
    { href: "/create", label: "Create" },
    { href: "/progress", label: "Progress" },
  ] as const;

  const drawerItems = [
    { href: "/", label: "Home" },
    { href: "/maps", label: "Maps" },
    { href: "/create", label: "Create" },
    { href: "/progress", label: "Progress" },
    { href: "/profile", label: "Profile" },
    { href: "/profile?tab=settings", label: "Settings" },
  ] as const;

  function isActive(href: string) {
    if (href === "/") return currentPath === "/";
    if (href.includes("?")) return currentPath === href.split("?")[0] && $page.url.searchParams.get("tab") === "settings";
    return currentPath.startsWith(href);
  }

  function handleLogout() {
    document.cookie = "session=; path=/; max-age=0";
    goto("/login");
  }

  function closeDrawer() {
    drawerOpen = false;
  }

  function toggleDropdown() {
    dropdownOpen = !dropdownOpen;
  }

  function closeDropdown() {
    dropdownOpen = false;
  }

  function handleDropdownBlur(e: FocusEvent) {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      closeDropdown();
    }
  }
</script>

<svelte:window onclick={(e) => {
  if (dropdownOpen && !(e.target as HTMLElement).closest("[data-dropdown]")) {
    closeDropdown();
  }
}} onkeydown={(e) => {
  if (e.key === "Escape") { closeDropdown(); closeDrawer(); }
}} />

<!-- Desktop navbar -->
<nav class="fixed top-0 left-0 right-0 z-50 border-b border-neutral-800 bg-surface-950/90 backdrop-blur-md">
  <div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
    <!-- Brand + Desktop nav links -->
    <div class="flex items-center gap-8">
      <a
        href="/"
        class="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-surface-100 transition-colors hover:text-blue-400"
      >
        <!-- Map icon -->
        <svg class="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
        <span class="hidden sm:inline">Smart Step Mapper</span>
      </a>

      <!-- Desktop nav links -->
      <div class="hidden md:flex md:items-center md:gap-1">
        {#each navItems as item}
          <a
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            class="relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors
              {isActive(item.href)
                ? 'text-blue-400'
                : 'text-neutral-400 hover:text-surface-100 hover:bg-neutral-800/50'}"
          >
            {item.label}
            {#if isActive(item.href)}
              <span class="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-blue-400"></span>
            {/if}
          </a>
        {/each}
      </div>
    </div>

    <!-- Right side: user menu or sign in -->
    <div class="flex items-center gap-2">
      {#if userQuery.data}
        <!-- Desktop user menu -->
        <div data-dropdown class="relative">
          <button
            onclick={toggleDropdown}
            class="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {userQuery.data.displayName.charAt(0).toUpperCase()}
            </div>
            <svg
              class="hidden h-4 w-4 text-neutral-400 transition-transform md:block {dropdownOpen ? 'rotate-180' : ''}"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {#if dropdownOpen}
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <div
              role="menu"
              class="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-lg border border-neutral-800 bg-surface-900 shadow-xl"
              onfocusout={handleDropdownBlur}
              tabindex="-1"
            >
              <div class="border-b border-neutral-800 px-4 py-3">
                <p class="text-sm font-medium text-surface-100">{userQuery.data.displayName}</p>
                <p class="text-xs text-neutral-500">{userQuery.data.email}</p>
              </div>
              <a
                href="/profile"
                role="menuitem"
                onclick={closeDropdown}
                class="flex items-center gap-2 px-4 py-2 text-sm text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-surface-100"
              >
                Profile
              </a>
              <a
                href="/profile?tab=settings"
                role="menuitem"
                onclick={closeDropdown}
                class="flex items-center gap-2 px-4 py-2 text-sm text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-surface-100"
              >
                Settings
              </a>
              <div class="border-t border-neutral-800">
                <button
                  role="menuitem"
                  onclick={() => { closeDropdown(); handleLogout(); }}
                  class="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-neutral-800"
                >
                  Sign Out
                </button>
              </div>
            </div>
          {/if}
        </div>

        <!-- Mobile hamburger -->
        <button
          onclick={() => drawerOpen = !drawerOpen}
          class="flex items-center justify-center rounded-md p-2 text-neutral-400 transition-colors hover:bg-neutral-800/50 md:hidden"
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
        >
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            {#if drawerOpen}
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            {:else}
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            {/if}
          </svg>
        </button>
      {:else if !userQuery.isLoading}
        <a
          href="/login"
          class="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Sign In
        </a>
        <!-- Mobile hamburger (unauthenticated) -->
        <button
          onclick={() => drawerOpen = !drawerOpen}
          class="flex items-center justify-center rounded-md p-2 text-neutral-400 transition-colors hover:bg-neutral-800/50 md:hidden"
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
        >
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            {#if drawerOpen}
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            {:else}
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            {/if}
          </svg>
        </button>
      {/if}
    </div>
  </div>
</nav>

<!-- Mobile drawer backdrop -->
{#if drawerOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="fixed inset-0 z-40 bg-black/50 md:hidden"
    onclick={closeDrawer}
    role="presentation"
  ></div>
{/if}

<!-- Mobile drawer -->
<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<div
  role="dialog"
  aria-modal="true"
  aria-label="Navigation menu"
  class="fixed top-0 left-0 z-50 h-full w-72 transform border-r border-neutral-800 bg-surface-950 shadow-2xl transition-transform duration-300 ease-out md:hidden {drawerOpen ? 'translate-x-0' : '-translate-x-full'}"
>
  <div class="flex h-full flex-col">
    <!-- Drawer header -->
    {#if userQuery.data}
      <div class="border-b border-neutral-800 p-6">
        <div class="flex items-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
            {userQuery.data.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p class="font-medium text-surface-100">{userQuery.data.displayName}</p>
            <p class="text-sm text-neutral-500">{userQuery.data.email}</p>
          </div>
        </div>
      </div>
    {:else if !userQuery.isLoading}
      <div class="border-b border-neutral-800 p-6">
        <p class="mb-3 text-sm text-neutral-400">Not signed in</p>
        <a
          href="/login"
          onclick={closeDrawer}
          class="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Sign In
        </a>
      </div>
    {/if}

    <!-- Drawer nav links -->
    <nav class="flex-1 space-y-1 p-4">
      {#each drawerItems as item}
        <a
          href={item.href}
          onclick={closeDrawer}
          aria-current={isActive(item.href) ? "page" : undefined}
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
            {isActive(item.href)
              ? 'bg-blue-600/10 text-blue-400'
              : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-surface-100'}"
        >
          {item.label}
        </a>
      {/each}
    </nav>

    <!-- Drawer footer -->
    {#if userQuery.data}
      <div class="border-t border-neutral-800 p-4">
        <button
          onclick={() => { closeDrawer(); handleLogout(); }}
          class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-neutral-800"
        >
          Sign Out
        </button>
      </div>
    {/if}
  </div>
</div>
