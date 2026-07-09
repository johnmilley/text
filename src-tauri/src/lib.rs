mod config;
mod files;
mod latex;
mod query;
mod render;
mod search;
mod themes;
mod watch;
mod windows;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(watch::WatcherState::default())
        .manage(windows::WindowParams::default())
        .setup(|app| {
            // `text <file|dir>` — stash CLI args as the main window's params
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
                let app_menu = SubmenuBuilder::new(app, "text")
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
            search::search_text,
            search::find_backlinks,
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
