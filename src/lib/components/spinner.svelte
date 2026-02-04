<!-- Spinner.svelte -->
<script lang="ts">
  export let size: "xs" | "sm" | "md" | "lg" = "md";
  export let color: "current" | "primary" | "white" | "black" = "current";
  export let label = "Loading";

  const sizeClass: Record<typeof size, string> = {
    xs: "h-3 w-3 border-2",
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-4",
  };

  const colorClass: Record<typeof color, string> = {
    current: "text-current",
    primary: "text-blue-600",
    white: "text-white",
    black: "text-black",
  };
</script>

<span class="inline-flex items-center gap-2" role="status" aria-live="polite" aria-label={label}>
  <span
    class={`animate-spin rounded-full border-current border-t-transparent ${sizeClass[size]} ${colorClass[color]}`}
    aria-hidden="true"
  ></span>
  <span class="sr-only">{label}</span>
</span>
