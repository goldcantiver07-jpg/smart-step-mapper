<script lang="ts">
  import { orpc } from "$lib/orpc";
  import { createMutation } from "@tanstack/svelte-query";
  import { isEmailValid } from "$lib/validation";
  import { goto } from "$app/navigation";
  import ErrorPopup from "$lib/components/ErrorPopup.svelte";
  import { getAuthErrorMessage, getErrorCode, getErrorMessage } from "$lib/errors";

  let email = $state("");
  let password = $state("");
  let formError = $state("");
  let popupMessage = $state("");
  let emailError = $state("");
  let passwordError = $state("");
  let emailFocused = $state(false);
  let passwordFocused = $state(false);
  let emailTouched = $state(false);
  let passwordTouched = $state(false);
  let showPassword = $state(false);

  // Validation helpers
  function getEmailError(): string {
    if (!email) return "Email is required";
    if (!isEmailValid(email)) return "Enter a valid email address";
    return "";
  }

  function getPasswordError(): string {
    if (!password) return "Password is required";
    return "";
  }

  // Known server messages map to their field; unexpected failures get a clear popup
  function handleServerError(err: unknown) {
    formError = "";
    emailError = "";
    passwordError = "";
    popupMessage = "";

    const message = getErrorMessage(err);

    if (message.includes("No account found")) {
      emailError = message;
      return;
    }
    if (message.includes("Incorrect password")) {
      passwordError = message;
      return;
    }

    // Server rejected the input — show a friendly inline message
    const code = getErrorCode(err);
    if (code === "BAD_REQUEST" || code === "UNPROCESSABLE_CONTENT") {
      formError = getAuthErrorMessage(err);
      return;
    }

    // Unexpected failure ("Internal server error", network, …) → descriptive popup
    popupMessage = getAuthErrorMessage(err);
  }

  const loginMutation = createMutation(
    () =>
      orpc.auth.login.mutationOptions({
        onSuccess: (data) => {
          document.cookie = `session=${data.token}; path=/; max-age=604800; samesite=lax`;
          goto("/");
        },
        onError: (err) => {
          handleServerError(err);
        },
      }),
  );

  function handleSubmit(e: Event) {
    e.preventDefault();
    formError = "";
    popupMessage = "";
    emailError = "";
    passwordError = "";
    emailTouched = true;
    passwordTouched = true;

    const emailErr = getEmailError();
    if (emailErr) {
      emailError = emailErr;
      return;
    }

    loginMutation.mutate({ email, password });
  }

  function handleEmailBlur() {
    emailTouched = true;
    emailError = getEmailError();
  }

  function handlePasswordBlur() {
    passwordTouched = true;
    passwordError = getPasswordError();
  }

  // Clear field error on input
  function handleEmailInput() {
    emailError = "";
    formError = "";
    popupMessage = "";
  }

  function handlePasswordInput() {
    passwordError = "";
    formError = "";
    popupMessage = "";
  }
</script>

<svelte:head>
  <title>Sign In — Smart Step Mapper</title>
</svelte:head>

<!-- Background -->
<div class="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
  <div class="animate-gradient absolute -left-[10%] -top-[20%] h-[60%] w-[50%] rounded-full bg-gradient-to-br from-brand-500/20 via-brand-600/10 to-transparent blur-[120px]" />
  <div class="absolute -bottom-[15%] -right-[10%] h-[50%] w-[40%] rounded-full bg-gradient-to-tl from-violet-500/15 via-purple-600/10 to-transparent blur-[100px]" />
  <div class="absolute left-[30%] top-[40%] h-[30%] w-[30%] rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-600/10 blur-[80px]" />
  <!-- Grain overlay -->
  <div class="absolute inset-0 opacity-[0.03]" style="background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJmIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgbnVtT2N0YXZlcz0iMyIgc3R5bGU9ImZsb2NvbG9yOiB3aGl0ZTtjb2xvcjogd2hpdGUiLz48ZmVTY29yZWxpZ2h0aW5nIHJlc3VsdD0ic3R1ZmYiLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjZikiLz48L3N2Zz4=')" />
</div>

