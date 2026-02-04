<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.ico';
	import { AppBar, Avatar, Menu, Portal } from '@skeletonlabs/skeleton-svelte';
	import { ConnectMSAL, msalInstance } from '$lib/auth/msal.svelte';
	import { House, MenuIcon } from 'lucide-svelte';
	import { authInfo } from '$lib/auth/msal.svelte';

	const loaded = msalInstance.handleRedirectPromise().then(async (tokenResponse) => {
		if (tokenResponse !== null) {
			console.log("Handling Redirect")
			authInfo.account = tokenResponse.account;
		}
		else {
			console.log("Logging In")
			await ConnectMSAL();
		}
	})

	function signOut() {
		msalInstance.logoutRedirect({
			postLogoutRedirectUri: "/auth/"
		})
	}

	let { children } = $props();

</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{#await loaded}
Logging you in!
{:then res} 
<AppBar>
	<AppBar.Toolbar class="grid-cols-[auto_1fr_auto] mx-auto container">
		<AppBar.Lead>
			<a href="/">
				<House></House>
			</a>
		</AppBar.Lead>
		<AppBar.Headline>
			<a href="/devices" class="btn hover:bg-secondary-50-950 h-full">
				Devices
			</a>
			<a href="/organizations" class="btn hover:bg-secondary-50-950 h-full">
				Organizations
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
{/await}