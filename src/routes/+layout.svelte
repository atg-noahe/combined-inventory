<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { AppBar, Avatar, Menu, Portal } from '@skeletonlabs/skeleton-svelte';
	import { MenuIcon } from 'lucide-svelte';
	import { onMount } from 'svelte'
	import { msalInstance } from '$lib/auth/msal';
	import { signInRedirect, signOut } from '$lib/auth/action';
	import type { AccountInfo } from '@azure/msal-browser';

	let account: AccountInfo | null = $state(null)

	onMount(async () => {
		if (!msalInstance) return;

		// Process the redirect response if we just came back from Entra
		const result = await msalInstance.handleRedirectPromise();

		// Pick an account (needed for acquireTokenSilent)
		const accounts = msalInstance.getAllAccounts();
		if (result?.account) {
		msalInstance.setActiveAccount(result.account);
		} else if (accounts.length === 1) {
		msalInstance.setActiveAccount(accounts[0]);
		}

		account = msalInstance?.getActiveAccount()
	});

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
						<Avatar.Fallback>{account?.name?.charAt(0)}</Avatar.Fallback>
					</Avatar>
				</Menu.Trigger>
				<Portal>
					<Menu.Positioner>
						<Menu.Content>
							<Menu.Item value="signIn" onclick={signInRedirect}>
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
