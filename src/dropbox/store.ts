/**
 * IndexedDB persistence for the Dropbox content cache: downloaded note text
 * keyed by path (rev-stamped) plus the list_folder cursor per root. Reloads
 * then hydrate from disk and ask Dropbox only for what changed since the
 * cursor — instead of re-downloading the vault. Everything degrades to
 * memory-only when IndexedDB is unavailable (private browsing).
 */

const DB = "text-dropbox";
const FILES = "files"; // pathLower → CachedRow
const KV = "kv"; // "cursor:<root>" → string

export interface CachedRow {
  pathLower: string;
  rev: string;
  text: string;
  mtime: number;
  path: string; // display path
  size: number;
}

let dbp: Promise<IDBDatabase | null> | null = null;

function db(): Promise<IDBDatabase | null> {
  dbp ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(FILES, { keyPath: "pathLower" });
        req.result.createObjectStore(KV);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbp;
}

/** Run `fn` in a transaction; swallow failures (cache only, never truth). */
async function tx(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => void,
): Promise<void> {
  const d = await db();
  if (!d) return;
  await new Promise<void>((resolve) => {
    try {
      const t = d.transaction(store, mode);
      fn(t.objectStore(store));
      t.oncomplete = () => resolve();
      t.onerror = () => resolve();
      t.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadAllFiles(): Promise<CachedRow[]> {
  const d = await db();
  if (!d) return [];
  return new Promise((resolve) => {
    try {
      const req = d.transaction(FILES, "readonly").objectStore(FILES).getAll();
      req.onsuccess = () => resolve(req.result as CachedRow[]);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export const putFile = (row: CachedRow): Promise<void> =>
  tx(FILES, "readwrite", (s) => s.put(row));

export const deleteFile = (pathLower: string): Promise<void> =>
  tx(FILES, "readwrite", (s) => s.delete(pathLower));

/** Delete a path and everything under it (rename/trash of a folder). */
export const deletePrefix = (pathLower: string): Promise<void> =>
  tx(FILES, "readwrite", (s) => {
    s.delete(pathLower);
    // IDBKeyRange over "<p>/" … "<p>/￿" catches every descendant
    s.delete(IDBKeyRange.bound(`${pathLower}/`, `${pathLower}/￿`));
  });

export async function getCursor(root: string): Promise<string | null> {
  const d = await db();
  if (!d) return null;
  return new Promise((resolve) => {
    try {
      const req = d.transaction(KV, "readonly").objectStore(KV).get(`cursor:${root}`);
      req.onsuccess = () => resolve((req.result as string) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export const setCursor = (root: string, cursor: string): Promise<void> =>
  tx(KV, "readwrite", (s) => s.put(cursor, `cursor:${root}`));

export const clearCursor = (root: string): Promise<void> =>
  tx(KV, "readwrite", (s) => s.delete(`cursor:${root}`));
