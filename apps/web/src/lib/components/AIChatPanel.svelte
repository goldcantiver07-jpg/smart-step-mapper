<script lang="ts">
  import { orpc } from "$lib/orpc";
  import { createMutation } from "@tanstack/svelte-query";

  type Message = {
    role: "user" | "assistant";
    content: string;
  };

  let {
    mapId,
    mapTitle,
    problemStatement,
    topicName,
  }: {
    mapId: string;
    mapTitle: string;
    problemStatement: string;
    topicName?: string;
  } = $props();

  let messages = $state<Message[]>([
    {
      role: "assistant",
      content: `👋 I'm your AI tutor! Ask me anything about "${mapTitle || problemStatement.slice(0, 60)}".${topicName ? ` I see this is a ${topicName} problem.` : ""} I can help you break it down, explain concepts, or give hints.`,
    },
  ]);
  let input = $state("");
  let chatContainer: HTMLDivElement | undefined = $state(undefined);

  const chatMutation = createMutation(
    () =>
      orpc.chat.sendMessage.mutationOptions({
        onSuccess: (data) => {
          messages = [
            ...messages,
            { role: "assistant", content: data.response },
          ];
        },
        onError: (err) => {
          messages = [
            ...messages,
            {
              role: "assistant",
              content: `❌ Sorry, I encountered an error: ${err.message}`,
            },
          ];
        },
      }),
  );

  function handleSend() {
    const text = input.trim();
    if (!text || chatMutation.isPending) return;

    const userMessage: Message = { role: "user", content: text };
    messages = [...messages, userMessage];
    input = "";

    chatMutation.mutate({
      mapId,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Auto-scroll to bottom when new messages arrive
  $effect(() => {
    if (chatContainer) {
      queueMicrotask(() => {
        chatContainer!.scrollTop = chatContainer!.scrollHeight;
      });
    }
  });

  function getSuggestionEmoji(i: number) {
    const emojis = ["💡", "🔍", "🧮", "📝", "🎯", "📊"];
    return emojis[i % emojis.length];
  }
</script>

<div class="flex h-full flex-col">
  <!-- Header -->
  <div class="mb-4 flex items-center gap-2">
    <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20">
      <svg class="h-3.5 w-3.5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    </div>
    <h2 class="font-display text-sm font-semibold text-surface-200">AI Tutor</h2>
    {#if chatMutation.isPending}
      <div class="ml-auto flex items-center gap-1.5">
        <div class="flex gap-0.5">
          <div class="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" style="animation-delay: 0ms" />
          <div class="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" style="animation-delay: 150ms" />
          <div class="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" style="animation-delay: 300ms" />
        </div>
        <span class="text-[10px] text-violet-400/70">thinking...</span>
      </div>
    {/if}
  </div>

  <!-- Messages -->
  <div
    bind:this={chatContainer}
    class="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-thin"
  >
    {#if messages.length === 1 && !chatMutation.isPending}
      <!-- Initial suggestions -->
      <div class="mb-4 space-y-2">
        <p class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-surface-500">Try asking:</p>
        {#each [
          "How do I start solving this problem?",
          "What formula should I use?",
          "Can you explain this step by step?",
          "What common mistakes should I avoid?",
          "Give me a hint for step 1",
        ] as suggestion, i}
          <button
            onclick={() => {
              input = suggestion;
              handleSend();
            }}
            class="flex w-full items-start gap-2 rounded-lg border border-white/[0.06] px-3 py-2 text-left text-xs text-surface-400 transition-all hover:border-violet-500/20 hover:bg-violet-500/[0.04] hover:text-surface-300"
          >
            <span class="shrink-0">{getSuggestionEmoji(i)}</span>
            <span>{suggestion}</span>
          </button>
        {/each}
      </div>
    {/if}

    {#each messages as msg, i}
      <div
        class="animate-fade-in-up stagger-{Math.min(i + 1, 6)} flex items-start gap-2.5"
        class:flex-row-reverse={msg.role === "user"}
      >
        <!-- Avatar -->
        {#if msg.role === "assistant"}
          <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/15 to-purple-600/15">
            <svg class="h-3.5 w-3.5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
        {:else}
          <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/15">
            <svg class="h-3.5 w-3.5 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        {/if}

        <!-- Bubble -->
        <div
          class="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed
            {msg.role === 'assistant'
              ? 'rounded-tl-sm border border-white/[0.06] bg-surface-800/50 text-surface-300'
              : 'rounded-tr-sm bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/10'}"
        >
          {msg.content}
        </div>
      </div>
    {/each}

    {#if chatMutation.isPending}
      <div class="flex items-start gap-2.5">
        <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/15 to-purple-600/15">
          <svg class="h-3.5 w-3.5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div class="rounded-xl rounded-tl-sm border border-white/[0.06] bg-surface-800/50 px-3 py-2">
          <div class="flex gap-1">
            <div class="h-2 w-2 animate-bounce rounded-full bg-surface-500" style="animation-delay: 0ms" />
            <div class="h-2 w-2 animate-bounce rounded-full bg-surface-500" style="animation-delay: 150ms" />
            <div class="h-2 w-2 animate-bounce rounded-full bg-surface-500" style="animation-delay: 300ms" />
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Input -->
  <div class="mt-3 border-t border-white/[0.06] pt-3">
    <div class="relative">
      <textarea
        bind:value={input}
        onkeydown={handleKeydown}
        rows={2}
        disabled={chatMutation.isPending}
        class="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 pr-10 text-sm text-surface-200 outline-none transition-all placeholder:text-surface-600 focus:border-violet-500/40 focus:bg-violet-500/[0.04] focus:shadow-[0_0_0_1px_rgba(139,92,246,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Ask for help..."
      />
      <button
        onclick={handleSend}
        disabled={!input.trim() || chatMutation.isPending}
        class="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20 transition-all hover:brightness-110 active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  </div>
</div>
