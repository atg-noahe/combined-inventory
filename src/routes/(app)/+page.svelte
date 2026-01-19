<script lang="ts">
	import { authInfo } from "$lib/auth/msal.svelte"
</script>

Hello, { authInfo.account?.name }