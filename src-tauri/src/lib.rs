mod config;
mod files;
mod search;
mod themes;
mod watch;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(watch::WatcherState::default())
        .invoke_handler(tauri::generate_handler![
            files::list_tree,
            files::read_file,
            files::read_image,
            files::write_file,
            files::create_file,
            files::create_dir,
            files::rename_path,
            files::trash_path,
            files::stat_mtime,
            search::search_text,
            search::find_backlinks,
            themes::list_themes,
            themes::themes_dir_path,
            config::load_config,
            config::save_config,
            watch::watch_root,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
