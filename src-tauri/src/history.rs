use crate::themes::config_dir;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// Don't take a new snapshot of a file more often than this. Autosave fires
/// about a second after you stop typing; snapshotting each one would be
/// thousands of files a day for no extra safety.
const MIN_INTERVAL_SECS: u64 = 120;
/// Versions kept per file, newest first.
const KEEP_VERSIONS: usize = 40;
/// Older than this is dropped — but never below KEEP_FLOOR versions, so a
/// note you haven't touched in months still has its history.
const KEEP_DAYS: u64 = 30;
const KEEP_FLOOR: usize = 8;
/// Files above this are not worth versioning (and are not notes).
const MAX_SNAPSHOT_BYTES: usize = 2 * 1024 * 1024;

#[derive(Serialize)]
pub struct Version {
    /// unix seconds
    pub ts: u64,
    pub bytes: usize,
}

fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// FNV-1a of the absolute path. Only needs to be stable and collision-shy
/// enough to key a directory — not cryptographic.
fn path_key(path: &str) -> String {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for byte in path.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x1000_0000_01b3);
    }
    // a readable prefix makes the directory browsable by hand
    let stem: String = Path::new(path)
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default()
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_' || *c == '.')
        .take(40)
        .collect();
    format!("{stem}-{hash:016x}")
}

/// `~/.config/pt/history/<file-key>/`, created on demand.
///
/// History lives beside the config rather than inside the notes folder on
/// purpose: it must not sync (Dropbox would carry every version of every
/// note), must not show up in the file tree, and must survive the folder
/// being moved.
fn dir_for(path: &str) -> Result<PathBuf, String> {
    let dir = config_dir()?.join("history").join(path_key(path));
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Timestamps present for a file, newest first.
fn timestamps(dir: &Path) -> Vec<u64> {
    let Ok(read) = fs::read_dir(dir) else { return vec![] };
    let mut out: Vec<u64> = read
        .flatten()
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().into_owned();
            name.strip_suffix(".snap")?.parse::<u64>().ok()
        })
        .collect();
    out.sort_unstable_by(|a, b| b.cmp(a));
    out
}

fn prune(dir: &Path) {
    let stamps = timestamps(dir);
    let cutoff = now().saturating_sub(KEEP_DAYS * 86_400);
    for (i, ts) in stamps.iter().enumerate() {
        let too_many = i >= KEEP_VERSIONS;
        let too_old = i >= KEEP_FLOOR && *ts < cutoff;
        if too_many || too_old {
            let _ = fs::remove_file(dir.join(format!("{ts}.snap")));
        }
    }
}

/// Record `content` as a version of `path`, unless one was taken recently or
/// the newest one is already identical. Returns true when a version was
/// written. Never fails the caller: losing a snapshot must not fail a save.
#[tauri::command]
pub fn snapshot_file(path: String, content: String) -> Result<bool, String> {
    if content.len() > MAX_SNAPSHOT_BYTES {
        return Ok(false);
    }
    let dir = dir_for(&path)?;
    let stamps = timestamps(&dir);
    if let Some(newest) = stamps.first() {
        if now().saturating_sub(*newest) < MIN_INTERVAL_SECS {
            return Ok(false);
        }
        // an unchanged file is not a new version
        if fs::read_to_string(dir.join(format!("{newest}.snap")))
            .map(|prev| prev == content)
            .unwrap_or(false)
        {
            return Ok(false);
        }
    }
    // the original path, so the history directory is legible on its own
    let _ = fs::write(dir.join("path"), &path);
    fs::write(dir.join(format!("{}.snap", now())), &content).map_err(|e| e.to_string())?;
    prune(&dir);
    Ok(true)
}

/// Versions held for `path`, newest first.
#[tauri::command]
pub fn list_history(path: String) -> Result<Vec<Version>, String> {
    let dir = config_dir()?.join("history").join(path_key(&path));
    Ok(timestamps(&dir)
        .into_iter()
        .map(|ts| Version {
            ts,
            bytes: fs::metadata(dir.join(format!("{ts}.snap")))
                .map(|m| m.len() as usize)
                .unwrap_or(0),
        })
        .collect())
}

/// The stored text of one version.
#[tauri::command]
pub fn read_history(path: String, ts: u64) -> Result<String, String> {
    let file = config_dir()?
        .join("history")
        .join(path_key(&path))
        .join(format!("{ts}.snap"));
    fs::read_to_string(file).map_err(|e| e.to_string())
}
