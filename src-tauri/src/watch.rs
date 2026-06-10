use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

#[derive(Default)]
pub struct WatcherState(pub Mutex<Option<RecommendedWatcher>>);

/// Watch the notes root and emit a debounced "fs:changed" event with the
/// affected paths. The frontend uses it to refresh the tree and detect
/// external edits to the open file (e.g. Dropbox sync).
#[tauri::command]
pub fn watch_root(
    app: AppHandle,
    state: State<'_, WatcherState>,
    root: String,
) -> Result<(), String> {
    let (tx, rx) = mpsc::channel::<Vec<String>>();

    let mut watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
        if let Ok(event) = res {
            let paths: Vec<String> = event
                .paths
                .iter()
                .map(|p| p.to_string_lossy().into_owned())
                .filter(|p| !p.ends_with(".text-tmp"))
                .collect();
            if !paths.is_empty() {
                let _ = tx.send(paths);
            }
        }
    })
    .map_err(|e| e.to_string())?;

    watcher
        .watch(Path::new(&root), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    // Replacing the previous watcher drops it, which stops its thread.
    *state.0.lock().unwrap() = Some(watcher);

    std::thread::spawn(move || {
        // Debounce: collect events for 300ms after the first one, then emit.
        while let Ok(first) = rx.recv() {
            let mut paths = first;
            let deadline = std::time::Instant::now() + Duration::from_millis(300);
            while let Some(left) = deadline.checked_duration_since(std::time::Instant::now()) {
                match rx.recv_timeout(left) {
                    Ok(more) => paths.extend(more),
                    Err(_) => break,
                }
            }
            paths.sort();
            paths.dedup();
            let _ = app.emit("fs:changed", paths);
        }
    });

    Ok(())
}
