/**
 * Web-only startup gate. Called at the top of init() when running in a plain
 * browser: finishes an in-flight OAuth redirect, and if the app still isn't
 * connected to Dropbox, replaces the UI with a connect screen. Returns true
 * when init() should continue (we're authed), false when the connect screen
 * is showing (beginLogin() will navigate away and come back with ?code=).
 *
 * Also registers the service worker that makes the installed PWA start
 * offline (see public/sw.js).
 */

import * as auth from "./dropbox/auth";

export async function webBootstrap(): Promise<boolean> {
  // hide the desktop window chrome right away — init() only reaches
  // initWindowChrome (which also sets this) after we let it continue
  document.body.classList.add("web");

  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    void navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  try {
    await auth.completeLoginFromUrl();
  } catch (e) {
    console.error("oauth:", e);
  }
  if (auth.isAuthed()) return true;

  document.getElementById("app")!.style.display = "none";
  const gate = document.createElement("div");
  gate.id = "connect-gate";
  gate.innerHTML = `
    <div class="gate-box">
      <h1>pt</h1>
      <p>Notes live in your Dropbox. Connect to read and write them —
      the app talks to Dropbox directly; nothing passes through a server.</p>
      <label id="gate-key-row" hidden>
        <span>Dropbox app key</span>
        <input id="gate-key" autocapitalize="off" autocorrect="off" spellcheck="false" />
      </label>
      <button id="gate-connect">Connect Dropbox</button>
      <p id="gate-error" class="gate-error" hidden></p>
    </div>`;
  document.body.appendChild(gate);

  const keyRow = document.getElementById("gate-key-row")!;
  const keyInput = document.getElementById("gate-key") as HTMLInputElement;
  if (!auth.appKey()) keyRow.hidden = false;
  keyInput.value = auth.appKey();

  document.getElementById("gate-connect")!.addEventListener("click", () => {
    const err = document.getElementById("gate-error")!;
    err.hidden = true;
    if (!keyRow.hidden) auth.setAppKey(keyInput.value);
    auth.beginLogin().catch((e) => {
      err.textContent = String(e);
      err.hidden = false;
    });
  });
  return false;
}
