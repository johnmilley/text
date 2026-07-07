/**
 * Dropbox OAuth 2 with PKCE — the flow for apps that cannot keep a secret
 * (browsers). Only the public app key is ever embedded; the code exchange is
 * protected by the PKCE verifier instead of a client secret.
 *
 * The long-lived refresh token persists in localStorage; short-lived access
 * tokens live in memory and refresh on demand. For quick testing without the
 * redirect dance, a token generated in the Dropbox App Console can be set via
 * setManualAccessToken (it expires after ~4 hours).
 */

const KEY_APP = "text.dropbox.app_key";
const KEY_REFRESH = "text.dropbox.refresh_token";
const KEY_VERIFIER = "text.dropbox.pkce_verifier";
const KEY_MANUAL = "text.dropbox.manual_access_token";

export function appKey(): string {
  return (
    (import.meta.env.VITE_DROPBOX_APP_KEY as string | undefined) ??
    localStorage.getItem(KEY_APP) ??
    ""
  );
}

export function setAppKey(key: string): void {
  localStorage.setItem(KEY_APP, key.trim());
}

export function isAuthed(): boolean {
  return !!(localStorage.getItem(KEY_REFRESH) || localStorage.getItem(KEY_MANUAL));
}

export function logout(): void {
  localStorage.removeItem(KEY_REFRESH);
  localStorage.removeItem(KEY_MANUAL);
  accessToken = null;
}

/** App Console "Generate access token" — testing shortcut, no refresh. */
export function setManualAccessToken(token: string): void {
  localStorage.setItem(KEY_MANUAL, token.trim());
}

// ------------------------------------------------------------------- PKCE

const b64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const defaultRedirectUri = (): string => location.origin + location.pathname;

/** Send the browser to Dropbox's consent page. Resumes via completeLoginFromUrl. */
export async function beginLogin(redirectUri = defaultRedirectUri()): Promise<void> {
  const key = appKey();
  if (!key) throw new Error("Dropbox app key not set");
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  sessionStorage.setItem(KEY_VERIFIER, verifier);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = b64url(new Uint8Array(digest));
  const params = new URLSearchParams({
    client_id: key,
    response_type: "code",
    code_challenge: challenge,
    code_challenge_method: "S256",
    token_access_type: "offline",
    redirect_uri: redirectUri,
  });
  location.assign(`https://www.dropbox.com/oauth2/authorize?${params}`);
}

/**
 * If the current URL carries an OAuth ?code=, exchange it for tokens and
 * scrub the parameter from the address bar. Returns true when a login
 * completed. Call once on page load.
 */
export async function completeLoginFromUrl(redirectUri = defaultRedirectUri()): Promise<boolean> {
  const url = new URL(location.href);
  const code = url.searchParams.get("code");
  if (!code) return false;
  const verifier = sessionStorage.getItem(KEY_VERIFIER);
  if (!verifier) throw new Error("OAuth code present but PKCE verifier missing (retry login)");
  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    code_verifier: verifier,
    client_id: appKey(),
    redirect_uri: redirectUri,
  });
  const resp = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    body,
  });
  if (!resp.ok) throw new Error(`token exchange failed: ${resp.status} ${await resp.text()}`);
  const tok = (await resp.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  if (tok.refresh_token) localStorage.setItem(KEY_REFRESH, tok.refresh_token);
  localStorage.removeItem(KEY_MANUAL);
  accessToken = { value: tok.access_token, expiresAt: Date.now() + tok.expires_in * 1000 };
  sessionStorage.removeItem(KEY_VERIFIER);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  history.replaceState(null, "", url.toString());
  return true;
}

// ------------------------------------------------------------ access token

let accessToken: { value: string; expiresAt: number } | null = null;

/** Current access token, refreshing through the stored refresh token. */
export async function getAccessToken(force = false): Promise<string> {
  if (!force && accessToken && Date.now() < accessToken.expiresAt - 60_000) {
    return accessToken.value;
  }
  const refresh = localStorage.getItem(KEY_REFRESH);
  if (refresh) {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh,
      client_id: appKey(),
    });
    const resp = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      body,
    });
    if (!resp.ok) throw new Error(`token refresh failed: ${resp.status} ${await resp.text()}`);
    const tok = (await resp.json()) as { access_token: string; expires_in: number };
    accessToken = { value: tok.access_token, expiresAt: Date.now() + tok.expires_in * 1000 };
    return accessToken.value;
  }
  const manual = localStorage.getItem(KEY_MANUAL);
  if (manual) return manual;
  throw new Error("not connected to Dropbox (no refresh token)");
}
