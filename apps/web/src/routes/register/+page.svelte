<script lang="ts">
  import { createMutation } from "@tanstack/svelte-query";
  import { orpc } from "$lib/orpc";
  import { isEmailValid, isPasswordValid, isDisplayNameValid } from "$lib/validation";
  import { goto } from "$app/navigation";

  let email = $state("");
  let password = $state("");
  let displayName = $state("");
  let formError = $state("");
  let emailError = $state("");
  let passwordError = $state("");
  let nameError = $state("");

  let emailFocused = $state(false);
  let passwordFocused = $state(false);
  let nameFocused = $state(false);
  let emailTouched = $state(false);
  let passwordTouched = $state(false);
  let nameTouched = $state(false);
  let showPassword = $state(false);

  // Validation helpers
  function getNameError(): string {
    if (!displayName) return "Display name is required";
    if (displayName.trim().length > 100) return "Display name must be 100 characters or less";
    return "";
  }

  function getEmailError(): string {
    if (!email) return "Email is required";
    if (!isEmailValid(email)) return "Enter a valid email address";
    return "";
  }

  function getPasswordError(): string {
    if (!password) return "Password is required";
    if (!isPasswordValid(password)) return "Password must be at least 6 characters";
    return "";
  }

  function handleServerError(message: string) {
    formError = "";
    emailError = "";
    passwordError = "";
    nameError = "";

    if (message.includes("already registered")) {
      emailError = message;
    } else {
      formError = message;
    }
  }

  const registerMutation = createMutation(
    () =>
      orpc.auth.register.mutationOptions({
        onSuccess: (data) => {
          document.cookie = `session=${data.token}; path=/; max-age=604800; samesite=lax`;
          goto("/");
        },
        onError: (err) => {
          handleServerError(err.message);
        },
      }),
  );

  function handleSubmit(e: Event) {
    e.preventDefault();
    formError = "";
    emailError = "";
    passwordError = "";
    nameError = "";
    nameTouched = true;
    emailTouched = true;
    passwordTouched = true;

    const nameErr = getNameError();
    if (nameErr) { nameError = nameErr; return; }

    const emailErr = getEmailError();
    if (emailErr) { emailError = emailErr; return; }

    const passErr = getPasswordError();
    if (passErr) { passwordError = passErr; return; }

    registerMutation.mutate({ email, password, displayName });
  }

  function handleNameBlur() {
    nameTouched = true;
    nameError = getNameError();
  }

  function handleEmailBlur() {
    emailTouched = true;
    emailError = getEmailError();
  }

  function handlePasswordBlur() {
    passwordTouched = true;
    passwordError = getPasswordError();
  }

  function handleNameInput() { nameError = ""; formError = ""; }
  function handleEmailInput() { emailError = ""; formError = ""; }
  function handlePasswordInput() { passwordError = ""; formError = ""; }

  // Password strength indicator
  const passwordStrength = $derived.by(() => {
    if (!password) return { label: "", color: "", width: "0%" };
    if (password.length < 6) return { label: "Too short", color: "bg-red-500", width: "25%" };
    if (password.length < 8) return { label: "Weak", color: "bg-orange-500", width: "50%" };
    if (password.length < 12) return { label: "Fair", color: "bg-yellow-500", width: "75%" };
    return { label: "Strong", color: "bg-green-500", width: "100%" };
  });
</script>

<svelte:head>
  <title>Create Account — Smart Step Mapper</title>
</svelte:head>

<!-- Background -->
<div class="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
  <div class="animate-gradient absolute -right-[10%] -top-[20%] h-[60%] w-[50%] rounded-full bg-gradient-to-br from-violet-500/20 via-purple-600/10 to-transparent blur-[120px]" />
  <div class="absolute -bottom-[15%] -left-[10%] h-[50%] w-[40%] rounded-full bg-gradient-to-tr from-brand-500/15 via-cyan-600/10 to-transparent blur-[100px]" />
  <div class="absolute right-[30%] top-[40%] h-[30%] w-[30%] rounded-full bg-gradient-to-l from-pink-500/10 to-rose-600/10 blur-[80px]" />
  <!-- Grain overlay -->
  <div class="absolute inset-0 opacity-[0.03]" style="background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJmIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgbnVtT2N0YXZlcz0iMyIgc3R5bGU9ImZsb2NvbG9yOiB3aGl0ZTtjb2xvcjogd2hpdGUiLz48ZmVTY29yZWxpZ2h0aW5nIHJlc3VsdD0ic3R1ZmYiLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjZikiLz48L3N2Zz4=')" />
