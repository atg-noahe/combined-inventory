<script module lang="ts">
    export type SearchFilterItem = {
        label: string,
        value: string
    };
</script>

<script lang="ts">
    import { Combobox, Popover, Portal, type ComboboxRootProps, useListCollection } from "@skeletonlabs/skeleton-svelte";
    import { Search } from "lucide-svelte";
    import type { Snippet } from "svelte";

    let { items: data, value = $bindable([]), icon }: {
        items: SearchFilterItem[],
        value: string[],
        icon?: Snippet
    } = $props();

    let displayItems = $state<SearchFilterItem[]>([]);
    $effect(() => { displayItems = data; });

    const collection = $derived(useListCollection({
        items: displayItems,
        itemToString: (item) => item.label,
        itemToValue: (item) => item.value,
    }));

    const onInputValueChange: ComboboxRootProps['onInputValueChange'] = (event) => {
        const filtered = data.filter(item => item.label.toLowerCase().includes(event.inputValue.toLowerCase()));
        displayItems = filtered.length > 0 ? filtered : data;
    };
    const onOpenChange = () => { displayItems = data; };
    const onValueChange: ComboboxRootProps['onValueChange'] = (event) => { value = event.value; };
</script>

<Popover>
    <Popover.Trigger>
        {#if icon}
            {@render icon()}
        {:else}
            <Search size={18}></Search>
        {/if}
    </Popover.Trigger>
    <Portal>
        <Popover.Positioner>
            <Popover.Content class="card bg-surface-100-900 p-2 rounded">
                <Popover.Arrow class="[--arrow-size:--spacing(2)] [--arrow-background:var(--color-surface-100-900)]">
                    <Popover.ArrowTip></Popover.ArrowTip>
                </Popover.Arrow>
                <Combobox class="w-64" placeholder="Search..." {collection}
                    {onOpenChange} {onInputValueChange}
                    {value} {onValueChange}>
                    <Combobox.Control>
                        <Combobox.Input />
                    </Combobox.Control>
                    <Combobox.ClearTrigger class="btn preset-tonal btn-sm mt-1">Clear</Combobox.ClearTrigger>
                    <Combobox.Content class="max-h-48 overflow-y-auto mt-1">
                        {#each displayItems as item (item.value)}
                            <Combobox.Item {item}>
                                <Combobox.ItemText>{item.label}</Combobox.ItemText>
                                <Combobox.ItemIndicator />
                            </Combobox.Item>
                        {/each}
                    </Combobox.Content>
                </Combobox>
            </Popover.Content>
        </Popover.Positioner>
    </Portal>
</Popover>
