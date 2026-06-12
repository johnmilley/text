//! Extra app windows: each is a full instance of the frontend. A new window
//! gets its root/file handed over via managed state (keyed by window label)
//! rather than URL query params, which WebviewUrl handles inconsistently.

use serde::Serialize;
use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, State, WebviewUrl, WebviewWindowBuilder};

#[derive(Default)]
pub struct WindowParams(pub Mutex<HashMap<String, WindowInit>>);

#[derive(Clone, Serialize)]
pub struct WindowInit {
    pub root: Option<String>,
    pub file: Option<String>,
}

static NEXT_WINDOW: AtomicUsize = AtomicUsize::new(1);

/// Open another app window, optionally on a specific root and file (used by
/// "open in new window" and dragging a tab out of the window).
#[tauri::command]
pub fn open_window(
    app: AppHandle,
    state: State<'_, WindowParams>,
    root: Option<String>,
    file: Option<String>,
) -> Result<(), String> {
    let label = format!("win-{}", NEXT_WINDOW.fetch_add(1, Ordering::Relaxed));
    state
        .0
        .lock()
        .unwrap()
        .insert(label.clone(), WindowInit { root, file });
    // mirrors the main window's config in tauri.conf.json
    WebviewWindowBuilder::new(&app, &label, WebviewUrl::App("index.html".into()))
        .title("text")
        .inner_size(1100.0, 760.0)
        .min_inner_size(480.0, 320.0)
        .decorations(false)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Called once by each new window on startup; None for the main window or
/// after the params were already consumed.
#[tauri::command]
pub fn window_init_params(
    window: tauri::WebviewWindow,
    state: State<'_, WindowParams>,
) -> Option<WindowInit> {
    state.0.lock().unwrap().remove(window.label())
}
