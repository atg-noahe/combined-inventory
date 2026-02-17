<script lang="ts">
	import type { Device } from "$lib/inventory/devices"
	import { authInfo, GetToken } from "$lib/auth/msal.svelte"
	import { onMount } from "svelte"
	import Spinner from "$lib/components/spinner.svelte"

	let loading = $state(true);
	let devices: Device[] = $state([]);

	onMount(async () => {
		const token = await GetToken(["api://deec1bcd-3785-4edb-b656-f51f1a31008b/access_as_user"]);
		const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/combined-inventory/devices`, {
			headers: { 'Authorization': `Bearer ${token}` }
		});
		devices = await resp.json();
		loading = false;
	});

	// --- Gauge stats ---
	const ARC_LENGTH = Math.PI * 90;

	let immyDevices = $derived(devices.filter(d => d.immybot_id != null));
	let immyWithAtg = $derived(immyDevices.filter(d => d.atg_id != null));
	let immyPct = $derived(immyDevices.length > 0 ? Math.round(immyWithAtg.length / immyDevices.length * 1000) / 10 : 0);

	let ninjaDevices = $derived(devices.filter(d => d.ninja_id != null));
	let ninjaWithAtg = $derived(ninjaDevices.filter(d => d.atg_id != null));
	let ninjaPct = $derived(ninjaDevices.length > 0 ? Math.round(ninjaWithAtg.length / ninjaDevices.length * 1000) / 10 : 0);

	function gaugeColor(pct: number): string {
		if (pct >= 90) return '#22c55e';
		if (pct >= 80) return '#eab308';
		return '#ef4444';
	}

	// --- Per-org table ---
	let orgStats = $derived.by(() => {
		const groups = new Map<string, { name: string, immy: number, ninja: number, matched: number, immyNoAtg: number, ninjaNoAtg: number }>();
		for (const d of devices) {
			const key = d.rewst_org_id;
			if (!groups.has(key)) groups.set(key, { name: d.org_name ?? key, immy: 0, ninja: 0, matched: 0, immyNoAtg: 0, ninjaNoAtg: 0 });
			const g = groups.get(key)!;
			if (d.immybot_id != null) {
				g.immy++;
				if (d.atg_id == null) g.immyNoAtg++;
			}
			if (d.ninja_id != null) {
				g.ninja++;
				if (d.atg_id == null) g.ninjaNoAtg++;
			}
			if (d.immybot_id != null && d.ninja_id != null) g.matched++;
		}
		return [...groups.values()].map(g => {
			const maxDevices = Math.max(g.immy, g.ninja);
			return {
				...g,
				correlation_pct: maxDevices > 0 ? Math.round(g.matched / maxDevices * 1000) / 10 : 0
			};
		}).sort((a, b) => b.correlation_pct - a.correlation_pct);
	});
</script>

{#if loading}
<div class="w-full flex flex-row justify-center mt-30">
	<Spinner size="lg"></Spinner>
</div>
{:else}
<div class="m-6 space-y-8">
	<h1 class="text-2xl font-bold">Hello, {authInfo.account?.name}</h1>

	<!-- ATG ID Adoption Gauges -->
	<div class="card p-6">
		<h2 class="text-xl font-semibold mb-6">ATG ID Adoption</h2>
		<div class="grid grid-cols-2 gap-12 max-w-3xl mx-auto">
			{#each [
				{ label: "ImmyBot Devices with ATG ID", pct: immyPct, count: immyWithAtg.length, total: immyDevices.length },
				{ label: "Ninja Devices with ATG ID", pct: ninjaPct, count: ninjaWithAtg.length, total: ninjaDevices.length }
			] as gauge}
			<div class="flex flex-col items-center gap-3">
				<svg viewBox="0 0 220 140" class="w-64">
					<path d="M 20 120 A 90 90 0 0 1 200 120"
						stroke="#374151" stroke-width="18" fill="none" stroke-linecap="round" />
					<path d="M 20 120 A 90 90 0 0 1 200 120"
						stroke={gaugeColor(gauge.pct)} stroke-width="18" fill="none" stroke-linecap="round"
						stroke-dasharray="{gauge.pct / 100 * ARC_LENGTH} {ARC_LENGTH}" />
					<text x="110" y="100" text-anchor="middle" fill="currentColor" font-size="36" font-weight="bold">{gauge.pct}%</text>
				</svg>
				<div class="text-base font-medium text-center">{gauge.label}</div>
				<div class="text-sm text-gray-400">{gauge.count} / {gauge.total} devices</div>
			</div>
			{/each}
		</div>
	</div>

	<!-- Per-Organization Adoption Stats -->
	<div class="card p-6">
		<h2 class="text-xl font-semibold mb-6">Per-Organization Adoption Stats</h2>
		<div class="table-wrap">
			<table class="table text-base">
				<thead>
					<tr>
						<th class="text-base">Organization</th>
						<th class="text-base">Correlation</th>
						<th class="text-base">Matched</th>
						<th class="text-base">ImmyBot</th>
						<th class="text-base">Immy Missing ATG</th>
						<th class="text-base">Ninja</th>
						<th class="text-base">Ninja Missing ATG</th>
					</tr>
				</thead>
				<tbody>
					{#each orgStats as org}
					<tr>
						<td class="font-medium">{org.name}</td>
						<td>
							<span class="badge px-2 py-1 {org.correlation_pct >= 90 ? 'bg-green-800' : org.correlation_pct >= 80 ? 'bg-yellow-800' : 'bg-red-800'}">
								{org.correlation_pct}%
							</span>
						</td>
						<td>{org.matched}</td>
						<td>{org.immy}</td>
						<td>
							{#if org.immyNoAtg > 0}
								<span class="text-red-400">{org.immyNoAtg}</span>
							{:else}
								{org.immyNoAtg}
							{/if}
						</td>
						<td>{org.ninja}</td>
						<td>
							{#if org.ninjaNoAtg > 0}
								<span class="text-red-400">{org.ninjaNoAtg}</span>
							{:else}
								{org.ninjaNoAtg}
							{/if}
						</td>
					</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
{/if}
