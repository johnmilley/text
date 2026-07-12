//! Native clipboard read for image paste. WebKitGTK's DOM ClipboardEvent
//! doesn't reliably expose image data (screenshots, images copied from other
//! apps), so the editor's paste handler falls back to this command when the
//! event carries no image and no text.

use base64::Engine;

/// The current clipboard image as base64 PNG, or None when the clipboard
/// holds no image. Runs blocking clipboard IO — invoked async from JS.
#[tauri::command]
pub fn read_clipboard_image() -> Result<Option<String>, String> {
    let mut cb = arboard::Clipboard::new().map_err(|e| e.to_string())?;
    let img = match cb.get_image() {
        Ok(img) => img,
        Err(arboard::Error::ContentNotAvailable) => return Ok(None),
        Err(e) => return Err(e.to_string()),
    };
    let mut png = Vec::new();
    {
        let mut enc = png::Encoder::new(&mut png, img.width as u32, img.height as u32);
        enc.set_color(png::ColorType::Rgba);
        enc.set_depth(png::BitDepth::Eight);
        let mut writer = enc.write_header().map_err(|e| e.to_string())?;
        writer
            .write_image_data(&img.bytes)
            .map_err(|e| e.to_string())?;
    }
    Ok(Some(base64::engine::general_purpose::STANDARD.encode(png)))
}
