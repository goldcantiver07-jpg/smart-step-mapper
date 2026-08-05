# Navbar Redesign & Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate Header + BottomNav with a single unified responsive top navbar, and rebuild the profile page as a tabbed Profile + Settings page with API-backed settings actions.

**Architecture:** Unified `Navbar.svelte` component handles both desktop (full bar + avatar dropdown) and mobile (hamburger + slide-out drawer) navigation. Profile page uses a local tab state to switch between Profile and Settings views. Three new auth API procedures (`updateProfile`, `changePassword`, `deleteAccount`) follow existing `publicProcedure` + auth-check pattern.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), TailwindCSS v4, oRPC, Drizzle ORM, PostgreSQL

## Global Constraints

- Svelte 5 runes required (`$state`, `$derived`, `$props`, `$effect`) — no stores, no `on:click`, no `createEventDispatcher`
- TailwindCSS utility classes only — no custom CSS files
- Dark theme only: use `bg-surface-950`, `text-surface-100`, `border-neutral-800` colors from existing theme
- API procedures use `publicProcedure` + manual `context.user` check (no separate `protectedProcedure` exists)
- All SVG icons inline, no icon library
- Accessibility: nav links need `aria-current="page"` when active, drawer needs `role="dialog"` and `aria-modal`

---

### Task 1: API Procedures — updateProfile, changePassword, deleteAccount

**Files:**
- Modify: `packages/api/src/routers/auth.ts`

**Interfaces:**
- Produces:
  - `auth.updateProfile({ displayName: string })` → `{ id: string; email: string; displayName: string }`
  - `auth.changePassword({ currentPassword: string; newPassword: string })` → `{ success: true }`
  - `auth.deleteAccount()` → `{ success: true }`

- [ ] **Step 1: Add three new procedures to auth router**

Add these after the `me` procedure in `packages/api/src/routers/auth.ts`:

```typescript
  updateProfile: publicProcedure
    .input(
      z.object({
        displayName: z.string().min(1).max(100),
      }),
    )
    .handler(async ({ input, context }) => {
      if (!context.user) {
        throw new ORPCError("UNAUTHORIZED", { message: "Not authenticated" });
      }
      const [updated] = await db
        .update(users)
        .set({ displayName: input.displayName, updatedAt: new Date() })
        .where(eq(users.id, context.user.id))
        .returning({ id: users.id, email: users.email, displayName: users.displayName });
      return updated;
    }),

  changePassword: publicProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6),
      }),
    )
    .handler(async ({ input, context }) => {
      if (!context.user) {
        throw new ORPCError("UNAUTHORIZED", { message: "Not authenticated" });
      }
      const [found] = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, context.user.id))
        .limit(1);
      const valid = await verifyPassword(input.currentPassword, found.passwordHash);
      if (!valid) {
        throw new ORPCError("UNAUTHORIZED", { message: "Current password is incorrect" });
      }
      const newHash = await hashPassword(input.newPassword);
      await db
        .update(users)
        .set({ passwordHash: newHash, updatedAt: new Date() })
        .where(eq(users.id, context.user.id));
      return { success: true };
    }),

  deleteAccount: publicProcedure.handler(async ({ context }) => {
    if (!context.user) {
      throw new ORPCError("UNAUTHORIZED", { message: "Not authenticated" });
    }
    await db.delete(users).where(eq(users.id, context.user.id));
    return { success: true };
  }),
```

Also add the missing `import` for `ORPCError` at the top (check if it's already imported — it's used by existing procedures):

```typescript
// At the top — verify ORPCError is already imported
import { ORPCError } from "@orpc/server";
```

The `users.updatedAt` field needs to be set. Check that the schema has an `updatedAt` column — yes it does (`updatedAt: timestamp("updated_at").notNull().defaultNow()`).

Also need to import `hashPassword` — check it's already imported (line 7 of auth.ts: `import { hashPassword, verifyPassword } from "../utils/password";`). Yes it is.

- [ ] **Step 2: Run type check**

```bash
bun run check-types
```

Expected: No type errors. `users.updatedAt` exists in schema, `ORPCError` is imported, `hashPassword`/`verifyPassword` are imported.

---

### Task 2: Navbar Component — Unified Top Navigation

**Files:**
- Create: `apps/web/src/lib/components/Navbar.svelte`
- Delete: `apps/web/src/lib/components/BottomNav.svelte` (after Task 3)

**Interfaces:**
- Consumes: `orpc.auth.me` query (same as current Header)
- Exports: `Navbar` component (no props, self-contained)

