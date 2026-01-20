<script lang="ts">
	import type { Device } from "$lib/inventory/devices";
	import { onMount } from "svelte";
    import Fuse from "fuse.js";
	import { Pagination, Popover, Portal } from "@skeletonlabs/skeleton-svelte";
	import { ArrowLeftIcon, ArrowRightIcon, Ellipsis } from "lucide-svelte";
	import { GetToken } from "$lib/auth/msal.svelte";
    const PAGE_SIZE = 25

    let selected_devices: string[] = $state([]);
    let show_devices: boolean = $state(false);

    let devices: Device[] = $state([]);
    const options = {
        threshold: 0.1,
        keys: [
            "device_name",
            "org_name",
        ]
    };
    let devIndex: Fuse<Device> = $derived(new Fuse(devices, options));
    
    function CheckboxHandler(ev: Event & { currentTarget: EventTarget & HTMLInputElement}) {
        const val = ev.currentTarget.value;
        if (selected_devices.includes(val)) {
            selected_devices = selected_devices.filter((dev) => dev !== val);
        }
        else {
            selected_devices.push(val);
        }
    }
    
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
    {#if selected_devices.length > 0}
        <div class="flex flex-row justify-between">
            <button class="flex flex-row items-center p-2 " onclick={() => show_devices = !show_devices}>
                {#if show_devices}
                    <span class="icon-[material-symbols--expand-circle-down-rounded]" style="width: 1.2em; height: 1.2em;"></span>
                {:else}
                    <span class="icon-[material-symbols--expand-circle-right-rounded]" style="width: 1.2em; height: 1.2em;"></span>
                {/if}
                &nbsp;
                <div>
                    {selected_devices.length} Device(s) Selected
                </div>
            </button>
            <div>
                <button type="button" class="btn preset-outlined" onclick={() => {
                    selected_devices = [];
                    show_devices = false;}}>
                    Discard List
                </button>
                <button type="button" disabled={true} class="btn preset-filled-error-500 text-white">
                    Unmonitor Devices
                </button>
            </div>
        </div>
        {#if show_devices}
        <div class="my-2 p-2 rounded-2xl border">
            {#each selected_devices as device}
            <div>
                {JSON.parse(device).device_name}
            </div>
            {/each}
        </div>
        {/if}
    {/if}
    <div>
        <input class="input" type="search" placeholder="Search by Device Name, Org Name, Etc" bind:value={filter}>
    </div>
    <div class="table-wrap my-5">
        <table class="table">
            <thead>
                <tr>
                    <th>
                    </th>
                    <th>
                        Device Name
                    </th>
                    <th>
                        Organization Name
                    </th>
                    <th>
                        Status
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
                            <input class="checkbox" type="checkbox" checked={selected_devices.includes(JSON.stringify(device))}
                            value={JSON.stringify(device)} oninput={CheckboxHandler}/>
                        </td>
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
                            <a href="https://app.ninjarmm.com/#/deviceDashboard/{device.ninja_id}/overview">
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