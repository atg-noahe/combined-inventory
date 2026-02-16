<script module lang="ts">
    export type FilterOption = {
        name: string,
        value: "optional"|"required"|"forbidden"
    };
</script>

<script lang="ts">
    import { Popover, Portal } from "@skeletonlabs/skeleton-svelte";
    import { Check, Funnel, X } from "lucide-svelte";

    let { options = $bindable() }: {options: FilterOption[]} = $props();

</script>

<Popover>
    <Popover.Trigger><Funnel></Funnel></Popover.Trigger>
    <Portal>
        <Popover.Positioner>
            <Popover.Content class="card bg-surface-100-900 p-2 rounded">
                <Popover.Arrow class="[--arrow-size:--spacing(2)] [--arrow-background:var(--color-surface-100-900)]">
                    <Popover.ArrowTip></Popover.ArrowTip>
                </Popover.Arrow>
                <div class="flex flex-col gap-2">
                    {#each options as option (option.name)}
                    <button
                        class="grid grid-cols-[1fr_auto] gap-x-8 hover:bg-surface-200-800 px-3 py-1 rounded text-start items-center"
                        onclick={() => {
                            console.log(option.value)
                            switch (option.value) {
                                case "optional": 
                                    option.value = "required";
                                    break;
                                case "required":
                                    option.value = "forbidden";
                                    break;
                                case "forbidden":
                                    option.value = "optional";
                                    break;
                            }
                        }}>
                        <div>{option.name}</div>
                        <div class="w-4">
                            {#if option.value === "required"}
                            <Check></Check>
                            {:else if option.value === "forbidden"}
                            <X></X>
                            {/if}
                        </div>
                    </button>
                    {/each}
                </div>
            </Popover.Content>
        </Popover.Positioner>
    </Portal>
</Popover>