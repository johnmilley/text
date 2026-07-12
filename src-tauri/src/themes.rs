use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;

/// Bundled themes, written into the user themes dir on first run so every
/// theme is an editable file on disk. (name, toml source)
///
/// Deliberately a short list — the app's own pair plus the popular families.
/// A theme cut from here moves to themes/retired/ and gets an entry in
/// RETIRED below, so unmodified seeded copies disappear from users' disks.
const BUNDLED: &[(&str, &str)] = &[
    ("text-dark", include_str!("../themes/text-dark.toml")),
    ("text-light", include_str!("../themes/text-light.toml")),
    ("ia-writer", include_str!("../themes/ia-writer.toml")),
    ("ia-writer-dark", include_str!("../themes/ia-writer-dark.toml")),
    ("emotion-side-b", include_str!("../themes/emotion-side-b.toml")),
    ("emotion-side-b-dark", include_str!("../themes/emotion-side-b-dark.toml")),
    ("monokai-calm", include_str!("../themes/monokai-calm.toml")),
    ("dracula", include_str!("../themes/dracula.toml")),
    ("nord", include_str!("../themes/nord.toml")),
    ("nord-light", include_str!("../themes/nord-light.toml")),
    ("gruvbox", include_str!("../themes/gruvbox.toml")),
    ("gruvbox-light", include_str!("../themes/gruvbox-light.toml")),
    ("solarized-dark", include_str!("../themes/solarized-dark.toml")),
    ("solarized-light", include_str!("../themes/solarized-light.toml")),
    ("catppuccin-mocha", include_str!("../themes/catppuccin-mocha.toml")),
    ("catppuccin-latte", include_str!("../themes/catppuccin-latte.toml")),
    ("tokyo-night", include_str!("../themes/tokyo-night.toml")),
    ("tokyo-day", include_str!("../themes/tokyo-day.toml")),
    ("github-light", include_str!("../themes/github-light.toml")),
];

/// Themes we used to seed. Their shipped sources ride along only so the
/// cleanup below can tell an untouched seeded copy (delete) from one the
/// user edited (keep — it's theirs now).
const RETIRED: &[(&str, &str)] = &[
    ("night-owl", include_str!("../themes/retired/night-owl.toml")),
    ("rosewater", include_str!("../themes/retired/rosewater.toml")),
    ("fjord", include_str!("../themes/retired/fjord.toml")),
    ("sepia", include_str!("../themes/retired/sepia.toml")),
    ("everforest", include_str!("../themes/retired/everforest.toml")),
    ("everforest-light", include_str!("../themes/retired/everforest-light.toml")),
    ("zenburn", include_str!("../themes/retired/zenburn.toml")),
    ("catppuccin-macchiato", include_str!("../themes/retired/catppuccin-macchiato.toml")),
    ("catppuccin-frappe", include_str!("../themes/retired/catppuccin-frappe.toml")),
    ("oceanic-next", include_str!("../themes/retired/oceanic-next.toml")),
    ("ayu-mirage", include_str!("../themes/retired/ayu-mirage.toml")),
    ("cobalt2", include_str!("../themes/retired/cobalt2.toml")),
    ("midnight", include_str!("../themes/retired/midnight.toml")),
    ("dawn", include_str!("../themes/retired/dawn.toml")),
    ("classic-paper", include_str!("../themes/retired/classic-paper.toml")),
    ("dark-academia", include_str!("../themes/retired/dark-academia.toml")),
    ("terminal-amber", include_str!("../themes/retired/terminal-amber.toml")),
    ("cyberpunk-green", include_str!("../themes/retired/cyberpunk-green.toml")),
    ("one-light", include_str!("../themes/retired/one-light.toml")),
];

pub fn config_dir() -> Result<PathBuf, String> {
    Ok(dirs::config_dir().ok_or("no config directory")?.join("text"))
}

fn themes_dir() -> Result<PathBuf, String> {
    Ok(config_dir()?.join("themes"))
}

#[derive(Deserialize)]
struct ThemeFile {
    name: String,
    #[serde(default)]
    dark: bool,
    #[serde(default)]
    colors: BTreeMap<String, String>,
    #[serde(default)]
    fonts: BTreeMap<String, String>,
}

#[derive(Serialize)]
pub struct Theme {
    pub id: String,
    pub name: String,
    pub dark: bool,
    pub colors: BTreeMap<String, String>,
    pub fonts: BTreeMap<String, String>,
    /// contents of an optional sibling <id>.css escape-hatch file
    pub css: Option<String>,
}

fn seed_bundled(dir: &PathBuf) -> Result<(), String> {
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    for (id, src) in BUNDLED {
        let path = dir.join(format!("{id}.toml"));
        if !path.exists() {
            fs::write(&path, src).map_err(|e| e.to_string())?;
        }
    }
    // retire themes cut from the bundle: only copies still byte-identical to
    // what we shipped — an edited file is the user's, and stays
    for (id, src) in RETIRED {
        let path = dir.join(format!("{id}.toml"));
        if fs::read_to_string(&path).is_ok_and(|cur| cur == *src) {
            let _ = fs::remove_file(&path);
        }
    }
    Ok(())
}

/// All themes from ~/.config/text/themes/*.toml, seeding the bundled set
/// first. A sibling <id>.css file is attached verbatim if present.
#[tauri::command]
pub fn list_themes() -> Result<Vec<Theme>, String> {
    let dir = themes_dir()?;
    seed_bundled(&dir)?;
    let mut themes = vec![];
    for item in fs::read_dir(&dir).map_err(|e| e.to_string())?.flatten() {
        let path = item.path();
        if path.extension().and_then(|e| e.to_str()) != Some("toml") {
            continue;
        }
        let id = path.file_stem().unwrap_or_default().to_string_lossy().into_owned();
        let src = match fs::read_to_string(&path) {
            Ok(s) => s,
            Err(_) => continue,
        };
        let parsed: ThemeFile = match toml::from_str(&src) {
            Ok(t) => t,
            Err(e) => {
                eprintln!("theme {id}: {e}");
                continue;
            }
        };
        let css = fs::read_to_string(dir.join(format!("{id}.css"))).ok();
        themes.push(Theme {
            id,
            name: parsed.name,
            dark: parsed.dark,
            colors: parsed.colors,
            fonts: parsed.fonts,
            css,
        });
    }
    themes.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(themes)
}

#[tauri::command]
pub fn themes_dir_path() -> Result<String, String> {
    let dir = themes_dir()?;
    seed_bundled(&dir)?;
    Ok(dir.to_string_lossy().into_owned())
}
