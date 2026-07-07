/**
 * Thin wrappers over Dropbox's HTTP API: JSON "RPC" endpoints on
 * api.dropboxapi.com and up/download "content" endpoints on
 * content.dropboxapi.com. Handles auth headers, one 401 retry after a token
 * refresh, and 429 rate-limit backoff. Structured API errors surface as
 * DropboxError so callers can branch on tags like path conflicts.
 */

import { getAccessToken } from "./auth";

export class DropboxError extends Error {
  /** Parsed `error` object from the response body, when present. */
  readonly error: unknown;
  readonly status: number;
  constructor(status: number, summary: string, error: unknown) {
    super(summary);
    this.status = status;
    this.error = error;
  }
}

/** Walk the error union looking for a `.tag` value (e.g. "conflict"). */
export function hasTag(err: unknown, tag: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  const o = err as Record<string, unknown>;
  if (o[".tag"] === tag) return true;
  return Object.values(o).some((v) => hasTag(v, tag));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function send(url: string, init: RequestInit, attempt = 0): Promise<Response> {
  const token = await getAccessToken(attempt > 0);
  const resp = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
  if (resp.status === 401 && attempt === 0) return send(url, init, 1);
  if (resp.status === 429 && attempt < 4) {
    const retry = Number(resp.headers.get("Retry-After")) || 1;
    await sleep(retry * 1000);
    return send(url, init, attempt + 1);
  }
  return resp;
}

async function raise(resp: Response): Promise<never> {
  const text = await resp.text();
  try {
    const body = JSON.parse(text) as { error_summary?: string; error?: unknown };
    throw new DropboxError(resp.status, body.error_summary ?? text, body.error);
  } catch (e) {
    if (e instanceof DropboxError) throw e;
    throw new DropboxError(resp.status, `${resp.status}: ${text}`, null);
  }
}

/** JSON-in/JSON-out endpoint (files/list_folder, files/move_v2, …). */
export async function rpc<T>(endpoint: string, args: unknown): Promise<T> {
  const resp = await send(`https://api.dropboxapi.com/2/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!resp.ok) await raise(resp);
  return (await resp.json()) as T;
}

/** files/download — body is the file, metadata rides a response header. */
export async function download(path: string): Promise<{ resp: Response; meta: FileMetadata }> {
  const resp = await send("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: { "Dropbox-API-Arg": apiArg({ path }) },
  });
  if (!resp.ok) await raise(resp);
  const meta = JSON.parse(resp.headers.get("Dropbox-API-Result") ?? "{}") as FileMetadata;
  return { resp, meta };
}

export type UploadMode = "add" | "overwrite" | { ".tag": "update"; update: string };

export async function upload(
  path: string,
  body: BodyInit,
  mode: UploadMode,
  autorename = false,
): Promise<FileMetadata> {
  const resp = await send("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": apiArg({ path, mode, autorename, mute: true }),
    },
    body,
  });
  if (!resp.ok) await raise(resp);
  return (await resp.json()) as FileMetadata;
}

/** Dropbox requires non-ASCII in this header to be \uXXXX-escaped. */
const apiArg = (args: unknown): string =>
  JSON.stringify(args).replace(/[\u007f-\uffff]/g, (c) => {
    return "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0");
  });

// ------------------------------------------------------------------ types

export interface FileMetadata {
  ".tag"?: "file";
  name: string;
  path_display: string;
  path_lower: string;
  rev: string;
  size: number;
  server_modified: string; // ISO timestamp
}

export interface FolderMetadata {
  ".tag": "folder";
  name: string;
  path_display: string;
  path_lower: string;
}

export type EntryMetadata = (FileMetadata & { ".tag": "file" }) | FolderMetadata;

/** Seconds since epoch from a file's server_modified — the web "mtime". */
export const mtimeOf = (meta: FileMetadata): number =>
  Math.floor(Date.parse(meta.server_modified) / 1000) || 0;

/** files/list_folder with cursor continuation. The returned cursor can be
 * fed to {@link listFolderContinue} later to get only what changed since. */
export async function listFolderFull(
  path: string,
  recursive: boolean,
): Promise<{ entries: EntryMetadata[]; cursor: string }> {
  const out: EntryMetadata[] = [];
  let page = await rpc<ListFolderResult>("files/list_folder", {
    path,
    recursive,
    limit: 2000,
    include_deleted: false,
    include_non_downloadable_files: false,
  });
  out.push(...page.entries);
  while (page.has_more) {
    page = await rpc<ListFolderResult>("files/list_folder/continue", { cursor: page.cursor });
    out.push(...page.entries);
  }
  return { entries: out, cursor: page.cursor };
}

export const listFolderAll = async (
  path: string,
  recursive: boolean,
): Promise<EntryMetadata[]> => (await listFolderFull(path, recursive)).entries;

/** Changes since a cursor (deltas include DeletedMetadata entries). Throws a
 * DropboxError tagged "reset" when the cursor has expired — do a full list. */
export async function listFolderContinue(
  cursor: string,
): Promise<{ entries: DeltaMetadata[]; cursor: string }> {
  const out: DeltaMetadata[] = [];
  let page: ListFolderResult & { entries: DeltaMetadata[] };
  let cur = cursor;
  do {
    page = await rpc("files/list_folder/continue", { cursor: cur });
    out.push(...page.entries);
    cur = page.cursor;
  } while (page.has_more);
  return { entries: out, cursor: cur };
}

interface ListFolderResult {
  entries: EntryMetadata[];
  cursor: string;
  has_more: boolean;
}

export interface DeletedMetadata {
  ".tag": "deleted";
  name: string;
  path_display: string;
  path_lower: string;
}

export type DeltaMetadata = EntryMetadata | DeletedMetadata;

export async function getMetadata(path: string): Promise<EntryMetadata> {
  return rpc<EntryMetadata>("files/get_metadata", { path });
}

/** Metadata, or null when the path doesn't exist. */
export async function getMetadataOrNull(path: string): Promise<EntryMetadata | null> {
  try {
    return await getMetadata(path);
  } catch (e) {
    if (e instanceof DropboxError && hasTag(e.error, "not_found")) return null;
    throw e;
  }
}
