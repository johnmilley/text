# Security model — web/PWA build

The web build (https://johnmilley.github.io/text/) is the desktop app's
frontend running in a plain browser, with the storage layer swapped from the
local filesystem to Dropbox's HTTP API. This document records the threat
model and the decisions made for it (2026-07-07).

## Architecture facts that carry the model

- **No server.** The deploy is static files. There is no backend, no shared
  state, no place where anyone's data aggregates. Every visitor's browser
  talks directly to Dropbox.
- **OAuth 2 with PKCE** (`src/dropbox/auth.ts`). Only the public *app key*
  is embedded in the build; the *app secret* is never used anywhere and must
  never be committed. PKCE binds each authorization code to the browser
  session that started it, and Dropbox only redirects to URIs whitelisted in
  the App Console — so a copy of the deployed JS on someone else's site
  cannot phish tokens with our app key.
- **Tokens live in localStorage**, per browser, per origin. The refresh
  token is a long-lived credential to the connected Dropbox account. This is
  the crown jewel; everything below is about protecting it.

## Threats and mitigations

### XSS in rendered markdown → token exfiltration (mitigated)

Rendered markdown intentionally passes raw HTML through to the preview pane
(`innerHTML`), matching the desktop renderer. Anything that can write a note
into the connected Dropbox (shared folders, other apps, imports) can
therefore inject markup. With the refresh token in localStorage, one
`<script>` or `<img onerror=…>` in a note would otherwise be able to read it
and send it anywhere.

**Mitigation:** plain-web production builds ship a strict Content Security
Policy as a `<meta>` tag (GitHub Pages cannot send HTTP headers) — see
`webCsp()` in `vite.config.ts`:

- `script-src 'self'` — no inline scripts, no inline event handlers, no
  remote scripts. Injected markup cannot execute.
- `connect-src` limited to `api.dropboxapi.com` / `content.dropboxapi.com` —
  even code that somehow ran could not POST the token elsewhere.
- `object-src 'none'`, `base-uri 'self'`, `form-action 'none'`.

`img-src`/`media-src` allow `https:` broadly because notes legitimately
embed remote images; an attacker image URL leaks at most your IP, not data.

Verified headless: the app boots under the policy and an `<img onerror>`
payload is refused. Tauri builds and `npm run dev` (HMR needs inline/ws) are
exempt — the policy applies exactly where the token exists.

### The shared `*.github.io` origin (accepted, with a rule)

Browsers scope localStorage to the **origin**, and every GitHub Pages site
under one account shares `<account>.github.io`. Any other Pages site
published under this account runs same-origin with the app and could read
its localStorage — and *its* pages are not covered by *our* CSP.

**Rule:** publish nothing under this account's Pages that runs code you do
not fully trust (this includes third-party embeds like comment widgets).
As of 2026-07-07 nothing else is live on the origin (the old text-shares
site is gone). If that ever changes, move the app to a custom domain to
give it a private origin.

### Stolen device / browser profile (accepted)

An unlocked phone with the PWA installed has working Dropbox access — the
same exposure as any installed Dropbox client. Remedy is Dropbox's own
"connected apps" page: revoking the app invalidates all its refresh tokens.

### Scope breadth (accepted)

The app requests Full Dropbox access (`files.content.read/write`,
`files.metadata.read`, `account_info.read`) because the notes live in a
pre-existing regular folder. An "App folder" app would confine the token to
its own directory, but would not see the existing notes. Revisit if the
vault ever moves into a dedicated app folder.

## Non-issues, for the record

- **Publishing the app doesn't expose your notes.** Other visitors connect
  their own Dropbox; tokens never leave each visitor's browser.
- **The app key is public by design** (PKCE client identifier). The redirect
  URI whitelist is what makes it safe.
- **OAuth `?code=` in the URL** is one-time, PKCE-bound, redeemed and
  stripped immediately on load.
- **The service worker** caches only the app shell (JS/CSS/icons), never
  note content or API responses.
- **Deletes** go to Dropbox's trash (30-day recovery), mirroring the
  desktop's native-trash behavior.

## Invariants to keep when changing code

1. Never widen `script-src` or `connect-src` in the CSP.
2. Never commit or embed the Dropbox app secret.
3. Never move tokens somewhere readable cross-origin, and never cache note
   content in the service worker without revisiting this document.
4. New third-party dependencies for the web build deserve a look at what
   they fetch at runtime (the CSP will break silent offenders — that's a
   feature).
