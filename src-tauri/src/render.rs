//! Markdown → HTML for the in-app preview pane. This is the host's markdown
//! primitive: it is exposed to mods (via the `render_preview` command) so
//! features like static-site generation can reuse the exact rendering the
//! editor preview uses. Wikilinks/embeds are emitted as `data-*` placeholders
//! for the consumer (preview pane, or a mod) to resolve against a folder.

use crate::files::is_image_file;
use pulldown_cmark::{html, CowStr, Event, LinkType, Options, Parser, Tag, TagEnd};
use std::path::Path;

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;")
}

fn slugify(text: &str) -> String {
    let mut out = String::new();
    let mut dash = true; // suppress leading dashes
    for c in text.chars() {
        if c.is_alphanumeric() {
            out.extend(c.to_lowercase());
            dash = false;
        } else if !dash {
            out.push('-');
            dash = true;
        }
    }
    out.trim_end_matches('-').to_string()
}

const MD_OPTIONS: Options = Options::ENABLE_TABLES
    .union(Options::ENABLE_STRIKETHROUGH)
    .union(Options::ENABLE_TASKLISTS)
    .union(Options::ENABLE_FOOTNOTES)
    .union(Options::ENABLE_WIKILINKS)
    .union(Options::ENABLE_YAML_STYLE_METADATA_BLOCKS);

fn plain_text(events: &[Event]) -> String {
    let mut s = String::new();
    for ev in events {
        match ev {
            Event::Text(t) | Event::Code(t) => s.push_str(t),
            _ => {}
        }
    }
    s
}

/// Give headings derived ids, so [[note#section]] anchors land.
fn add_heading_ids(events: &mut [Event]) {
    let mut i = 0;
    while i < events.len() {
        if let Event::Start(Tag::Heading { id, .. }) = &events[i] {
            if id.is_none() {
                let end = events[i..]
                    .iter()
                    .position(|e| matches!(e, Event::End(TagEnd::Heading(_))))
                    .map(|p| i + p)
                    .unwrap_or(events.len());
                let slug = slugify(&plain_text(&events[i + 1..end]));
                if let Event::Start(Tag::Heading { id, .. }) = &mut events[i] {
                    *id = Some(CowStr::from(slug));
                }
            }
        }
        i += 1;
    }
}

/// HTML for a preview embed: remote images pass through; local images become
/// `<img data-embed>` for the consumer to resolve; anything else becomes an
/// in-app link carrying the raw target in `data-path`.
fn preview_embed_html(dest: &str, alt: &str, wiki: bool) -> String {
    // wikilink embeds carry a |modifier: a number is a width, otherwise alt
    let (target, width) = if wiki {
        let w = alt.trim();
        let width = if !w.is_empty() && w.chars().all(|c| c.is_ascii_digit()) {
            Some(w.to_string())
        } else {
            None
        };
        (dest.trim(), width)
    } else {
        (dest.trim(), None)
    };
    if target.starts_with("http:") || target.starts_with("https:") || target.starts_with("data:") {
        return format!(
            "<img src=\"{}\" alt=\"{}\" loading=\"lazy\">",
            html_escape(target),
            html_escape(alt)
        );
    }
    let image =
        is_image_file(Path::new(target)) || target.to_ascii_lowercase().ends_with(".svg");
    if image {
        let style = width
            .map(|w| format!(" style=\"max-width:{w}px\""))
            .unwrap_or_default();
        return format!(
            "<img data-embed=\"{}\" alt=\"{}\"{}>",
            html_escape(target),
            html_escape(alt),
            style
        );
    }
    let label = if alt.is_empty() || alt.chars().all(|c| c.is_ascii_digit()) {
        target.rsplit('/').next().unwrap_or(target)
    } else {
        alt
    };
    format!(
        "<a class=\"wikilink attachment\" href=\"#\" data-path=\"{}\">{}</a>",
        html_escape(target),
        html_escape(label)
    )
}

/// Render markdown for the in-app preview pane. Wikilinks become
/// `<a data-wikilink>` (the full `target#anchor` is preserved) and local link
/// targets `<a data-path>`; embeds become `<img data-embed>` or `data-path`
/// attachment links. The consumer resolves these against the open folder.
pub fn render_preview_html(text: &str) -> String {
    let mut events: Vec<Event> = Parser::new_ext(text, MD_OPTIONS).collect();
    add_heading_ids(&mut events);

    let mut out: Vec<Event> = Vec::with_capacity(events.len());
    let mut raw_link = false; // an open <a> we emitted as raw HTML
    let mut iter = events.into_iter().peekable();
    while let Some(ev) = iter.next() {
        match ev {
            Event::Start(Tag::Image { link_type, dest_url, .. }) => {
                let mut inner: Vec<Event> = vec![];
                for e in iter.by_ref() {
                    if matches!(e, Event::End(TagEnd::Image)) {
                        break;
                    }
                    inner.push(e);
                }
                let alt = plain_text(&inner);
                let wiki = matches!(link_type, LinkType::WikiLink { .. });
                out.push(Event::Html(preview_embed_html(&dest_url, &alt, wiki).into()));
            }
            Event::Start(Tag::Link { link_type: LinkType::WikiLink { .. }, dest_url, .. }) => {
                // keep the whole `target#anchor` so consumers can deep-link
                let target = dest_url.trim();
                raw_link = true;
                out.push(Event::Html(
                    format!(
                        "<a class=\"wikilink\" href=\"#\" data-wikilink=\"{}\">",
                        html_escape(target)
                    )
                    .into(),
                ));
            }
            Event::End(TagEnd::Link) if raw_link => {
                raw_link = false;
                out.push(Event::Html("</a>".into()));
            }
            Event::Start(Tag::Link { link_type, dest_url, title, id }) => {
                let dest = dest_url.to_string();
                let external =
                    dest.starts_with('#') || dest.contains(':') || dest.starts_with("//");
                if external {
                    out.push(Event::Start(Tag::Link { link_type, dest_url, title, id }));
                } else {
                    raw_link = true;
                    out.push(Event::Html(
                        format!(
                            "<a class=\"wikilink\" href=\"#\" data-path=\"{}\">",
                            html_escape(&dest)
                        )
                        .into(),
                    ));
                }
            }
            other => out.push(other),
        }
    }

    let mut body = String::new();
    html::push_html(&mut body, out.into_iter());
    body
}

#[tauri::command]
pub fn render_preview(text: String) -> String {
    render_preview_html(&text)
}

// ---------------------------------------------------------------- tests

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preview_marks_local_targets() {
        let html = render_preview_html(
            "see [[note]] and [b](dir/b.md)\n\n![[pic.png|200]]\n\n![](https://x/y.png)",
        );
        assert!(html.contains("data-wikilink=\"note\""), "{html}");
        assert!(html.contains("data-path=\"dir/b.md\""), "{html}");
        assert!(
            html.contains("data-embed=\"pic.png\"") && html.contains("max-width:200px"),
            "{html}"
        );
        assert!(html.contains("src=\"https://x/y.png\""), "{html}");
    }

    #[test]
    fn wikilink_anchor_is_preserved() {
        let html = render_preview_html("[[note#My Section|alias]]");
        // the consumer needs the anchor to resolve deep links in a static site
        assert!(html.contains("data-wikilink=\"note#My Section\""), "{html}");
        assert!(html.contains(">alias<"), "{html}");
    }

    #[test]
    fn heading_ids_are_added() {
        let html = render_preview_html("# Hello World");
        assert!(html.contains("id=\"hello-world\""), "{html}");
    }
}
