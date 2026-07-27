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

  const activeTab = $derived(
    $page.url.searchParams.get("tab") === "settings" ? "settings" : "profile",
  );

  // Settings: display name
  let displayName = $state("");
  let displayNameDirty = $state(false);
  let nameSaved = $state(false);
  let nameError = $state("");

  // Settings: change password
  let currentPassword = $state("");
  let newPassword = $state("");
  let confirmPassword = $state("");
  let passwordError = $state("");
  let passwordSaved = $state(false);

  // Settings: delete account
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
      deleteAccountMutation.mutate({});
    }
  }

  function logout() {
    document.cookie = "session=; path=/; max-age=0";
    goto("/login");
  }

  function formatDate(dateStr: string | Date | undefined): string {
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
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"></div>
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
      <!-- ===== PROFILE TAB ===== -->
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
      <!-- ===== SETTINGS TAB ===== -->
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
            <h2 class="mb-1 text-lg font-semibold text-red-400">Confirm Deletion</h2>
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
