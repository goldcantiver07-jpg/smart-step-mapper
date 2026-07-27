<script lang="ts">
  import { page } from "$app/stores";

  const navItems = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/maps", label: "Maps", icon: "🗺️" },
    { href: "/create", label: "Create", icon: "➕" },
    { href: "/progress", label: "Progress", icon: "📊" },
    { href: "/profile", label: "Profile", icon: "👤" },
  ] as const;

  const currentPath = $derived($page.url.pathname);
</script>

<nav class="fixed bottom-0 left-0 right-0 border-t border-neutral-800 bg-neutral-950 md:hidden">
  <div class="flex justify-around py-2">
    {#each navItems as item}
      <a
        href={item.href}
        class="flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors
          {currentPath === item.href ? 'text-blue-400' : 'text-neutral-500 hover:text-neutral-300'}"
      >
        <span class="text-lg">{item.icon}</span>
        <span>{item.label}</span>
      </a>
    {/each}
  </div>
</nav>
