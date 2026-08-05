<script lang="ts">
  type MapCardData = {
    id: string;
    title: string;
    problemStatement: string;
    status: string;
    updatedAt: string | Date;
    topicName?: string;
  };

  let {
    map,
    onclick,
  }: {
    map: MapCardData;
    onclick?: () => void;
  } = $props();
</script>

<button
  {onclick}
  class="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 text-left transition-colors hover:border-neutral-700 hover:bg-neutral-900"
>
  <h3 class="mb-1 truncate font-medium">{map.title || "Untitled Map"}</h3>
  {#if map.topicName}
    <span class="mb-2 inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
      {map.topicName}
    </span>
  {/if}
  <p class="mb-2 line-clamp-2 text-sm text-neutral-400">{map.problemStatement}</p>
  <div class="flex items-center justify-between text-xs text-neutral-500">
    <span class={map.status === "completed" ? "text-green-400" : "text-yellow-400"}>
      {map.status === "completed" ? "Completed" : "In Progress"}
    </span>
    <span>{new Date(map.updatedAt).toLocaleDateString()}</span>
  </div>
</button>
