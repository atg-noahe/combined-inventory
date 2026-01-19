<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { AppBar, Avatar, Menu, Portal } from '@skeletonlabs/skeleton-svelte';
	import { ConnectMSAL, msalInstance } from '$lib/auth/msal.svelte';
	import { MenuIcon } from 'lucide-svelte';
	import { onMount } from 'svelte'
	import { authInfo } from '$lib/auth/msal.svelte';
	import { goto } from '$app/navigation';

	onMount(async () => {
		msalInstance.handleRedirectPromise().then((tokenResponse) => {
			if (tokenResponse !== null) {
				console.log("Handling Redirect")
				authInfo.token = tokenResponse.accessToken;
				authInfo.account = tokenResponse.account;
			}
			else {
				console.log("Logging In")
				ConnectMSAL();
			}
		})

	});

	function signOut() {
		msalInstance.logoutRedirect({
			postLogoutRedirectUri: "/auth/"
		})
	}

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
		<AppBar.Trail>
			<Menu>
				<Menu.Trigger>
					<Avatar class="size-12">
					</Avatar>
				</Menu.Trigger>
				<Portal>
					<Menu.Positioner>
						<Menu.Content>
							<Menu.Item value="signIn">
								Sign In
							</Menu.Item>
							<Menu.Item value="signOut" onclick={signOut}>
								Sign Out
							</Menu.Item>
						</Menu.Content>
					</Menu.Positioner>
				</Portal>
			</Menu>
		</AppBar.Trail>
	</AppBar.Toolbar>
</AppBar>
{@render children()}
