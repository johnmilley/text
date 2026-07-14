/**
 * Manual test harness for the Dropbox backend (open /dropbox-test.html in
 * `npm run dev`). Exercises auth and each Backend surface against a real
 * Dropbox account; the conflict button proves the rev-based write check by
 * deliberately writing with a stale mtime.
 */

import * as auth from "./auth";
import { dropboxBackend as b } from "./backend";
import { rpc } from "./client";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const log = $<HTMLPreElement>("log");
const status = $<HTMLDivElement>("status");

const print = (label: string, value: unknown): void => {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  log.textContent = `— ${label} —\n${text}\n\n${log.textContent}`.slice(0, 40_000);
};

const run = (label: string, fn: () => Promise<unknown>) => async (): Promise<void> => {
  print(label, "…");
  const t0 = performance.now();
  try {
    const out = await fn();
    print(`${label} (${Math.round(performance.now() - t0)}ms)`, out ?? "ok");
  } catch (e) {
    print(`${label} FAILED`, String(e));
  }
};

async function refreshStatus(): Promise<void> {
  if (!auth.isAuthed()) {
    status.textContent = "not connected";
    return;
  }
  try {
    const acct = await rpc<{ email: string; name: { display_name: string } }>(
      "users/get_current_account",
      null,
    );
    status.textContent = `connected as ${acct.name.display_name} <${acct.email}>`;
  } catch (e) {
    status.textContent = `connected, but account check failed: ${e}`;
  }
}

$<HTMLInputElement>("appkey").value = auth.appKey();
const rootInput = $<HTMLInputElement>("root");
const fileInput = $<HTMLInputElement>("file");
rootInput.value = localStorage.getItem("pt.test_root") ?? "";
rootInput.addEventListener("change", () => localStorage.setItem("pt.test_root", rootInput.value));

$("connect").onclick = () => {
  auth.setAppKey($<HTMLInputElement>("appkey").value);
  void auth.beginLogin();
};
$("logout").onclick = () => {
  auth.logout();
  void refreshStatus();
};
$("usetok").onclick = () => {
  auth.setManualAccessToken($<HTMLInputElement>("manualtok").value);
  void refreshStatus();
};

$("tree").onclick = run("listTree", () => b.listTree(rootInput.value));
$("notes").onclick = run("collectNotes", () => b.collectNotes(rootInput.value));
$("read").onclick = run("readFile", () => b.readFile(fileInput.value));
$("preview").onclick = run("renderPreview", async () => {
  const { content } = await b.readFile(fileInput.value);
  return b.renderPreview(content);
});
$("search").onclick = run("searchText", () =>
  b.searchText(rootInput.value, $<HTMLInputElement>("query").value),
);

// write → stale write (must conflict) → fresh write (must succeed) → trash
$("conflict").onclick = run("conflict round-trip", async () => {
  const path = `${rootInput.value}/.text-conflict-test.md`.replace("//", "/");
  const first = await b.writeFile(path, "first\n", null);
  const stale = await b.writeFile(path, "second\n", first.mtime - 100);
  const fresh = await b.writeFile(path, "third\n", first.mtime);
  await b.trashPath(path);
  const verdict =
    !first.conflict && stale.conflict && !fresh.conflict
      ? "PASS: stale write rejected, fresh write accepted"
      : "FAIL";
  return { verdict, first, stale, fresh };
});

void auth.completeLoginFromUrl().then((done) => {
  if (done) print("oauth", "login completed");
  void refreshStatus();
});
