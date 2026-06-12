mod config;
mod export;
mod files;
mod search;
mod share;
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
            search::search_text,
            search::find_backlinks,
            share::share_status,
            share::create_share,
            share::update_share,
            share::destroy_share,
            share::cleanup_expired_shares,
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
