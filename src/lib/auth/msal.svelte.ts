import { browser } from "$app/environment";
import { PublicClientApplication, type AccountInfo, type AuthenticationResult } from "@azure/msal-browser";
import { GetAccountResult } from "@azure/msal-browser/custom-auth";

const msalConfig = {
    auth: {
        clientId: import.meta.env.VITE_AAD_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AAD_TENANT_ID}`,
        redirectUri: import.meta.env.VITE_AAD_REDIRECT_URI // e.g. http://localhost:5173/
    }
}

export const msalInstance = new PublicClientApplication(msalConfig);
await msalInstance.initialize();

export var authInfo: {account: AccountInfo|null} = $state({
    account: null
})

export async function ConnectMSAL() {
    if (!browser) {
        throw "This must be run in a browser"
    }
    const accounts = msalInstance.getAllAccounts();
    const activeAccount = msalInstance.getActiveAccount();

    const scopes = ["api://deec1bcd-3785-4edb-b656-f51f1a31008b/access_as_user"];

    if (activeAccount) {
        authInfo.account =  activeAccount
    }

    if (accounts.length === 0) {
        console.log("Zero");
        try {
            const res: AuthenticationResult = await msalInstance.ssoSilent({scopes});
            msalInstance.setActiveAccount(res.account);
        }
        catch {
            const res = await msalInstance.acquireTokenPopup({scopes});
            msalInstance.setActiveAccount(res.account);
        }
    }
    else if (accounts.length === 1) {
        console.log("One");
        const account = accounts[0];
        msalInstance.setActiveAccount(account);
    }
    else {
        console.log("Many");
        const res = await msalInstance.acquireTokenPopup({scopes});
        msalInstance.setActiveAccount(res.account);
    }
    authInfo.account = msalInstance.getActiveAccount();
}

export async function GetToken(scopes: string[]) : Promise<string> {
    const resp = msalInstance.acquireTokenSilent({scopes});
    if (resp) {
        return (await resp).accessToken
    }
    const res = await msalInstance.acquireTokenPopup({scopes})
    return res.accessToken
}