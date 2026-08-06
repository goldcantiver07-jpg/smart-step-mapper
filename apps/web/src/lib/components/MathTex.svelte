<script lang="ts">
  import katex from "katex";

  let {
    tex,
    block = false,
  }: {
    tex: string;
    block?: boolean;
  } = $props();

  // renderToString is synchronous and pure → safe for SSR. throwOnError:true so
  // malformed LaTeX falls back to the plain-text rendering below instead of
  // showing KaTeX's red error output.
  const rendered = $derived((() => {
    const trimmed = (tex ?? "").trim();
    if (!trimmed) return null;
    try {
      return katex.renderToString(trimmed, {
        throwOnError: true,
        displayMode: block,
        output: "html",
        strict: false,
      });
    } catch {
      return null;
    }
  })());
</script>

{#if rendered}
  {@html rendered}
{:else}
  <code
    class="inline-block rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[0.95em] text-surface-200"
  >{tex}</code>
{/if}