- [ ] **Step 1: Create Navbar.svelte**

```svelte
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
    { href: "/", label: "Home", icon: "home" },
    { href: "/maps", label: "Maps", icon: "map" },
    { href: "/create", label: "Create", icon: "plus" },
    { href: "/progress", label: "Progress", icon: "chart" },
  ] as const;

  const userMenuItems = [
    { href: "/profile", label: "Profile", icon: "user" },
    { href: "/profile?tab=settings", label: "Settings", icon: "settings" },
  ] as const;

  function isActive(href: string) {
    if (href === "/") return currentPath === "/";
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
</script>

<!-- Desktop navbar -->
<nav
  class="fixed top-0 left-0 right-0 z-50 border-b border-neutral-800 bg-surface-950/90 backdrop-blur-md"
  onkeydown={(e) => { if (e.key === "Escape") { closeDropdown(); closeDrawer(); }}}
>
  <div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
    <!-- Brand + Desktop nav links -->
    <div class="flex items-center gap-8">
      <a href="/" class="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-surface-100 transition-colors hover:text-blue-400">
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
              <span class="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-blue-400" />
            {/if}
          </a>
        {/each}
      </div>
    </div>

    <!-- Right side: user menu or sign in -->
    <div class="flex items-center gap-2">
      {#if userQuery.data}
        <!-- Desktop user menu -->
        <div class="relative">
          <button
            onclick={toggleDropdown}
            onblur={() => setTimeout(closeDropdown, 150)}
            class="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {userQuery.data.displayName.charAt(0).toUpperCase()}
            </div>
            <svg class="hidden h-4 w-4 text-neutral-400 transition-transform md:block {dropdownOpen ? 'rotate-180' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <!-- Dropdown menu -->
          {#if dropdownOpen}
            <!-- eslint-disable-next-line svelte/no-at-directives -->
            {@const handleBlur = (e: FocusEvent) => {
              if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
                closeDropdown();
              }
            }}
            <div
              role="menu"
              class="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-lg border border-neutral-800 bg-surface-900 shadow-xl"
              onfocusout={handleBlur}
            >
              <div class="border-b border-neutral-800 px-4 py-3">
                <p class="text-sm font-medium text-surface-100">{userQuery.data.displayName}</p>
                <p class="text-xs text-neutral-500">{userQuery.data.email}</p>
              </div>
              {#each userMenuItems as item}
                <a
                  href={item.href}
                  role="menuitem"
                  onclick={closeDropdown}
                  class="flex items-center gap-2 px-4 py-2 text-sm text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-surface-100"
                >
                  {item.label}
                </a>
              {/each}
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

        <!-- Mobile hamburger (only visible on mobile) -->
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
  <div
    class="fixed inset-0 z-40 bg-black/50 md:hidden"
    onclick={closeDrawer}
    onkeydown={(e) => { if (e.key === "Escape") closeDrawer(); }}
    role="presentation"
  />
{/if}

<!-- Mobile drawer -->
<aside
  role="dialog"
  aria-modal="true"
  aria-label="Navigation menu"
  class="fixed top-0 left-0 z-50 h-full w-72 transform border-r border-neutral-800 bg-surface-950 shadow-2xl transition-transform duration-300 ease-out md:hidden {drawerOpen ? 'translate-x-0' : '-translate-x-full'}"
>
  <div class="flex h-full flex-col">
    <!-- Drawer header: user info -->
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
      {#each [...navItems, { href: "/profile", label: "Profile", icon: "user" }, { href: "/profile?tab=settings", label: "Settings", icon: "settings" }] as item}
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

    <!-- Drawer footer: logout -->
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
</aside>
```

- [ ] **Step 2: Lint check**

```bash
bun run check
```

Fix any lint/format issues. Expected: clean.

---

### Task 3: Update Layout — Wire in Navbar, Remove Old Components

**Files:**
- Modify: `apps/web/src/routes/+layout.svelte`
- Delete: `apps/web/src/lib/components/BottomNav.svelte`

- [ ] **Step 1: Update +layout.svelte**

Replace:
```svelte
  import Header from '$lib/components/Header.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
```
With:
```svelte
  import Navbar from '$lib/components/Navbar.svelte';
```

Replace the grid layout:
```svelte
  <div class="grid h-svh grid-rows-[auto_1fr]">
    <Header />
    <main class="overflow-y-auto pb-20 md:pb-0">
      {@render children()}
    </main>
    <BottomNav />
  </div>
```
With:
```svelte
  <div class="min-h-svh pt-14">
    <Navbar />
    <main class="mx-auto max-w-7xl">
      {@render children()}
    </main>
  </div>
```

