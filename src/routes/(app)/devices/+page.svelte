<script lang="ts">
	import type { Device, DeviceEntry } from "$lib/inventory/devices";
	import { onMount } from "svelte";
    import Fuse from "fuse.js";
	import { Dialog, Menu, Pagination, Portal } from "@skeletonlabs/skeleton-svelte";
	import { ArrowLeftIcon, ArrowRightIcon, Funnel, X } from "lucide-svelte";
	import { GetToken } from "$lib/auth/msal.svelte";
	import Spinner from "$lib/components/spinner.svelte";
    import { DateTime } from "luxon";
	import FilterButton, { type FilterOption } from "$lib/components/FilterButton.svelte";
	import SearchFilter from "$lib/components/SearchFilter.svelte";
	import { toaster } from "$lib/toast";
    import { v4 } from 'uuid'
        const PAGE_SIZE = 25

    let selected_devices: DeviceEntry[] = $state([]);
    let show_devices: boolean = $state(false);
    let devices: DeviceEntry[] = $state([]);
    let deleting: boolean = $state(false);

    const options = {
        threshold: 0.1,
        keys: [
            "device_name",
            "org_name",
            "operating_system",
            "public_ip"
        ]
    };
    let devIndex: Fuse<DeviceEntry> = $derived(new Fuse(devices, options));

    let filters: FilterOption[] = $state([
        {"name": "ImmyBot", "value": "optional"},
        {"name": "Ninja", "value": "optional"},
        {"name": "ATG ID", "value": "optional"}
    ])

    // Org name filter
    let orgFilterValue: string[] = $state([]);
    let orgFilterItems = $derived(
        [...new Set(devices.map(d => d.org_name).filter((n): n is string => n != null))].sort()
            .map(name => ({ label: name, value: name }))
    );

    function get_last_seen(device: Device): Date {
        const ninja_date = device.ninja_last_seen ? new Date(device.ninja_last_seen) : new Date(0)
        const immy_date = device.immybot_last_seen ? new Date(device.immybot_last_seen) : new Date(0)
        return ninja_date > immy_date ? ninja_date : immy_date;
    }

    function seen_recently(last_seen: string | null): boolean{
        const date = last_seen ? DateTime.fromFormat(last_seen, "yyyy-MM-dd HH:mm:ss") : DateTime.fromSeconds(0);
        return (-date.diffNow("days").days) < 30
    }

    
    onMount(async () => {
        const urlParams = new URLSearchParams(window.location.search)
        let data_url = new URL(`${import.meta.env.VITE_API_BASE_URL}/api/combined-inventory/devices`)
        let org_id = urlParams.get('org_id')
        if (org_id) {
            data_url.searchParams.set("org_id", org_id)
        }
        const token = await GetToken(["api://deec1bcd-3785-4edb-b656-f51f1a31008b/access_as_user"]);
        const resp = await fetch(data_url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const apiDevs: Device[] = await resp.json();
        devices = apiDevs.map((d) => {
            return {...d, object_id: v4()}
        })
        devices.sort((a, b) => {
            const aname = a.device_name ? a.device_name : "";
            const bname = b.device_name ? b.device_name : "";
            return aname.localeCompare(bname)
        })
    });
    let filter = $state("");
    let page = $state(1);

    const start = $derived((page-1) * PAGE_SIZE);
    const end = $derived(start + PAGE_SIZE);
    let filtered_devices = $derived.by(() => {
        let result = filter ? devIndex.search(filter).map(r => r.item) : devices;
        for (const f of filters) {
            if (f.value === "optional") continue;
            const required = f.value === "required";
            result = result.filter(d => {
                if (f.name === "ImmyBot") return required ? d.immybot_id != null : d.immybot_id == null;
                if (f.name === "Ninja")   return required ? d.ninja_id != null : d.ninja_id == null;
                if (f.name === "ATG ID")  return required ? d.atg_id != null : d.atg_id == null;
                return true;
            });
        }
        if (orgFilterValue.length > 0) {
            result = result.filter(d => d.org_name != null && orgFilterValue.includes(d.org_name));
        }
        return result;
    });


	function CheckboxHandler(device: DeviceEntry) {
        const idx = selected_devices.indexOf(device);
        if (idx !== -1) {
            selected_devices.splice(idx, 1);
        }
        else {
            selected_devices.push(device);
        }
    }

    async function deleteSelectedDevices() {
        deleting = true;
        try {
            const token = await GetToken(["api://deec1bcd-3785-4edb-b656-f51f1a31008b/access_as_user"]);
            const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/combined-inventory/devices/delete`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(selected_devices.map(({ object_id, ...device }) => device))
            });
            if (resp.ok) {
                devices = devices.filter(d => !selected_devices.includes(d));
                toaster.success({ title: "Success", description: `Deleted ${selected_devices.length} device(s).` });
                selected_devices = [];
                show_devices = false;
            } else {
                toaster.error({ title: "Error", description: "Failed to delete the selected devices." });
            }
        } catch (e) {
            toaster.error({ title: "Error", description: `${e}` });
        } finally {
            deleting = false;
        }
    }
</script>

{#if devices.length != 0}
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
                <Dialog>
                    <Dialog.Trigger class="btn preset-filled-error-500 text-white">
                            Unmonitor Devices
                    </Dialog.Trigger>
                    <Portal>
                        <Dialog.Backdrop class="fixed inset-0 z-50 bg-surface-50-950/50"/>
                        <Dialog.Positioner class="fixed flex justify-center inset-0 z-50 items-center">
                            <Dialog.Content class="card bg-surface-100-900 w-full max-w-xl p-4 space-y-4 shadow-xl
                            transition transition-discrete opacity-0 translate-y-25
                            starting:data-[state=open]:opacity-0 starting:data-[state=open]:translate-y-25
                            data-[state=open]:opacity-100 data-[state=open]:translate-y-0 h-auto">
                                <Dialog.Title class="text-lg font-bol">Are you sure you'd like to unmonitor these devices?</Dialog.Title>
                                <Dialog.Description>
                                    <ul class="list-disc pl-5 max-h-48 overflow-y-auto space-y-1 my-2">
                                        {#each selected_devices as dev}
                                            <li class="text-sm">{dev.device_name}</li>
                                        {/each}
                                    </ul>
                                    This processs cannot be reversed
                                </Dialog.Description>
                                <footer class="flex justify-end gap-2">
                                    <button type="button" class="btn preset-filled" onclick={deleteSelectedDevices} disabled={deleting}>
                                        {#if deleting}
                                            <Spinner size="sm" /> Deleting...
                                        {:else}
                                            Yes, delete them
                                        {/if}
                                    </button>
                                    <Dialog.CloseTrigger class="btn preset-tonal">Cancel</Dialog.CloseTrigger>
                                </footer>
                            </Dialog.Content>
                        </Dialog.Positioner>
                    </Portal>
                </Dialog>
            </div>
        </div>
        {#if show_devices}
        <div class="my-2 p-2 rounded-2xl border">
            {#each selected_devices as device (device.object_id)}
            <div>
                {device.device_name}
            </div>
            {/each}
        </div>
        {/if}
    {/if}
    {#if filters.some(f => f.value !== "optional") || orgFilterValue.length > 0}
    <div class="flex flex-wrap gap-2 mb-2">
        {#each filters.filter(f => f.value !== "optional") as f (f.name)}
            <button class="badge preset-filled-surface-200-800 gap-1 cursor-pointer"
                onclick={() => { f.value = "optional"; }}>
                {f.name}: {f.value}
                <X size={14}></X>
            </button>
        {/each}
        {#each orgFilterValue as org (org)}
            <button class="badge preset-filled-surface-200-800 gap-1 cursor-pointer"
                onclick={() => { orgFilterValue = orgFilterValue.filter(v => v !== org); }}>
                Org: {org}
                <X size={14}></X>
            </button>
        {/each}
    </div>
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
                    <th> Device Name </th>
                    <th>
                        <div class="flex flex-row gap-2">
                            <SearchFilter items={orgFilterItems} bind:value={orgFilterValue}></SearchFilter>
                            Organization Name
                        </div>
                    </th>
                    <th> Operating System </th>
                    <th> Public IP </th>
                    <th>
                        <div class="flex flex-row gap-2">
                            <FilterButton bind:options={filters}></FilterButton>
                            Status
                        </div>
                    </th>
                    <th> Last Seen </th>
                </tr>
            </thead>
            <tbody>
                {#each filtered_devices.slice(start, end) as device (device.object_id)}
                    <tr>
                        <td>
                            <input class="checkbox" type="checkbox" checked={selected_devices.includes(device)}
                            oninput={() => CheckboxHandler(device)}/>
                        </td>
                        <td>
                            {device.device_name}
                        </td>
                        <td>
                            {device.org_name}
                        </td>
                        <td>{device.operating_system}</td>
                        <td>{device.public_ip}</td>
                        <td>
                            {#if device.atg_id}
                            <span class="badge bg-green-800" title={`ATG ID: ${device.atg_id}`}>ATG ID</span>
                            {:else}
                            <span class="badge outline text-gray-200" title={`Unidentified`}>ATG ID</span>
                            {/if}
                            {#if device.immybot_id}
                            <a href="http://atgfw.immy.bot/computers/{device.immybot_id}"
                                target="_blank">
                                <span 
                                    class={`badge ${seen_recently(device.immybot_last_seen) ? 'bg-green-800': 'bg-yellow-800'}`}
                                    title={`ImmyBot ID: ${device.immybot_id}`}>
                                    ImmyBot
                                </span>
                            </a>
                            {:else}
                                <span class="badge bg-red-800">ImmyBot</span>
                            {/if}
                            {#if device.ninja_id}
                            <a href="https://app.ninjarmm.com/#/deviceDashboard/{device.ninja_id}/overview"
                                target="_blank">
                                <span
                                    class={`badge ${seen_recently(device.ninja_last_seen) ? 'bg-green-800': 'bg-yellow-800'}`}
                                    title={`Ninja ID: ${device.ninja_id}`}>
                                    NinjaRMM
                                </span>
                            </a>
                            {:else}
                                <span class="badge bg-red-800">NinjaRMM</span>
                            {/if}
                        </td>
                        <td>
                            {get_last_seen(device).toLocaleString()}
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
{:else}
<div class="w-full flex flex-row justify-center mt-30">
    <Spinner size="lg"></Spinner>
</div>
{/if}