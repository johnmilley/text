mod clipboard;
mod config;
mod files;
mod history;
mod latex;
mod query;
mod render;
mod search;
mod themes;
mod watch;
mod windows;

/// WebKitGTK ships with its spell checker disabled, so the editor's
/// `spellcheck` attribute did nothing on Linux. Enable it for the webview's
/// context with the user's locale (from LANG/LC_ALL; dictionaries come from
/// enchant — hunspell-<lang> packages). Idempotent, so it simply runs on every
/// page load of every window.
#[cfg(target_os = "linux")]
fn enable_spellcheck(webview: &tauri::Webview) {
    let lang = ["LC_ALL", "LC_MESSAGES", "LANG"]
        .iter()
        .filter_map(|k| std::env::var(k).ok())
        .find(|v| !v.is_empty() && v != "C" && v != "POSIX")
        .and_then(|v| v.split(['.', '@']).next().map(str::to_owned))
        .unwrap_or_else(|| "en_US".into());
    let _ = webview.with_webview(move |wv| {
        use webkit2gtk::{WebContextExt, WebViewExt};
        if let Some(ctx) = wv.inner().context() {
            ctx.set_spell_checking_enabled(true);
            ctx.set_spell_checking_languages(&[lang.as_str()]);
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        // remember window size/position across launches (per window label);
        // without this the WM places the window wherever it pleases
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .on_page_load(|_webview, _payload| {
            #[cfg(target_os = "linux")]
            enable_spellcheck(_webview);
        })
        .manage(watch::WatcherState::default())
        .manage(windows::WindowParams::default())
        .setup(|app| {
            // `pt <file|dir>` — stash CLI args as the main window's params
            use tauri::Manager;
            if let Some(params) = windows::cli_params() {
                let state = app.state::<windows::WindowParams>();
                state.0.lock().unwrap().insert("main".into(), params);
            }
            // macOS: replace the default menu — its "Close Window" item owns
            // Cmd+W, which must reach the frontend as "close tab" instead.
            // Edit roles stay, or Cmd+C/V/X wouldn't work in the webview.
            #[cfg(target_os = "macos")]
            {
                use tauri::menu::{AboutMetadata, MenuBuilder, SubmenuBuilder};
                let app_menu = SubmenuBuilder::new(app, "pt")
                    .about(Some(AboutMetadata::default()))
                    .separator()
                    .services()
                    .separator()
                    .hide()
                    .hide_others()
                    .show_all()
                    .separator()
                    .quit()
                    .build()?;
                let edit = SubmenuBuilder::new(app, "Edit")
                    .undo()
                    .redo()
                    .separator()
                    .cut()
                    .copy()
                    .paste()
                    .select_all()
                    .build()?;
                let window = SubmenuBuilder::new(app, "Window")
                    .minimize()
                    .maximize()
                    .build()?;
                let menu = MenuBuilder::new(app)
                    .items(&[&app_menu, &edit, &window])
                    .build()?;
                app.set_menu(menu)?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            files::list_tree,
            files::folder_orders,
            files::read_file,
            files::read_image,
            files::write_file,
            files::create_file,
            files::create_dir,
            files::import_file,
            files::write_base64,
            files::copy_path,
            files::overwrite_base64,
            files::rename_path,
            files::trash_path,
            files::stat_mtime,
            files::read_base64,
            files::write_text_file,
            files::copy_file,
            latex::compile_latex,
            clipboard::read_clipboard_image,
            search::search_text,
            search::find_backlinks,
            history::snapshot_file,
            history::list_history,
            history::read_history,
            query::collect_notes,
            render::render_preview,
            themes::list_themes,
            themes::themes_dir_path,
            config::load_config,
            config::save_config,
            watch::watch_root,
            windows::open_window,
            windows::window_init_params,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
