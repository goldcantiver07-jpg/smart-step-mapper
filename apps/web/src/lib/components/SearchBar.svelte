<script lang="ts">
  let { value = $bindable(""), placeholder = "Search..." }: { value: string; placeholder?: string } = $props();
</script>

<div class="relative">
  <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
  </svg>
  <input
    type="text"
    bind:value={value}
    {placeholder}
    class="w-full rounded-lg border border-neutral-700 bg-neutral-900 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
  />
</div>