Final file should look like:
```svelte
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
  <div class="min-h-svh pt-14">
    <Navbar />
    <main class="mx-auto max-w-7xl">
      {@render children()}
    </main>
  </div>
  <SvelteQueryDevtools />
</QueryClientProvider>
```

- [ ] **Step 2: Delete BottomNav.svelte**

```bash
Remove-Item -LiteralPath "apps/web/src/lib/components/BottomNav.svelte"
```

- [ ] **Step 3: Remove unused Header.svelte imports**

Check that nothing else imports Header.svelte:
```bash
bun run check-types
```
Expected: clean. No "Header is not exported" errors from other files.

---

### Task 4: Profile Page — Tabbed Profile + Settings

**Files:**
- Modify: `apps/web/src/routes/profile/+page.svelte`

- [ ] **Step 1: Rewrite profile/+page.svelte**

```svelte
<script lang="ts">
  import { orpc } from "$lib/orpc";
  import { createQuery, createMutation } from "@tanstack/svelte-query";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";

  const userQuery = createQuery(() => orpc.auth.me.queryOptions({
    retry: false,
    staleTime: 60 * 1000,
  }));

  const progressQuery = createQuery(() => orpc.progress.summary.queryOptions({
    enabled: () => !!userQuery.data,
  }));

  // Tab state from URL or default to "profile"
  let activeTab = $derived($page.url.searchParams.get("tab") === "settings" ? "settings" : "profile");

  // Settings form state
  let displayName = $state("");
  let displayNameDirty = $state(false);
  let nameSaved = $state(false);
  let nameError = $state("");

  let currentPassword = $state("");
  let newPassword = $state("");
  let confirmPassword = $state("");
  let passwordError = $state("");
  let passwordSaved = $state(false);

  let showDeleteConfirm = $state(false);
  let deleteConfirmText = $state("");

  // Sync display name when user data loads
  $effect(() => {
    if (userQuery.data && !displayNameDirty) {
      displayName = userQuery.data.displayName;
    }
  });

  const updateProfileMutation = createMutation(
    () => orpc.auth.updateProfile.mutationOptions({
      onSuccess: () => {
        nameSaved = true;
        displayNameDirty = false;
        userQuery.refetch();
        setTimeout(() => { nameSaved = false; }, 2000);
      },
      onError: (err) => { nameError = err.message; },
    }),
  );

  const changePasswordMutation = createMutation(
    () => orpc.auth.changePassword.mutationOptions({
      onSuccess: () => {
        passwordSaved = true;
        currentPassword = "";
        newPassword = "";
        confirmPassword = "";
        setTimeout(() => { passwordSaved = false; }, 2000);
      },
      onError: (err) => { passwordError = err.message; },
    }),
  );

  const deleteAccountMutation = createMutation(
    () => orpc.auth.deleteAccount.mutationOptions({
      onSuccess: () => {
        document.cookie = "session=; path=/; max-age=0";
        goto("/login");
      },
    }),
  );

  function handleSaveName() {
    nameError = "";
    if (!displayName.trim()) { nameError = "Display name is required"; return; }
    if (displayName.trim().length > 100) { nameError = "Display name must be 100 characters or less"; return; }
    updateProfileMutation.mutate({ displayName: displayName.trim() });
  }

  function handleChangePassword() {
    passwordError = "";
    if (!currentPassword) { passwordError = "Current password is required"; return; }
    if (!newPassword) { passwordError = "New password is required"; return; }
    if (newPassword.length < 6) { passwordError = "New password must be at least 6 characters"; return; }
    if (newPassword !== confirmPassword) { passwordError = "Passwords do not match"; return; }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  }

  function handleDeleteAccount() {
    if (deleteConfirmText === "delete my account") {
      deleteAccountMutation.mutate();
    }
  }

  function logout() {
    document.cookie = "session=; path=/; max-age=0";
    goto("/login");
  }

  function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  }
</script>

<svelte:head>
  <title>Profile — Smart Step Mapper</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8">
  {#if userQuery.isLoading}
    <div class="flex items-center justify-center py-20">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
    </div>

  {:else if userQuery.data}
    <!-- Tabs -->
    <div class="mb-8 flex border-b border-neutral-800" role="tablist">
      <button
        role="tab"
        aria-selected={activeTab === "profile"}
        onclick={() => goto("/profile")}
        class="px-6 py-3 text-sm font-medium transition-colors
          {activeTab === 'profile'
            ? 'border-b-2 border-blue-400 text-blue-400'
            : 'text-neutral-500 hover:text-neutral-300'}"
      >
        Profile
      </button>
      <button
        role="tab"
        aria-selected={activeTab === "settings"}
        onclick={() => goto("/profile?tab=settings")}
        class="px-6 py-3 text-sm font-medium transition-colors
          {activeTab === 'settings'
            ? 'border-b-2 border-blue-400 text-blue-400'
            : 'text-neutral-500 hover:text-neutral-300'}"
      >
        Settings
      </button>
    </div>

    {#if activeTab === "profile"}
      <!-- Profile Tab -->
      <div class="animate-fade-in-up">
        <!-- Hero -->
        <div class="mb-8 flex flex-col items-center text-center">
          <div class="group relative mb-4">
            <div class="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-3xl font-bold text-white shadow-lg">
              {userQuery.data.displayName.charAt(0).toUpperCase()}
            </div>
            <label class="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/0 text-xs font-medium text-white opacity-0 transition-all group-hover:bg-black/50 group-hover:opacity-100">
              Change photo
              <input type="file" accept="image/*" class="hidden" />
            </label>
          </div>
          <h1 class="text-2xl font-display font-semibold text-surface-100">{userQuery.data.displayName}</h1>
          <p class="mt-1 text-sm text-neutral-400">{userQuery.data.email}</p>
          <p class="mt-0.5 text-xs text-neutral-500">Joined {formatDate(userQuery.data.createdAt)}</p>
        </div>

        <!-- Stats -->
        <div class="mb-8 grid grid-cols-3 gap-4">
          <div class="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 text-center">
            <p class="text-2xl font-bold text-surface-100">{progressQuery.data?.totalMaps ?? "—"}</p>
            <p class="text-xs text-neutral-500">Maps Created</p>
          </div>
          <div class="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 text-center">
            <p class="text-2xl font-bold text-surface-100">{progressQuery.data?.totalSteps ?? "—"}</p>
            <p class="text-xs text-neutral-500">Steps Completed</p>
          </div>
          <div class="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 text-center">
            <p class="text-2xl font-bold text-surface-100">{progressQuery.data?.accuracy ?? "—"}%</p>
            <p class="text-xs text-neutral-500">Accuracy</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-center gap-3">
          <a
            href="/maps"
            class="rounded-lg border border-neutral-700 bg-neutral-800/50 px-5 py-2 text-sm font-medium text-surface-100 transition-colors hover:bg-neutral-700/50"
          >
            View My Maps
          </a>
          <button
            onclick={logout}
            class="rounded-lg border border-red-800/50 px-5 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-600/10"
          >
            Sign Out
          </button>
        </div>
      </div>

    {:else}
      <!-- Settings Tab -->
      <div class="animate-fade-in-up space-y-8">
        <!-- Display Name -->
        <div class="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
          <h2 class="mb-1 text-lg font-semibold text-surface-100">Display Name</h2>
          <p class="mb-4 text-sm text-neutral-500">This is how your name appears around the app.</p>
          <div class="flex gap-3">
            <input
              type="text"
              bind:value={displayName}
              oninput={() => { displayNameDirty = true; nameError = ""; nameSaved = false; }}
              class="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-surface-100 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              maxlength="100"
            />
            <button
              onclick={handleSaveName}
              disabled={!displayNameDirty || updateProfileMutation.isPending}
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
          {#if nameError}
            <p class="mt-2 text-xs text-red-400">{nameError}</p>
          {/if}
          {#if nameSaved}
            <p class="mt-2 text-xs text-green-400">Display name updated!</p>
          {/if}
        </div>

        <!-- Email -->
        <div class="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
          <h2 class="mb-1 text-lg font-semibold text-surface-100">Email</h2>
          <p class="mb-2 text-sm text-neutral-400">{userQuery.data.email}</p>
          <span class="inline-block rounded-full bg-green-600/20 px-2.5 py-0.5 text-xs font-medium text-green-400">Verified</span>
        </div>

        <!-- Change Password -->
        <div class="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
          <h2 class="mb-4 text-lg font-semibold text-surface-100">Change Password</h2>
          <div class="space-y-4">
            <div>
              <label for="current-password" class="mb-1 block text-sm text-neutral-400">Current Password</label>
              <input
                id="current-password"
                type="password"
                bind:value={currentPassword}
                class="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-surface-100 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label for="new-password" class="mb-1 block text-sm text-neutral-400">New Password</label>
              <input
                id="new-password"
                type="password"
                bind:value={newPassword}
                class="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-surface-100 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label for="confirm-password" class="mb-1 block text-sm text-neutral-400">Confirm New Password</label>
              <input
                id="confirm-password"
                type="password"
                bind:value={confirmPassword}
                class="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-surface-100 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {#if passwordError}
              <p class="text-xs text-red-400">{passwordError}</p>
            {/if}
            {#if passwordSaved}
              <p class="text-xs text-green-400">Password updated!</p>
            {/if}
            <button
              onclick={handleChangePassword}
              disabled={changePasswordMutation.isPending}
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
            </button>
          </div>
        </div>

        <!-- Danger Zone -->
        {#if !showDeleteConfirm}
          <div class="rounded-lg border border-red-900/50 bg-red-950/20 p-6">
            <h2 class="mb-1 text-lg font-semibold text-red-400">Danger Zone</h2>
            <p class="mb-4 text-sm text-neutral-500">Once you delete your account, there is no going back. Please be certain.</p>
            <button
              onclick={() => showDeleteConfirm = true}
              class="rounded-lg bg-red-600/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-600/30"
            >
              Delete Account
            </button>
          </div>
        {:else}
          <div class="rounded-lg border border-red-900/50 bg-red-950/20 p-6">
            <h2 class="mb-1 text-lg font-semibold text-red-400">Delete Account</h2>
            <p class="mb-4 text-sm text-neutral-400">
              Type <span class="font-mono text-red-400">delete my account</span> to confirm.
            </p>
            <input
              type="text"
              bind:value={deleteConfirmText}
              placeholder="delete my account"
              class="mb-4 w-full rounded-lg border border-red-800 bg-neutral-800 px-3 py-2 text-sm text-surface-100 placeholder-neutral-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <div class="flex gap-3">
              <button
                onclick={handleDeleteAccount}
                disabled={deleteConfirmText !== "delete my account" || deleteAccountMutation.isPending}
                class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteAccountMutation.isPending ? "Deleting..." : "Permanently Delete"}
              </button>
              <button
                onclick={() => { showDeleteConfirm = false; deleteConfirmText = ""; }}
                class="rounded-lg border border-neutral-700 bg-neutral-800/50 px-4 py-2 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-700/50"
              >
                Cancel
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  {:else}
    <!-- Not signed in -->
    <div class="rounded-lg border border-neutral-800 bg-neutral-900/50 p-8 text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-800">
        <svg class="h-8 w-8 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <h1 class="mb-2 text-xl font-semibold text-surface-100">Not signed in</h1>
      <p class="mb-6 text-sm text-neutral-500">Sign in to view your profile and settings.</p>
      <button
        onclick={() => goto("/login")}
        class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        Sign In
      </button>
    </div>
  {/if}
</div>
```

