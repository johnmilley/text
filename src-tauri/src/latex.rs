use serde::Serialize;
use std::path::Path;
use std::process::Command;

/// Result of a LaTeX compile: `log` is always populated (pdflatex is chatty
/// even on success) but only the tail matters when `ok` is false — that's
/// where the actual error sits.
#[derive(Serialize)]
pub struct LatexResult {
    pub ok: bool,
    pub pdf_path: String,
    pub log: String,
}

const LOG_TAIL_CHARS: usize = 4000;

fn tail(s: &str, n: usize) -> String {
    let chars: Vec<char> = s.chars().collect();
    let start = chars.len().saturating_sub(n);
    chars[start..].iter().collect()
}

/// Runs the system `pdflatex` twice (so cross-references and the TOC
/// resolve) against `path`, in its own directory. No shell is involved —
/// arguments go straight to the process, so there's nothing to escape.
fn compile(path: &str) -> Result<LatexResult, String> {
    let p = Path::new(path);
    let dir = p.parent().filter(|d| !d.as_os_str().is_empty()).unwrap_or(Path::new("."));
    let file_name = p
        .file_name()
        .ok_or("path has no file name")?
        .to_string_lossy()
        .into_owned();
    let stem = p
        .file_stem()
        .ok_or("path has no file name")?
        .to_string_lossy()
        .into_owned();

    let mut log = String::new();
    for _ in 0..2 {
        let output = Command::new("pdflatex")
            .args(["-interaction=nonstopmode", "-halt-on-error", &file_name])
            .current_dir(dir)
            .output()
            .map_err(|e| {
                format!(
                    "could not run pdflatex — install a TeX distribution (TeX Live, MacTeX, MiKTeX) and make sure it's on PATH ({e})"
                )
            })?;
        log.push_str(&String::from_utf8_lossy(&output.stdout));
        log.push_str(&String::from_utf8_lossy(&output.stderr));
        if !output.status.success() {
            return Ok(LatexResult { ok: false, pdf_path: String::new(), log: tail(&log, LOG_TAIL_CHARS) });
        }
    }
    let pdf_path = dir.join(format!("{stem}.pdf"));
    Ok(LatexResult {
        ok: true,
        pdf_path: pdf_path.to_string_lossy().into_owned(),
        log: tail(&log, LOG_TAIL_CHARS),
    })
}

#[tauri::command]
pub async fn compile_latex(path: String) -> Result<LatexResult, String> {
    tauri::async_runtime::spawn_blocking(move || compile(&path))
        .await
        .map_err(|e| e.to_string())?
}
