<script lang="ts">
	import { onMount } from "svelte";
	import { GetToken } from "$lib/auth/msal.svelte";
	import Spinner from "$lib/components/spinner.svelte";
    import SortableTable, { type ColumnDef } from "$lib/components/SortableTable.svelte";

    type Organization = {
        name: string,
        rewst_org_id: string,
        immybot_org_id: number,
        ninja_org_id: number,
        immybot_identified: number,
        immybot_unidentified: number,
        ninja_identified: number,
        ninja_unidentified: number,
        matched_devices: number
    }
    let orgs: Organization[] = $state([])

    let error: Error | null = $state(null)
    onMount(async () => {
        try {
            const token = await GetToken(["api://deec1bcd-3785-4edb-b656-f51f1a31008b/access_as_user"])
            const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/combined-inventory/organizations`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            orgs = await resp.json();
        } catch(e) {
            if (e instanceof Error) {
                error = e;
            }
            else {
                error = new Error(JSON.stringify(e))
            }
            console.log(e)
        }
    })

    const columns: ColumnDef<Organization>[] = [
        { key: 'name', label: 'Org Name' },
        { key: 'sources', label: 'Sources', sortable: false },
        { key: 'ninja_devices', label: 'Ninja Devices', sortFn: (a, b) => (a.ninja_identified + a.ninja_unidentified) - (b.ninja_identified + b.ninja_unidentified) },
        { key: 'immybot_devices', label: 'ImmyBot Devices', sortFn: (a, b) => (a.immybot_identified + a.immybot_unidentified) - (b.immybot_identified + b.immybot_unidentified) },
        { key: 'matched_devices', label: 'Identified Devices Total', sortFn: (a, b) => a.matched_devices - b.matched_devices },
    ];
</script>

{#if orgs.length === 0}
    {#if error}
    <div class="w-full flex-row flex justify-center mt-15">
        There was an error loading this data.
    </div>
    {:else }
    <div class="w-full flex-row flex justify-center mt-15">
        <Spinner size="lg"></Spinner>
    </div>
    {/if}
{:else}
<div class="m-5">
    <SortableTable
        items={orgs}
        {columns}
        searchKeys={["name", "rewst_org_id"]}
        pageSize={50}
        searchPlaceholder="Search terms here!"
        defaultSort={{ column: 'name', direction: 'asc' }}
        rowKey={(org) => org.rewst_org_id}
    >
        {#snippet row(org)}
            <td>
                <a href={`/devices/?org_id=${org.rewst_org_id}`}>
                    {org.name}
                </a>
            </td>
            <td>
                <a href={`https://atgfw.immy.bot/tenants/${org.immybot_org_id}`}
                    target="_blank" title={`Immybot Organization ID: ${org.immybot_org_id}`}>
                    <span class="badge outline-1">Immybot</span>
                </a>
                <a href={`https://app.ninjarmm.com/#/customerDashboard/${org.ninja_org_id}/overview`}
                    target="_blank" title={`Ninja Organization ID: ${org.ninja_org_id}`}>
                    <span class="badge outline-1">NinjaRMM</span>
                </a>
            </td>
            <td>{org.ninja_identified} Identified | {org.ninja_unidentified} Unidentified</td>
            <td>{org.immybot_identified} Identified | {org.immybot_unidentified} Unidentified</td>
            <td>{org.matched_devices}</td>
        {/snippet}
    </SortableTable>
</div>
{/if}