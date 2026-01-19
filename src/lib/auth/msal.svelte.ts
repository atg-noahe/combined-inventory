import { PublicClientApplication, type AccountInfo, type AuthenticationResult } from "@azure/msal-browser";

const msalConfig = {
    auth: {
        clientId: import.meta.env.VITE_AAD_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AAD_TENANT_ID}`,
        redirectUri: import.meta.env.VITE_AAD_REDIRECT_URI // e.g. http://localhost:5173/
    }
}

export const msalInstance = new PublicClientApplication(msalConfig);
await msalInstance.initialize();

export var authInfo: {token: string|null, account: AccountInfo|null} = $state({
    token: null,
    account: null
})

export async function ConnectMSAL() {
    const accounts = msalInstance.getAllAccounts()

    const scopes = ["api://deec1bcd-3785-4edb-b656-f51f1a31008b/access_as_user"]

    if (accounts.length === 0) {
        console.log("Zero")
        try {
            const res: AuthenticationResult = await msalInstance.ssoSilent({scopes});
            authInfo.account = res.account;
            authInfo.token = res.accessToken;
        }
        catch {
            await msalInstance.acquireTokenRedirect({scopes});
        }
    }
    else if (accounts.length === 1) {
        console.log("One")
        const account = accounts[0];
        msalInstance.setActiveAccount(account)
    }
    else {
        console.log("Many")
    }
    authInfo.account = msalInstance.getActiveAccount();
}