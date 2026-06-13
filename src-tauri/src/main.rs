// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Launched from a terminal, hand off to a detached copy so the shell prompt
    // comes straight back (the GUI keeps running). No-op once re-spawned or when
    // there's no tty (app menu / .desktop launch).
    #[cfg(target_os = "linux")]
    detach_from_terminal();

    // WebKitGTK's DMA-BUF renderer crashes with "Error 71 (Protocol error)
    // dispatching to Wayland display" on some compositor/driver combos.
    // Disable it unless the user has set the variable themselves.
    #[cfg(target_os = "linux")]
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
    text_lib::run()
}

/// Re-spawn in a new session (via `setsid`) and exit the parent, so running
/// `text` from a terminal returns the prompt immediately while the window stays
/// up. Guarded by `TEXT_DETACHED` so the child doesn't re-spawn; skipped when
/// stdin/stdout aren't a terminal (so a `.desktop`/menu launch is untouched and
/// piped output still works). If `setsid` is missing it falls through and runs
/// in the foreground as before — detaching is best-effort, never fatal.
#[cfg(target_os = "linux")]
fn detach_from_terminal() {
    use std::io::IsTerminal;
    use std::process::{Command, Stdio};

    if std::env::var_os("TEXT_DETACHED").is_some() {
        return; // this is the re-spawned child — run the app
    }
    if !std::io::stdin().is_terminal() && !std::io::stdout().is_terminal() {
        return; // not an interactive launch
    }
    let exe = match std::env::current_exe() {
        Ok(p) => p,
        Err(_) => return,
    };
    let spawned = Command::new("setsid")
        .arg(exe)
        .args(std::env::args_os().skip(1)) // pass through `text <file|dir>`
        .env("TEXT_DETACHED", "1")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn();
    if spawned.is_ok() {
        std::process::exit(0); // shell prompt returns; child carries on
    }
}
