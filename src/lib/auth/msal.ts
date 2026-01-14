import { browser } from '$app/environment';
import { PublicClientApplication, type Configuration } from '@azure/msal-browser';

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AAD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AAD_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_AAD_REDIRECT_URI // e.g. http://localhost:5173/
  },
  cache: {
    cacheLocation: 'sessionStorage', // or 'localStorage' if you truly need persistence
    storeAuthStateInCookie: false
  }
};


export const msalInstance = browser ? new PublicClientApplication(msalConfig) : null;

await msalInstance?.initialize();

export const loginRequest = {
  scopes: ['api://deec1bcd-3785-4edb-b656-f51f1a31008b/access_as_user'] // add API scopes later
};