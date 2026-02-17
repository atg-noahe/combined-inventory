<script lang="ts">
	import type { Device, DeviceEntry } from "$lib/inventory/devices";
	import { onMount } from "svelte";
	import { Dialog, Popover, Portal } from "@skeletonlabs/skeleton-svelte";
	import { X } from "lucide-svelte";
	import { GetToken } from "$lib/auth/msal.svelte";
	import Spinner from "$lib/components/spinner.svelte";
    import { DateTime } from "luxon";
	import FilterButton, { type FilterOption } from "$lib/components/FilterButton.svelte";
	import SearchFilter from "$lib/components/SearchFilter.svelte";
	import { toaster } from "$lib/toast";
    import { v4 } from 'uuid'
    import SortableTable, { type ColumnDef } from "$lib/components/SortableTable.svelte";

    let selected_devices: DeviceEntry[] = $state([]);
    let show_devices: boolean = $state(false);
    let devices: DeviceEntry[] = $state([]);
    let deleting: boolean = $state(false);
    let loading: boolean = $state(true);

    let filters: FilterOption[] = $state([
        {"name": "ImmyBot", "value": "optional"},
        {"name": "Ninja", "value": "optional"},
        {"name": "ATG ID", "value": "optional"}
    ])

    // Org filter (keyed by rewst_org_id)
    let orgFilterValue: string[] = $state([]);
    let orgFilterItems = $derived(
        [...new Map(devices.map(d => [d.rewst_org_id, d.org_name])).entries()]
            .filter((e): e is [string, string] => e[1] != null)
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map(([id, name]) => ({ label: name, value: id }))
    );
    function orgName(id: string): string {
        return orgFilterItems.find(o => o.value === id)?.label ?? id;
    }

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
        const token = await GetToken(["api://deec1bcd-3785-4edb-b656-f51f1a31008b/access_as_user"]);
        const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/combined-inventory/devices`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const apiDevs: Device[] = await resp.json();
        devices = apiDevs.map((d) => {
            return {...d, object_id: v4()}
        })
        const orgId = new URLSearchParams(window.location.search).get('org_id');
        if (orgId) {
            orgFilterValue = [orgId];
        }
        loading = false;
    });

    // --- Device Linking ---
    let linkTarget: DeviceEntry | null = $state(null);
    let linking: boolean = $state(false);

    let linkableDevices = $derived.by(() => {
        const groups = new Map<string, DeviceEntry[]>();
        for (const d of devices) {
            const key = `${d.device_name}\0${d.rewst_org_id}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(d);
        }

        const linkMap = new Map<string, DeviceEntry>();
        for (const [, group] of groups) {
            if (group.length !== 2) continue;
            const [a, b] = group;
            const aHasAtg = a.atg_id != null;
            const bHasAtg = b.atg_id != null;
            const aHasOneService = (a.immybot_id != null) !== (a.ninja_id != null);
            const bHasOneService = (b.immybot_id != null) !== (b.ninja_id != null);
            if (!aHasOneService || !bHasOneService) continue;
            if (aHasAtg && !bHasAtg) {
                linkMap.set(b.object_id, a);
            } else if (!aHasAtg && bHasAtg) {
                linkMap.set(a.object_id, b);
            }
        }
        return linkMap;
    });

    async function linkDevice() {
        if (!linkTarget) return;
        const source = linkableDevices.get(linkTarget.object_id);
        if (!source) return;
        const atgId = source.atg_id;
        const deviceName = linkTarget.device_name;
        const merged = {
            atg_id: atgId,
            immybot_id: source.immybot_id ?? linkTarget.immybot_id,
            ninja_id: source.ninja_id ?? linkTarget.ninja_id
        };
        linking = true;
        try {
            const token = await GetToken(["api://deec1bcd-3785-4edb-b656-f51f1a31008b/access_as_user"]);
            const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/combined-inventory/devices/merge`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(merged)
            });
            if (!resp.ok) {
                console.error("Link failed:", resp.status, resp.statusText);
                toaster.error({ title: "Error", description: "Failed to link device." });
                return;
            }
            linkTarget.atg_id = atgId;
            toaster.success({ title: "Linked", description: `ATG ID ${atgId} applied to ${deviceName}.` });
            linkTarget = null;
        } catch (e) {
            console.error(e);
            toaster.error({ title: "Error", description: `${e}` });
        } finally {
            linking = false;
        }
    }

    let filteredItems: DeviceEntry[] = $state([]);

    let linkablePairs = $derived(
        [...linkableDevices.entries()]
            .filter(([targetId]) => filteredItems.some(d => d.object_id === targetId))
            .map(([targetId, source]) => ({
                target: devices.find(d => d.object_id === targetId)!,
                source
            }))
    );

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
                console.error("Failed to delete devices:", resp.status, resp.statusText);
                toaster.error({ title: "Error", description: "Failed to delete the selected devices." });
            }
        } catch (e) {
            console.error(e);
            toaster.error({ title: "Error", description: `${e}` });
        } finally {
            deleting = false;
        }
    }

    function deviceFilterFn(items: DeviceEntry[]): DeviceEntry[] {
        let result = items;
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
            result = result.filter(d => orgFilterValue.includes(d.rewst_org_id));
        }
        return result;
    }

    const deviceColumns: ColumnDef<DeviceEntry>[] = [
        { key: 'device_name', label: 'Device Name' },
        { key: 'org_name', label: 'Organization Name' },
        { key: 'operating_system', label: 'Operating System' },
        { key: 'public_ip', label: 'Public IP' },
        { key: 'status', label: 'Status', sortable: false },
        { key: 'last_seen', label: 'Last Seen', sortFn: (a, b) => get_last_seen(a).getTime() - get_last_seen(b).getTime() },
    ];
</script>

{#if loading}
<div class="w-full flex flex-row justify-center mt-30">
    <Spinner size="lg"></Spinner>
</div>
{:else if devices.length != 0}
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
        {#each orgFilterValue as orgId (orgId)}
            <button class="badge preset-filled-surface-200-800 gap-1 cursor-pointer"
                onclick={() => { orgFilterValue = orgFilterValue.filter(v => v !== orgId); }}>
                Org: {orgName(orgId)}
                <X size={14}></X>
            </button>
        {/each}
    </div>
    {/if}
    <SortableTable
        items={devices}
        columns={deviceColumns}
        searchKeys={["device_name", "org_name", "operating_system", "public_ip"]}
        pageSize={25}
        searchPlaceholder="Search by Device Name, Org Name, Etc"
        defaultSort={{ column: 'device_name', direction: 'asc' }}
        rowKey={(d) => d.object_id}
        filterFn={deviceFilterFn}
        bind:filteredItems
    >
        {#snippet toolbar()}
            {#if linkablePairs.length > 0}
            <Popover>
                <Popover.Trigger class="btn preset-filled-warning-500 text-nowrap">
                    Suggested Links ({linkablePairs.length})
                </Popover.Trigger>
                <Portal>
                    <Popover.Positioner>
                        <Popover.Content class="card bg-surface-100-900 p-2 rounded max-h-64 overflow-y-auto">
                            <Popover.Arrow class="[--arrow-size:--spacing(2)] [--arrow-background:var(--color-surface-100-900)]">
                                <Popover.ArrowTip></Popover.ArrowTip>
                            </Popover.Arrow>
                            <div class="flex flex-col gap-1">
                                {#each linkablePairs as pair (pair.target.object_id)}
                                    <button class="flex flex-row justify-between items-center gap-4 hover:bg-surface-200-800 px-3 py-2 rounded text-start"
                                        onclick={() => { linkTarget = pair.target; }}>
                                        <div>
                                            <div class="text-sm font-medium">{pair.target.device_name}</div>
                                            <div class="text-xs text-gray-400">{pair.target.org_name}</div>
                                        </div>
                                        <div class="text-xs text-gray-400 text-right text-nowrap">
                                            {pair.target.immybot_id != null ? 'ImmyBot' : 'Ninja'} &larr; {pair.source.immybot_id != null ? 'ImmyBot' : 'Ninja'}
                                        </div>
                                    </button>
                                {/each}
                            </div>
                        </Popover.Content>
                    </Popover.Positioner>
                </Portal>
            </Popover>
            {/if}
        {/snippet}
        {#snippet headerPrefix(pageDevices)}
            <th>
                <input class="checkbox" type="checkbox"
                    checked={pageDevices.every(d => selected_devices.includes(d)) && pageDevices.length > 0}
                    oninput={() => {
                        const allSelected = pageDevices.every(d => selected_devices.includes(d));
                        if (allSelected) {
                            selected_devices = selected_devices.filter(d => !pageDevices.includes(d));
                        } else {
                            const toAdd = pageDevices.filter(d => !selected_devices.includes(d));
                            selected_devices = [...selected_devices, ...toAdd];
                        }
                    }}/>
            </th>
        {/snippet}
        {#snippet headerContent(col)}
            {#if col.key === 'org_name'}
                <SearchFilter items={orgFilterItems} bind:value={orgFilterValue}></SearchFilter>
            {:else if col.key === 'status'}
                <FilterButton bind:options={filters}></FilterButton>
            {/if}
        {/snippet}
        {#snippet row(device)}
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
        {/snippet}
    </SortableTable>

    <Dialog open={linkTarget != null} onOpenChange={(details) => { if (!details.open) linkTarget = null; }}>
        <Portal>
            <Dialog.Backdrop class="fixed inset-0 z-50 bg-surface-50-950/50"/>
            <Dialog.Positioner class="fixed flex justify-center inset-0 z-50 items-center">
                <Dialog.Content class="card bg-surface-100-900 w-full max-w-xl p-4 space-y-4 shadow-xl
                    transition transition-discrete opacity-0 translate-y-25
                    starting:data-[state=open]:opacity-0 starting:data-[state=open]:translate-y-25
                    data-[state=open]:opacity-100 data-[state=open]:translate-y-0 h-auto">
                    <Dialog.Title class="text-lg font-bold">Link ATG ID</Dialog.Title>
                    {#if linkTarget}
                    {@const source = linkableDevices.get(linkTarget.object_id)}
                    <Dialog.Description>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="p-3 rounded-lg border border-green-800 space-y-1 overflow-hidden">
                                <div class="text-xs font-semibold text-green-400 uppercase">Source</div>
                                <div class="font-medium truncate">{source?.device_name}</div>
                                <div class="text-sm"><span class="badge bg-green-800 text-xs truncate max-w-full">ATG ID: {source?.atg_id}</span></div>
                                <div class="text-sm">
                                    <span class="badge text-xs {source?.immybot_id != null ? 'bg-green-800' : 'bg-red-800'}">ImmyBot</span>
                                    <span class="badge text-xs {source?.ninja_id != null ? 'bg-green-800' : 'bg-red-800'}">NinjaRMM</span>
                                </div>
                            </div>
                            <div class="p-3 rounded-lg border border-blue-800 space-y-1 overflow-hidden">
                                <div class="text-xs font-semibold text-blue-400 uppercase">Target</div>
                                <div class="font-medium truncate">{linkTarget.device_name}</div>
                                <div class="text-sm"><span class="badge outline text-gray-400 text-xs">ATG ID: none</span></div>
                                <div class="text-sm">
                                    <span class="badge text-xs {linkTarget.immybot_id != null ? 'bg-green-800' : 'bg-red-800'}">ImmyBot</span>
                                    <span class="badge text-xs {linkTarget.ninja_id != null ? 'bg-green-800' : 'bg-red-800'}">NinjaRMM</span>
                                </div>
                            </div>
                        </div>
                    </Dialog.Description>
                    {/if}
                    <footer class="flex justify-end gap-2">
                        <button type="button" class="btn preset-filled" onclick={linkDevice} disabled={linking}>
                            {#if linking}
                                <Spinner size="sm" /> Linking...
                            {:else}
                                Confirm
                            {/if}
                        </button>
                        <Dialog.CloseTrigger class="btn preset-tonal">Cancel</Dialog.CloseTrigger>
                    </footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Portal>
    </Dialog>
</div>

{:else}
<div class="w-full flex flex-col items-center mt-30 gap-2">
    <p class="text-lg">No devices found.</p>
</div>
{/if}