</div>

<div class="flex min-h-svh">
  <!-- Left: Brand Section (hidden on mobile) -->
  <div class="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-surface-950/50 p-12 lg:flex">
    <div class="animate-float absolute right-[15%] top-[20%] h-24 w-24 rounded-full border border-violet-400/20 bg-violet-400/5" />
    <div class="animate-float absolute bottom-[25%] right-[25%] h-16 w-16 rounded-full border border-purple-400/20 bg-purple-400/5" style="animation-delay: -2s" />
    <div class="animate-float absolute left-[20%] top-[35%] h-20 w-20 rounded-full border border-cyan-400/20 bg-cyan-400/5" style="animation-delay: -4s" />

    <div class="animate-fade-in-up stagger-1 relative z-10 text-center">
      <div class="mb-6 inline-flex items-center justify-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 shadow-lg shadow-violet-500/25">
          <svg class="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        </div>
      </div>
      <h1 class="font-display text-4xl font-bold text-white">
        Start Your<br />
        <span class="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">Journey</span>
      </h1>
      <p class="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-surface-400">
        Join thousands of learners who use Smart Step Mapper to organize, track, and conquer their learning goals.
      </p>
    </div>

    <!-- Testimonial / Quote -->
    <div class="animate-fade-in-up stagger-3 mt-12 max-w-sm">
      <div class="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
        <svg class="mb-2 h-5 w-5 text-violet-400/50" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z" />
        </svg>
        <p class="text-sm italic leading-relaxed text-surface-400">
          "I've never felt so organized in my learning. The step-by-step approach completely changed how I tackle new subjects."
        </p>
        <p class="mt-3 text-xs font-medium text-surface-500">— Alex Chen, Product Designer</p>
      </div>
    </div>

    <div class="animate-fade-in-up stagger-4 absolute bottom-12 left-12 right-12">
      <div class="h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
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
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-purple-600">
            <svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <div>
            <span class="font-display text-sm font-semibold text-white">Smart Step Mapper</span>
          </div>
        </div>

        <h2 class="font-display text-2xl font-bold text-white">Create account</h2>
        <p class="mt-1.5 text-sm text-surface-400">Start mapping your learning journey</p>

        <!-- General error message (mounted always for layout stability) -->
        <div class="mt-5 min-h-[2.5rem]" class:pointer-events-none={!formError} role="alert" aria-live="polite">
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

        <form onsubmit={handleSubmit} class="mt-2 space-y-4" novalidate>
          <!-- Display Name input -->
          <div class="relative">
            <input
              bind:value={displayName}
              oninput={handleNameInput}
              onfocus={() => (nameFocused = true)}
              onblur={handleNameBlur}
              type="text"
              id="displayName"
              autocomplete="name"
              required
              aria-invalid={nameError ? "true" : "false"}
              aria-describedby={nameError ? "name-error" : undefined}
              class="peer w-full rounded-xl border bg-white/[0.04] px-4 pb-2 pt-7 text-sm text-white outline-none transition-all duration-200 placeholder:text-transparent focus:shadow-[0_0_0_1px] {nameError ? 'border-red-500/50 bg-red-500/[0.04] focus:border-red-500/60 focus:shadow-red-500/20' : 'border-white/[0.08] focus:border-violet-500/50 focus:bg-violet-500/[0.04] focus:shadow-violet-500/20'}"
              placeholder="Your name"
              class:animate-[shake_0.4s_ease-in-out]={nameError && nameTouched}
            />
            <label
              for="displayName"
              class="pointer-events-none absolute left-4 top-2 text-xs font-medium transition-all duration-200 {nameError ? 'text-red-400' : nameFocused || displayName ? 'text-violet-400' : 'text-surface-500'}"
            >
              Display name
            </label>
            <div class="pointer-events-none absolute inset-x-0 bottom-0 h-px scale-x-0 rounded-full bg-gradient-to-r transition-transform duration-300 peer-focus:scale-x-100 {nameError ? 'from-red-500 to-red-400' : 'from-violet-500 to-purple-400'}" />
            {#if nameError && nameTouched}
              <p id="name-error" class="mt-1.5 animate-fade-in-up text-xs text-red-400" role="alert">
                {nameError}
              </p>
            {/if}
          </div>

          <!-- Email input -->
          <div class="relative">
            <input
              bind:value={email}
              oninput={handleEmailInput}
              onfocus={() => (emailFocused = true)}
              onblur={handleEmailBlur}
              type="email"
              id="reg-email"
              autocomplete="email"
              required
              aria-invalid={emailError ? "true" : "false"}
              aria-describedby={emailError ? "reg-email-error" : undefined}
              class="peer w-full rounded-xl border bg-white/[0.04] px-4 pb-2 pt-7 text-sm text-white outline-none transition-all duration-200 placeholder:text-transparent focus:shadow-[0_0_0_1px] {emailError ? 'border-red-500/50 bg-red-500/[0.04] focus:border-red-500/60 focus:shadow-red-500/20' : 'border-white/[0.08] focus:border-violet-500/50 focus:bg-violet-500/[0.04] focus:shadow-violet-500/20'}"
              placeholder="you@example.com"
              class:animate-[shake_0.4s_ease-in-out]={emailError && emailTouched}
            />
            <label
              for="reg-email"
              class="pointer-events-none absolute left-4 top-2 text-xs font-medium transition-all duration-200 {emailError ? 'text-red-400' : emailFocused || email ? 'text-violet-400' : 'text-surface-500'}"
            >
              Email address
            </label>
            <div class="pointer-events-none absolute inset-x-0 bottom-0 h-px scale-x-0 rounded-full bg-gradient-to-r transition-transform duration-300 peer-focus:scale-x-100 {emailError ? 'from-red-500 to-red-400' : 'from-violet-500 to-purple-400'}" />
            {#if emailError && emailTouched}
              <p id="reg-email-error" class="mt-1.5 animate-fade-in-up text-xs text-red-400" role="alert">
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
              id="reg-password"
              autocomplete="new-password"
              required
              aria-invalid={passwordError ? "true" : "false"}
              aria-describedby={passwordError ? "reg-password-error" : undefined}
              class="peer w-full rounded-xl border bg-white/[0.04] px-4 pb-2 pt-7 text-sm text-white outline-none transition-all duration-200 placeholder:text-transparent focus:shadow-[0_0_0_1px] {passwordError ? 'border-red-500/50 bg-red-500/[0.04] focus:border-red-500/60 focus:shadow-red-500/20' : 'border-white/[0.08] focus:border-violet-500/50 focus:bg-violet-500/[0.04] focus:shadow-violet-500/20'}"
              placeholder="••••••••"
              class:animate-[shake_0.4s_ease-in-out]={passwordError && passwordTouched}
            />
            <label
              for="reg-password"
              class="pointer-events-none absolute left-4 top-2 text-xs font-medium transition-all duration-200 {passwordError ? 'text-red-400' : passwordFocused || password ? 'text-violet-400' : 'text-surface-500'}"
            >
              Password
            </label>
            <div class="pointer-events-none absolute inset-x-0 bottom-0 h-px scale-x-0 rounded-full bg-gradient-to-r transition-transform duration-300 peer-focus:scale-x-100 {passwordError ? 'from-red-500 to-red-400' : 'from-violet-500 to-purple-400'}" />
            <!-- Toggle visibility -->
            <button
              type="button"
              onclick={() => (showPassword = !showPassword)}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 transition-colors hover:text-surface-300"
              aria-controls="reg-password"
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
              <p id="reg-password-error" class="mt-1.5 animate-fade-in-up text-xs text-red-400" role="alert">
                {passwordError}
              </p>
            {/if}
          </div>

          <!-- Password strength indicator -->
          {#if password.length > 0}
            <div class="animate-fade-in-up -mt-1">
              <div class="flex items-center gap-2">
                <div class="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <div class="h-full rounded-full transition-all duration-300 {passwordStrength.color}" style="width: {passwordStrength.width}"></div>
                </div>
                <span class="text-xs font-medium text-surface-500">{passwordStrength.label}</span>
              </div>
            </div>
          {/if}

          <!-- Password hint -->
          <p class="text-xs text-surface-500">
            Must be at least 6 characters
          </p>

          <button
            type="submit"
            disabled={registerMutation.isPending}
            class="relative mt-2 w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/30 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100"
          >
            {#if registerMutation.isPending}
              <span class="flex items-center justify-center gap-2">
                <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating account...
              </span>
            {:else}
              <span class="relative z-10">Create Account</span>
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
          Already have an account?
          <a href="/login" class="font-medium text-violet-400 transition-colors hover:text-violet-300">
            Sign in
          </a>
        </p>
      </div>

      <p class="mt-4 text-center text-xs text-surface-600">
        By creating an account, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  </div>
</div>

<style>
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
    20%, 40%, 60%, 80% { transform: translateX(3px); }
  }
</style>
