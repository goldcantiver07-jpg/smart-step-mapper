<script lang="ts">
  let {
    message = "",
    title = "Something went wrong",
    ondismiss,
  }: {
    message?: string;
    title?: string;
    ondismiss?: () => void;
  } = $props();

  let leaving = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Restart the auto-dismiss timer whenever a new message appears.
  $effect(() => {
    if (message) {
      leaving = false;
      clearTimeout(timer);
      timer = setTimeout(() => startExit(), 7000);
    }
    return () => clearTimeout(timer);
  });

  function startExit() {
    if (leaving) return;
    leaving = true;
    timer = setTimeout(() => ondismiss?.(), 220);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && message) startExit();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if message}
  <div class="pointer-events-none fixed inset-x-0 top-5 z-[100] flex justify-center px-4 sm:top-6">
    <div
      role="alert"
      aria-live="assertive"
      class="popup pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border border-red-500/25 bg-surface-900/95 shadow-2xl shadow-black/60 backdrop-blur-xl {leaving ? 'popup-exit' : ''}"
    >
      <!-- Top accent line -->
      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent"></div>

      <div class="flex items-start gap-3 p-4">
        <!-- Warning icon -->
        <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15 ring-1 ring-red-500/30">
          <svg class="h-4.5 w-4.5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-surface-100">{title}</p>
          <p class="mt-1 text-sm leading-relaxed text-surface-400">{message}</p>
        </div>

        <button
          type="button"
          onclick={startExit}
          class="-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-white/[0.06] hover:text-surface-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
          aria-label="Dismiss error"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- Auto-dismiss progress bar -->
      <div class="h-0.5 w-full bg-white/[0.04]">
        <div class="progress-line h-full rounded-r-full bg-gradient-to-r from-red-500/70 to-red-400/40"></div>
      </div>
    </div>
  </div>
{/if}

<style>
  .popup {
    animation: pop-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .popup-exit {
    animation: pop-out 0.22s ease forwards;
  }

  .progress-line {
    animation: shrink 7s linear forwards;
  }

  @keyframes pop-in {
    from {
      opacity: 0;
      transform: translateY(-16px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes pop-out {
    from {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    to {
      opacity: 0;
      transform: translateY(-12px) scale(0.98);
    }
  }

  @keyframes shrink {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .popup,
    .popup-exit,
    .progress-line {
      animation: none;
    }
  }
</style>