- [ ] **Step 2: Check type errors**

```bash
bun run check-types
```

Expected: clean. The `userQuery.data` uses the type returned by `orpc.auth.me` which includes `createdAt` (from the users schema). Verify the type includes `createdAt` — the schema has it (`createdAt: timestamp("created_at").notNull().defaultNow()`) and the `me` handler returns `context.user` which is `{ id, email, displayName }`. Need to also return `createdAt` from the `me` handler.

Check `auth.ts` line 87: `return context.user;` — the context sets user as `{ id: string; email: string; displayName: string }` (see `context.ts` line 19). Need **to add `createdAt`** to the context user type and the query.

Fix `packages/api/src/context.ts` line 19:
```typescript
let user: { id: string; email: string; displayName: string; createdAt: string } | null = null;
```

And update the select query (line 29) to include `createdAt`:
```typescript
const [found] = await db
  .select({ id: users.id, email: users.email, displayName: users.displayName, createdAt: users.createdAt })
  .from(users)
  .where(eq(users.id, payload.userId))
  .limit(1);
```

Also update return type in `context.ts` — the `createContext` return type is inferred, so no explicit type needed there.

Check that the `me` handler uses `context.user` directly — it already does, so returning the user with createdAt should work.

- [ ] **Step 3: Lint and type-check**

```bash
bun run check
```

Fix any formatting issues. Expected: clean.

---

### Task 5: Verification

- [ ] **Step 1: Full type check**

```bash
bun run check-types
```

Expected: No errors.

- [ ] **Step 2: Lint check**

```bash
bun run check
```

Expected: Clean lint, no format issues.

- [ ] **Step 3: Build check**

```bash
bun run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Run existing tests**

```bash
bun vitest run
```

Expected: Existing tests still pass.
