use crate::files::is_text_file;
use regex::RegexBuilder;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

const MAX_RESULTS: usize = 500;
const MAX_FILE_BYTES: u64 = 4 * 1024 * 1024;
/// Total text held in the content cache before it is dropped wholesale. A
/// vault bigger than this simply searches from disk, as it always did.
const MAX_CACHE_BYTES: usize = 48 * 1024 * 1024;

#[derive(Serialize)]
pub struct Hit {
    pub path: String,
    pub line: usize,
    pub text: String,
    /// every match on this line, as [start, end] byte offsets into `text`
    pub matches: Vec<(usize, usize)>,
}

/// How to interpret the query. Absent fields mean the old behaviour:
/// literal text, smart case, whole line.
#[derive(Deserialize, Default)]
#[serde(default)]
pub struct SearchOpts {
    /// treat the query as a regular expression instead of literal text
    pub regex: bool,
    /// force case sensitivity; when false, smart case decides (a query with
    /// an uppercase letter in it is case-sensitive)
    pub case_sensitive: bool,
    /// require the match to sit on word boundaries
    pub whole_word: bool,
}

// ------------------------------------------------------------ content cache

/// Files already read, keyed by path, valid while mtime *and* length agree.
///
/// Search runs on every keystroke, and without this each one re-reads the
/// whole vault from disk. The staleness check is the same pair the rest of the
/// app trusts for external edits, so a file changed underneath us is re-read.
static CACHE: Mutex<Option<HashMap<PathBuf, (u64, u64, String)>>> = Mutex::new(None);

fn cache_bytes(map: &HashMap<PathBuf, (u64, u64, String)>) -> usize {
    map.values().map(|(_, _, text)| text.len()).sum()
}

/// Read `path`, going through the cache. `stamp` is its (mtime, len).
fn read_cached(path: &Path, stamp: (u64, u64)) -> Option<String> {
    if let Ok(mut guard) = CACHE.lock() {
        let map = guard.get_or_insert_with(HashMap::new);
        if let Some((mtime, len, text)) = map.get(path) {
            if (*mtime, *len) == stamp {
                return Some(text.clone());
            }
        }
    }
    let text = fs::read_to_string(path).ok()?;
    if let Ok(mut guard) = CACHE.lock() {
        let map = guard.get_or_insert_with(HashMap::new);
        if cache_bytes(map) + text.len() > MAX_CACHE_BYTES {
            map.clear();
        }
        map.insert(path.to_path_buf(), (stamp.0, stamp.1, text.clone()));
    }
    Some(text)
}

/// Drop cached text for paths the watcher saw change. Belt and braces: the
/// mtime check already catches this, but a file rewritten inside the same
/// second with the same length would otherwise slip through.
pub fn invalidate_cache(paths: &[String]) {
    let Ok(mut guard) = CACHE.lock() else { return };
    let Some(map) = guard.as_mut() else { return };
    for path in paths {
        map.remove(Path::new(path));
    }
}

fn walk_files(dir: &Path, out: &mut Vec<std::path::PathBuf>) {
    let Ok(read) = fs::read_dir(dir) else { return };
    for item in read.flatten() {
        let name = item.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue;
        }
        let path = item.path();
        let Ok(ft) = item.file_type() else { continue };
        if ft.is_dir() {
            walk_files(&path, out);
        } else if ft.is_file() && is_text_file(&path) {
            out.push(path);
        }
    }
}

/// (mtime seconds, length) for the staleness check, or None when unreadable
/// or too big to search.
fn stamp_of(path: &Path) -> Option<(u64, u64)> {
    let meta = fs::metadata(path).ok()?;
    let len = meta.len();
    if len > MAX_FILE_BYTES {
        return None;
    }
    let mtime = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);
    Some((mtime, len))
}

fn grep(root: &str, pattern: &regex::Regex) -> Vec<Hit> {
    let mut files = vec![];
    walk_files(Path::new(root), &mut files);
    let mut hits = vec![];
    'outer: for path in files {
        let Some(stamp) = stamp_of(&path) else { continue };
        let Some(content) = read_cached(&path, stamp) else { continue };
        for (i, line) in content.lines().enumerate() {
            // one row per line carrying *every* match on it, so the count is
            // honest and each occurrence is highlighted
            let mut matches: Vec<(usize, usize)> = vec![];
            for m in pattern.find_iter(line) {
                if m.start() >= 400 {
                    break;
                }
                matches.push((m.start(), m.end().min(400)));
            }
            if matches.is_empty() {
                continue;
            }
            hits.push(Hit {
                path: path.to_string_lossy().into_owned(),
                line: i + 1,
                text: line.chars().take(400).collect(),
                matches,
            });
            if hits.len() >= MAX_RESULTS {
                break 'outer;
            }
        }
    }
    hits
}

/// Grep off the main thread — sync commands run on it, and scanning the whole
/// vault there freezes the UI (see collect_notes in query.rs).
async fn grep_blocking(root: String, pattern: regex::Regex) -> Result<Vec<Hit>, String> {
    tauri::async_runtime::spawn_blocking(move || grep(&root, &pattern))
        .await
        .map_err(|e| e.to_string())
}

/// Full-text search across the folder. Literal and smart-case by default
/// (case-insensitive unless the query contains an uppercase letter); `opts`
/// switches on regex, forced case sensitivity, or whole-word matching.
#[tauri::command]
pub async fn search_text(
    root: String,
    query: String,
    opts: Option<SearchOpts>,
) -> Result<Vec<Hit>, String> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }
    let opts = opts.unwrap_or_default();
    let case_insensitive = !opts.case_sensitive && !query.chars().any(|c| c.is_uppercase());
    let body = if opts.regex {
        query.clone()
    } else {
        regex::escape(&query)
    };
    let body = if opts.whole_word {
        format!(r"\b(?:{body})\b")
    } else {
        body
    };
    let pattern = RegexBuilder::new(&body)
        .case_insensitive(case_insensitive)
        .size_limit(1 << 20)
        .build()
        // a half-typed regex is the normal state of an incremental search —
        // report it as a message the pane can show, not as a crash
        .map_err(|_| "bad pattern".to_string())?;
    grep_blocking(root, pattern).await
}

/// Find every line in the folder that wikilinks to `target` (a note name
/// without extension): [[target]], [[target|label]], [[target#heading]].
#[tauri::command]
pub async fn find_backlinks(root: String, target: String) -> Result<Vec<Hit>, String> {
    if target.trim().is_empty() {
        return Ok(vec![]);
    }
    let pattern = RegexBuilder::new(&format!(
        r"\[\[{}\s*([|#][^\]]*)?\]\]",
        regex::escape(target.trim())
    ))
    .case_insensitive(true)
    .build()
    .map_err(|e| e.to_string())?;
    grep_blocking(root, pattern).await
}
