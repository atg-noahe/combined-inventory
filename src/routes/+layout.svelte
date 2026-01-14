<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { AppBar, Menu, Portal } from '@skeletonlabs/skeleton-svelte';
	import { MenuIcon } from 'lucide-svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<AppBar>
	<AppBar.Toolbar class="grid-cols-[auto_1fr_auto]">
		<AppBar.Lead>
			<Menu>
				<Menu.Trigger>
					<MenuIcon class="btn-icon btn-icon-lg hover:preset-tonal" />
				</Menu.Trigger>
				<Portal>
					<Menu.Positioner>
						<Menu.Content>
							<a href="/devices">
								<Menu.Item value="devices">
									Devices
								</Menu.Item>
							</a>
						</Menu.Content>
					</Menu.Positioner>
				</Portal>
			</Menu>
		</AppBar.Lead>
		<AppBar.Headline>
			<a href="/">
				<p class="text-2xl">Combined Inventory</p>
			</a>
		</AppBar.Headline>
	</AppBar.Toolbar>
</AppBar>
{@render children()}
