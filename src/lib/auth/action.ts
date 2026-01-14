import { msalInstance, loginRequest } from "./msal"
import { InteractionRequiredAuthError } from '@azure/msal-browser';

export async function signInRedirect() {
  if (!msalInstance) return;
  await msalInstance.loginRedirect(loginRequest);
}

export async function signOut() {
  if (!msalInstance) return;
  await msalInstance.logoutRedirect();
}

export async function getAccessToken(scopes: string[]) {
  if (!msalInstance) return null;

  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
  if (!account) return null;

  try {
    const res = await msalInstance.acquireTokenSilent({ account, scopes });
    return res.accessToken;
  } catch (e) {
    // Silent failed => user interaction required
    if (e instanceof InteractionRequiredAuthError) {
      await msalInstance.acquireTokenRedirect({ account, scopes });
      return null; // redirect will happen
    }
    throw e;
  }
}