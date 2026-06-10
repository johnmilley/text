use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

/// Extensions treated as editable text. Anything else is left out of the
/// tree so binaries, images, and sync droppings never show up.
pub const TEXT_EXTENSIONS: &[&str] = &[
    "md", "markdown", "mdown", "txt", "text", "json", "yaml", "yml", "toml", "ini", "cfg",
    "conf", "csv", "tsv", "log", "tex", "bib", "org", "rst", "adoc", "html", "htm", "css",
    "js", "ts", "jsx", "tsx", "py", "rs", "sh", "bash", "zsh", "fish", "c", "h", "cpp",
    "hpp", "go", "rb", "lua", "sql", "xml", "svg", "env", "gitignore", "fountain",
];

pub fn is_text_file(path: &Path) -> bool {
    match path.extension().and_then(|e| e.to_str()) {
        Some(ext) => TEXT_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()),
        // extensionless files like LICENSE, TODO, Makefile-ish notes
        None => true,
    }
}

fn is_hidden(name: &str) -> bool {
    name.starts_with('.')
}

#[derive(Serialize)]
pub struct Entry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<Entry>>,
}

fn walk(dir: &Path, depth: usize) -> Result<Vec<Entry>, String> {
    if depth > 32 {
        return Ok(vec![]);
    }
    let mut dirs: Vec<Entry> = vec![];
    let mut files: Vec<Entry> = vec![];
    let read = fs::read_dir(dir).map_err(|e| format!("{}: {e}", dir.display()))?;
    for item in read.flatten() {
        let path = item.path();
        let name = item.file_name().to_string_lossy().into_owned();
        if is_hidden(&name) {
            continue;
        }
        let Ok(ft) = item.file_type() else { continue };
        if ft.is_dir() {
            dirs.push(Entry {
                children: Some(walk(&path, depth + 1)?),
                name,
                path: path.to_string_lossy().into_owned(),
                is_dir: true,
            });
        } else if ft.is_file() && is_text_file(&path) {
            files.push(Entry {
                name,
                path: path.to_string_lossy().into_owned(),
                is_dir: false,
                children: None,
            });
        }
    }
    let sort = |v: &mut Vec<Entry>| {
        v.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    };
    sort(&mut dirs);
    sort(&mut files);
    dirs.extend(files);
    Ok(dirs)
}

#[tauri::command]
pub fn list_tree(root: String) -> Result<Vec<Entry>, String> {
    walk(Path::new(&root), 0)
}

pub fn mtime_of(path: &Path) -> Result<u64, String> {
    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
    let t = meta.modified().map_err(|e| e.to_string())?;
    Ok(t.duration_since(UNIX_EPOCH).map_err(|e| e.to_string())?.as_millis() as u64)
}

#[derive(Serialize)]
pub struct FileContent {
    pub content: String,
    pub mtime: u64,
}

#[tauri::command]
pub fn read_file(path: String) -> Result<FileContent, String> {
    let p = Path::new(&path);
    let bytes = fs::read(p).map_err(|e| e.to_string())?;
    let content = String::from_utf8(bytes)
        .map_err(|_| format!("{} is not valid UTF-8 text", p.display()))?;
    Ok(FileContent { content, mtime: mtime_of(p)? })
}

#[derive(Serialize)]
pub struct WriteResult {
    pub mtime: u64,
    pub conflict: bool,
}

/// Atomic save: write to a temp file in the same directory, then rename over
/// the target, so Dropbox never syncs a half-written note. If the file on
/// disk is newer than what the editor last saw, refuse and report a conflict.
#[tauri::command]
pub fn write_file(
    path: String,
    content: String,
    expected_mtime: Option<u64>,
) -> Result<WriteResult, String> {
    let p = PathBuf::from(&path);
    if let (Some(expected), Ok(on_disk)) = (expected_mtime, mtime_of(&p)) {
        if on_disk != expected {
            return Ok(WriteResult { mtime: on_disk, conflict: true });
        }
    }
    let dir = p.parent().ok_or("path has no parent directory")?;
    let tmp = dir.join(format!(
        ".{}.text-tmp",
        p.file_name().map(|n| n.to_string_lossy()).unwrap_or_default()
    ));
    fs::write(&tmp, content.as_bytes()).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &p).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        e.to_string()
    })?;
    Ok(WriteResult { mtime: mtime_of(&p)?, conflict: false })
}

#[tauri::command]
pub fn stat_mtime(path: String) -> Result<u64, String> {
    mtime_of(Path::new(&path))
}

#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.exists() {
        return Err(format!("{} already exists", p.display()));
    }
    if let Some(dir) = p.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    fs::write(p, b"").map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_path(from: String, to: String) -> Result<(), String> {
    if Path::new(&to).exists() {
        return Err(format!("{to} already exists"));
    }
    fs::rename(&from, &to).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn trash_path(path: String) -> Result<(), String> {
    trash::delete(Path::new(&path)).map_err(|e| e.to_string())
}
