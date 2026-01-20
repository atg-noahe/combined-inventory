<script lang="ts">
	import type { Device } from "$lib/inventory/devices";
	import { onMount } from "svelte";
    import Fuse from "fuse.js";
	import { Pagination } from "@skeletonlabs/skeleton-svelte";
	import { ArrowLeftIcon, ArrowRightIcon, Ellipsis } from "lucide-svelte";
	import { GetToken } from "$lib/auth/msal.svelte";
    const PAGE_SIZE = 25

    let devices: Device[] = $state([]);
    const options = {
        threshold: 0.1,
        keys: [
            "device_name",
            "org_name",
        ]
    };
    let devIndex: Fuse<Device> = $derived(new Fuse(devices, options))
    onMount(async () => {
        const token = await GetToken(["api://deec1bcd-3785-4edb-b656-f51f1a31008b/access_as_user"]);
        const resp = await fetch('https://api.atgfw.com/api/combined-inventory/devices', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        devices = await resp.json();
    });
    let filter = $state("");
    let page = $state(1);

    const start = $derived((page-1) * PAGE_SIZE)
    const end = $derived(start + PAGE_SIZE)
    let filtered_devices = $derived((filter ? devIndex.search(filter).map(r => r.item): devices))
</script>

<div class="m-5">
    <div>
        <input class="input" type="search" placeholder="Search by Device Name, Org Name, Etc" bind:value={filter}>
    </div>
    <div class="table-wrap my-5">
        <table class="table">
            <thead>
                <tr>
                    <th>
                        Device Name
                    </th>
                    <th>
                        Organization Name
                    </th>
                    <th>
                        Sources
                    </th>
                    <th>
                        Last Seen
                    </th>
                </tr>
            </thead>
            <tbody>
                {#each filtered_devices.slice(start, end) as device}
                    <tr>
                        <td>
                            {device.device_name}
                        </td>
                        <td>
                            {device.org_name}
                        </td>
                        <td>
                            {#if device.immybot_id}
                            <a href="http://atgfw.immy.bot/computers/{device.immybot_id}">
                                <span class="badge bg-green-800">ImmyBot</span>
                            </a>
                            {:else}
                                <span class="badge bg-red-800">ImmyBot</span>
                            {/if}
                            {#if device.ninja_id}
                            <a href="http://atgfw.immy.bot/computers/{device.immybot_id}">
                                <span class="badge bg-green-800">NinjaRMM</span>
                            </a>
                            {:else}
                                <span class="badge bg-red-800">NinjaRMM</span>
                            {/if}
                        </td>
                        <td>
                            {device.last_seen}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
    <Pagination count={filtered_devices.length} pageSize={PAGE_SIZE} {page} onPageChange={(event) => (page = event.page)}>
        <Pagination.PrevTrigger>
            <ArrowLeftIcon class="size-4" />
        </Pagination.PrevTrigger>
        <Pagination.Context>
            {#snippet children(pagination)}
                {#each pagination().pages as page, index (page)}
                    {#if page.type === 'page'}
                        <Pagination.Item {...page}>
                            {page.value}
                        </Pagination.Item>
                    {:else}
                        <Pagination.Ellipsis {index}>&#8230;</Pagination.Ellipsis>
                    {/if}
                {/each}
            {/snippet}
        </Pagination.Context>
        <Pagination.NextTrigger>
            <ArrowRightIcon class="size-4"></ArrowRightIcon>
        </Pagination.NextTrigger>
    </Pagination>
</div>