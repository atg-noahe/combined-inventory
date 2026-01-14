<script lang="ts">
	import { msalInstance } from "$lib/auth/msal";
	import type { AccountInfo } from "@azure/msal-browser";
	import { onMount } from "svelte";
	let account: AccountInfo | null = $state(null)
	onMount(() => {
		if (!msalInstance) return;
		account = msalInstance.getActiveAccount();
	})
</script>

Hello, { account?.name }