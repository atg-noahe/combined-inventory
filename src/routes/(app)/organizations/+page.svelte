<script lang="ts">
	import { onMount } from "svelte";
	import { GetToken } from "$lib/auth/msal.svelte";
	import Spinner from "$lib/components/spinner.svelte";
	import Fuse from "fuse.js";
	import { Pagination } from "@skeletonlabs/skeleton-svelte";
	import { ArrowLeftIcon, ArrowRightIcon } from "lucide-svelte";

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
    const options = {
        threshold: 0.1,
        keys: [
            "name",
            "rewst_org_id"
        ]
    }
    let orgIndex: Fuse<Organization> = $derived(new Fuse(orgs, options));

    let error: Error | null = $state(null)
    onMount(async () => {
        try {
            const token = await GetToken(["api://deec1bcd-3785-4edb-b656-f51f1a31008b/access_as_user"])
            const resp = await fetch('https://api.atgfw.com/api/combined-inventory/organizations', {
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

    let filter = $state("")
    let page = $state(1)
    const PAGE_SIZE = 50;
    const start = $derived((page-1) * PAGE_SIZE)
    const end = $derived(start + PAGE_SIZE)
    let filtered_devices = $derived(filter ? orgIndex.search(filter).map(r => r.item) : orgs)
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
    <div class="w-full flex flex-row">
        <input class="input" type="search" placeholder="Search terms here!" bind:value={filter}>
    </div>
    <div class="table-wrap mt-5">
    <table class="table">
        <thead>
            <tr>
                <th>Org Name</th>
                <th>Sources</th>
                <th>Ninja Devices</th>
                <th>ImmyBot Devices</th>
                <th>Identified Devices Total</th>
            </tr>
        </thead>
        <tbody>
            {#each filtered_devices.slice(start, end) as org (org.rewst_org_id)}
            <tr>
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
            </tr>
            {/each}
        </tbody>
    </table>
    </div>
    <Pagination count={filtered_devices.length} pageSize={PAGE_SIZE} {page} onPageChange={(event) => (page = event.page)}>
        <Pagination.PrevTrigger>
            <ArrowLeftIcon class="size-4"></ArrowLeftIcon>
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
{/if}