<div class="flex min-h-svh">
  <!-- Left: Brand Section (hidden on mobile) -->
  <div class="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-surface-950/50 p-12 lg:flex">
    <div class="animate-float absolute left-[15%] top-[20%] h-24 w-24 rounded-full border border-brand-400/20 bg-brand-400/5" />
    <div class="animate-float absolute bottom-[25%] left-[25%] h-16 w-16 rounded-full border border-violet-400/20 bg-violet-400/5" style="animation-delay: -2s" />
    <div class="animate-float absolute right-[20%] top-[35%] h-20 w-20 rounded-full border border-cyan-400/20 bg-cyan-400/5" style="animation-delay: -4s" />

    <div class="animate-fade-in-up stagger-1 relative z-10 text-center">
      <div class="mb-6 inline-flex items-center justify-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg shadow-brand-500/25">
          <svg class="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20V10" />
            <path d="M18 20V4" />
            <path d="M6 20v-4" />
          </svg>
        </div>
      </div>
      <h1 class="font-display text-4xl font-bold text-white">
        Smart Step<br />
        <span class="bg-gradient-to-r from-brand-400 to-cyan-400 bg-clip-text text-transparent">Mapper</span>
      </h1>
      <p class="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-surface-400">
        Map your learning journey one step at a time. Create structured paths, track progress, and achieve your goals.
      </p>
    </div>

    <div class="animate-fade-in-up stagger-3 mt-12 space-y-4">
      <div class="flex items-center gap-3">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
          <svg class="h-4 w-4 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <span class="text-sm text-surface-300">Break down complex topics into manageable steps</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
          <svg class="h-4 w-4 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <span class="text-sm text-surface-300">Visualize progress with interactive maps</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
          <svg class="h-4 w-4 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <span class="text-sm text-surface-300">Secure and private — your data stays yours</span>
      </div>
    </div>

    <div class="animate-fade-in-up stagger-4 absolute bottom-12 left-12 right-12">
      <div class="h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
    </div>
  </div>

  <!-- Right: Form Section -->
  <div class="flex w-full items-center justify-center p-4 lg:w-1/2">
    <div class="animate-scale-in stagger-2 w-full max-w-sm">
      <!-- Glassmorphism card -->
      <div class="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-surface-900/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <!-- Mobile brand mark -->
        <div class="mb-6 flex items-center gap-3 lg:hidden">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
            <svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-4" />
            </svg>
          </div>
          <div>
            <span class="font-display text-sm font-semibold text-white">Smart Step Mapper</span>
          </div>
        </div>

        <h2 class="font-display text-2xl font-bold text-white">Welcome back</h2>
        <p class="mt-1.5 text-sm text-surface-400">Enter your credentials to continue</p>

        <!-- General error message (mounted always for layout stability) -->
        <div
          class="mt-5 min-h-[2.5rem]"
          class:pointer-events-none={!formError}
          role="alert"
          aria-live="polite"
        >
          {#if formError}
            <div class="animate-fade-in-up rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
              <div class="flex items-center gap-2">
                <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{formError}</span>
              </div>
            </div>
          {/if}
        </div>

        <form onsubmit={handleSubmit} class="mt-2 space-y-5" novalidate>
          <!-- Email input -->
          <div class="relative">
            <input
              bind:value={email}
              oninput={handleEmailInput}
              onfocus={() => (emailFocused = true)}
              onblur={handleEmailBlur}
              type="email"
              id="email"
              autocomplete="email"
              required
              aria-invalid={emailError ? "true" : "false"}
              aria-describedby={emailError ? "email-error" : undefined}
              class="peer w-full rounded-xl border bg-white/[0.04] px-4 pb-2 pt-7 text-sm text-white outline-none transition-all duration-200 placeholder:text-transparent focus:shadow-[0_0_0_1px] {emailError ? 'border-red-500/50 bg-red-500/[0.04] focus:border-red-500/60 focus:shadow-red-500/20' : 'border-white/[0.08] focus:border-brand-500/50 focus:bg-brand-500/[0.04] focus:shadow-brand-500/20'}"
              placeholder="you@example.com"
              class:animate-[shake_0.4s_ease-in-out]={emailError && emailTouched}
            />
            <label
              for="email"
              class="pointer-events-none absolute left-4 top-2 text-xs font-medium transition-all duration-200 {emailError ? 'text-red-400' : emailFocused || email ? 'text-brand-400' : 'text-surface-500'}"
            >
              Email address
            </label>
            <div class="pointer-events-none absolute inset-x-0 bottom-0 h-px scale-x-0 rounded-full bg-gradient-to-r transition-transform duration-300 peer-focus:scale-x-100 {emailError ? 'from-red-500 to-red-400' : 'from-brand-500 to-cyan-400'}" />
            {#if emailError && emailTouched}
              <p id="email-error" class="mt-1.5 animate-fade-in-up text-xs text-red-400" role="alert">
                {emailError}
              </p>
            {/if}
          </div>

          <!-- Password input -->
          <div class="relative">
            <input
              bind:value={password}
              oninput={handlePasswordInput}
              onfocus={() => (passwordFocused = true)}
              onblur={handlePasswordBlur}
              type={showPassword ? "text" : "password"}
              id="password"
              autocomplete="current-password"
              required
              aria-invalid={passwordError ? "true" : "false"}
              aria-describedby={passwordError ? "password-error" : undefined}
              class="peer w-full rounded-xl border bg-white/[0.04] px-4 pb-2 pt-7 text-sm text-white outline-none transition-all duration-200 placeholder:text-transparent focus:shadow-[0_0_0_1px] {passwordError ? 'border-red-500/50 bg-red-500/[0.04] focus:border-red-500/60 focus:shadow-red-500/20' : 'border-white/[0.08] focus:border-brand-500/50 focus:bg-brand-500/[0.04] focus:shadow-brand-500/20'}"
              placeholder="••••••••"
              class:animate-[shake_0.4s_ease-in-out]={passwordError && passwordTouched}
            />
            <label
              for="password"
              class="pointer-events-none absolute left-4 top-2 text-xs font-medium transition-all duration-200 {passwordError ? 'text-red-400' : passwordFocused || password ? 'text-brand-400' : 'text-surface-500'}"
            >
              Password
            </label>
            <div class="pointer-events-none absolute inset-x-0 bottom-0 h-px scale-x-0 rounded-full bg-gradient-to-r transition-transform duration-300 peer-focus:scale-x-100 {passwordError ? 'from-red-500 to-red-400' : 'from-brand-500 to-cyan-400'}" />
            <!-- Toggle visibility -->
            <button
              type="button"
              onclick={() => (showPassword = !showPassword)}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 transition-colors hover:text-surface-300"
              aria-controls="password"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {#if showPassword}
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              {:else}
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              {/if}
            </button>
            {#if passwordError && passwordTouched}
              <p id="password-error" class="mt-1.5 animate-fade-in-up text-xs text-red-400" role="alert">
                {passwordError}
              </p>
            {/if}
          </div>

          <!-- Forgot password hint -->
          <div class="flex justify-end">
            <button type="button" class="text-xs text-surface-500 transition-colors hover:text-brand-400">
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            class="relative mt-2 w-full overflow-hidden rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-brand-500/30 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100"
          >
            {#if loginMutation.isPending}
              <span class="flex items-center justify-center gap-2">
                <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </span>
            {:else}
              <span class="relative z-10">Sign In</span>
            {/if}
          </button>
        </form>

        <!-- Divider -->
        <div class="my-6 flex items-center gap-3">
          <div class="h-px flex-1 bg-white/[0.06]" />
          <span class="text-xs text-surface-500">or</span>
          <div class="h-px flex-1 bg-white/[0.06]" />
        </div>

        <p class="text-center text-sm text-surface-400">
          Don't have an account?
          <a href="/register" class="font-medium text-brand-400 transition-colors hover:text-brand-300">
            Create one
          </a>
        </p>
      </div>

      <p class="mt-4 text-center text-xs text-surface-600">
        Protected by end-to-end encryption &bull; We never share your data
      </p>
    </div>
  </div>
</div>

<ErrorPopup
  message={popupMessage}
  title="Couldn't sign you in"
  ondismiss={() => (popupMessage = "")}
/>

<style>
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
    20%, 40%, 60%, 80% { transform: translateX(3px); }
  }
</style>
