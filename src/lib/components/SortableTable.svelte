<script module lang="ts">
    export type ColumnDef<T> = {
        key: string;
        label: string;
        sortable?: boolean;
        sortFn?: (a: T, b: T) => number;
    };
</script>

<script lang="ts" generics="T extends Record<string, any>">
    import Fuse from "fuse.js";
    import { Pagination } from "@skeletonlabs/skeleton-svelte";
    import { ArrowLeftIcon, ArrowRightIcon, ChevronUp, ChevronDown } from "lucide-svelte";
    import type { Snippet } from "svelte";

    let {
        items,
        columns,
        searchKeys,
        pageSize = 25,
        searchPlaceholder = "Search...",
        defaultSort = null,
        rowKey,
        filterFn,
        filteredItems = $bindable([]),
        toolbar,
        headerPrefix,
        headerContent,
        row,
    }: {
        items: T[];
        columns: ColumnDef<T>[];
        searchKeys: string[];
        pageSize?: number;
        searchPlaceholder?: string;
        defaultSort?: { column: string; direction: 'asc' | 'desc' } | null;
        rowKey: (item: T) => string;
        filterFn?: (items: T[]) => T[];
        filteredItems?: T[];
        toolbar?: Snippet;
        headerPrefix?: Snippet<[T[]]>;
        headerContent?: Snippet<[ColumnDef<T>]>;
        row: Snippet<[T]>;
    } = $props();

    let filter = $state("");
    let page = $state(1);
    // svelte-ignore state_referenced_locally
    let sortColumn: string | null = $state(defaultSort?.column ?? null);
    // svelte-ignore state_referenced_locally
    let sortDirection: 'asc' | 'desc' = $state(defaultSort?.direction ?? 'asc');

    const fuseIndex = $derived(new Fuse(items, { threshold: 0.1, keys: searchKeys }));

    function toggleSort(key: string) {
        if (sortColumn === key) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortColumn = key;
            sortDirection = 'asc';
        }
    }

    const start = $derived((page - 1) * pageSize);
    const end = $derived(start + pageSize);

    let sorted = $derived.by(() => {
        let result = filter ? fuseIndex.search(filter).map(r => r.item) : items;
        if (filterFn) result = filterFn(result);
        if (sortColumn) {
            const sc = sortColumn;
            const col = columns.find(c => c.key === sc);
            const dir = sortDirection === 'asc' ? 1 : -1;
            result = [...result].sort((a, b) => {
                if (col?.sortFn) return dir * col.sortFn(a, b);
                const aVal = a[sc] ?? '';
                const bVal = b[sc] ?? '';
                return dir * String(aVal).localeCompare(String(bVal));
            });
        }
        return result;
    });

    let paged = $derived(sorted.slice(start, end));

    $effect(() => {
        filteredItems = sorted;
    });

    $effect(() => {
        const maxPage = Math.max(1, Math.ceil(sorted.length / pageSize));
        if (page > maxPage) page = maxPage;
    });
</script>

<div class="flex flex-row gap-2">
    <input class="input" type="search" placeholder={searchPlaceholder} bind:value={filter}>
    {#if toolbar}{@render toolbar()}{/if}
</div>
<div class="table-wrap my-5">
    <table class="table">
        <thead>
            <tr>
                {#if headerPrefix}{@render headerPrefix(paged)}{/if}
                {#each columns as col (col.key)}
                    {#if col.sortable !== false}
                        <th class="cursor-pointer select-none" onclick={() => toggleSort(col.key)}>
                            <div class="flex flex-row items-center gap-2">
                                {#if headerContent}{@render headerContent(col)}{/if}
                                {col.label}
                                {#if sortColumn === col.key}
                                    {#if sortDirection === 'asc'}<ChevronUp size={14} />{:else}<ChevronDown size={14} />{/if}
                                {/if}
                            </div>
                        </th>
                    {:else}
                        <th>
                            <div class="flex flex-row items-center gap-2">
                                {#if headerContent}{@render headerContent(col)}{/if}
                                {col.label}
                            </div>
                        </th>
                    {/if}
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each paged as item (rowKey(item))}
                <tr>
                    {@render row(item)}
                </tr>
            {/each}
        </tbody>
    </table>
</div>
<Pagination count={sorted.length} {pageSize} {page} onPageChange={(event) => (page = event.page)}>
    <Pagination.PrevTrigger>
        <ArrowLeftIcon class="size-4" />
    </Pagination.PrevTrigger>
    <Pagination.Context>
        {#snippet children(pagination)}
            {#each pagination().pages as pg, index (pg)}
                {#if pg.type === 'page'}
                    <Pagination.Item {...pg}>
                        {pg.value}
                    </Pagination.Item>
                {:else}
                    <Pagination.Ellipsis {index}>&#8230;</Pagination.Ellipsis>
                {/if}
            {/each}
        {/snippet}
    </Pagination.Context>
    <Pagination.NextTrigger>
        <ArrowRightIcon class="size-4" />
    </Pagination.NextTrigger>
</Pagination>
