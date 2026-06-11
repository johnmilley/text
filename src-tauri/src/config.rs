use crate::themes::config_dir;
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Serialize, Deserialize)]
#[serde(default)]
pub struct Config {
    /// theme id (file stem in the themes dir)
    pub theme: String,
    pub font_size: u16,
    pub ui_font_size: u16,
    pub vim_mode: bool,
    /// last opened notes folder
    pub root: Option<String>,
    /// folder for daily notes, relative to the notes root
    pub daily_dir: String,
    pub sidebar_width: u16,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            theme: "text-dark".into(),
            font_size: 15,
            ui_font_size: 13,
            vim_mode: false,
            root: None,
            daily_dir: "daily".into(),
            sidebar_width: 240,
        }
    }
}

#[tauri::command]
pub fn load_config() -> Result<Config, String> {
    let path = config_dir()?.join("config.toml");
    match fs::read_to_string(&path) {
        Ok(src) => toml::from_str(&src).map_err(|e| e.to_string()),
        Err(_) => Ok(Config::default()),
    }
}

#[tauri::command]
pub fn save_config(config: Config) -> Result<(), String> {
    let dir = config_dir()?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let src = toml::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(dir.join("config.toml"), src).map_err(|e| e.to_string())
}
