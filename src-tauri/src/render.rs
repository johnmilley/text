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

/// Obsidian-style ==highlight== → <mark>. pulldown-cmark has no highlight
/// extension, so this pass rewrites Text events. A pairing pass first matches
/// openers/closers (an opener needs a non-space after, a closer a non-space
/// before — so `a == b` stays literal), allowing a highlight to span other
/// inline events (`==bold **words**==`) but never a block boundary.
fn add_highlights(events: Vec<Event>) -> Vec<Event> {
    // `==` token positions: (event index, byte offset)
    let mut tokens: Vec<(usize, usize)> = vec![];
    let mut in_code = false;
    let block_edge = |ev: &Event| {
        matches!(
            ev,
            Event::Start(_) | Event::End(_) | Event::Rule | Event::HardBreak
        ) && !matches!(
            ev,
            Event::Start(Tag::Emphasis | Tag::Strong | Tag::Strikethrough | Tag::Link { .. })
                | Event::End(TagEnd::Emphasis | TagEnd::Strong | TagEnd::Strikethrough | TagEnd::Link)
        )
    };
    for (i, ev) in events.iter().enumerate() {
        match ev {
            Event::Start(Tag::CodeBlock(_)) => in_code = true,
            Event::End(TagEnd::CodeBlock) => in_code = false,
            Event::Text(t) if !in_code => {
                let b = t.as_bytes();
                let mut j = 0;
                while j + 1 < b.len() {
                    if b[j] == b'=' && b[j + 1] == b'=' {
                        tokens.push((i, j));
                        j += 2;
                    } else {
                        j += 1;
                    }
                }
            }
            _ => {}
        }
    }

    // pair them up: matched (event, offset) positions for <mark> / </mark>
    let mut opens: Vec<(usize, usize)> = vec![];
    let mut closes: Vec<(usize, usize)> = vec![];
    let mut open: Option<(usize, usize)> = None;
    for &(i, j) in &tokens {
        // a block boundary between the candidate opener and this token voids it
        if let Some((oi, _)) = open {
            if events[oi + 1..=i].iter().any(block_edge) {
                open = None;
            }
        }
        let text = match &events[i] {
            Event::Text(t) => t.as_ref(),
            _ => unreachable!(),
        };
        if let Some((oi, oj)) = open {
            // closer: needs a non-space before (same event, or an earlier one)
            let valid = if j > 0 {
                !text[..j].ends_with([' ', '\t']) && !(oi == i && oj + 2 == j)
            } else {
                oi != i
            };
            if valid {
                opens.push((oi, oj));
                closes.push((i, j));
                open = None;
                continue;
            }
        }
        // opener: needs a non-space, non-'=' after (or the event ends here and
        // an inline span follows, e.g. `==**bold**==`)
        let after = text[j + 2..].chars().next();
        let ok = match after {
            Some(c) => !c.is_whitespace() && c != '=',
            None => events.get(i + 1).is_some_and(|e| !block_edge(e)),
        };
        if ok {
            open = Some((i, j));
        }
    }

    if opens.is_empty() {
        return events;
    }
    let mut out: Vec<Event> = Vec::with_capacity(events.len() + opens.len() * 2);
    for (i, ev) in events.into_iter().enumerate() {
        let mut cuts: Vec<(usize, bool)> = opens
            .iter()
            .filter(|&&(oi, _)| oi == i)
            .map(|&(_, j)| (j, true))
            .chain(closes.iter().filter(|&&(ci, _)| ci == i).map(|&(_, j)| (j, false)))
            .collect();
        if cuts.is_empty() {
            out.push(ev);
            continue;
        }
        cuts.sort_by_key(|&(j, _)| j);
        let text = match &ev {
            Event::Text(t) => t.to_string(),
            _ => unreachable!(),
        };
        let mut pos = 0;
        for (j, is_open) in cuts {
            if j > pos {
                out.push(Event::Text(text[pos..j].to_string().into()));
            }
            out.push(Event::Html(if is_open { "<mark>" } else { "</mark>" }.into()));
            pos = j + 2;
        }
        if pos < text.len() {
            out.push(Event::Text(text[pos..].to_string().into()));
        }
    }
    out
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
pub fn render_preview_html(text: &str, single_line_breaks: bool) -> String {
    let mut events: Vec<Event> = Parser::new_ext(text, MD_OPTIONS).collect();
    add_heading_ids(&mut events);
    let mut events = add_highlights(events);
    // WYSIWYG line breaks: a single newline in the source is a CommonMark soft
    // break (renders as a space, joining lines into one paragraph). When the
    // user opts in, promote every soft break to a hard <br> so the rendered
    // output matches the editor line-for-line.
    if single_line_breaks {
        for ev in &mut events {
            if matches!(ev, Event::SoftBreak) {
                *ev = Event::HardBreak;
            }
        }
    }

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
pub fn render_preview(text: String, single_line_breaks: bool) -> String {
    render_preview_html(&text, single_line_breaks)
}

// ---------------------------------------------------------------- tests

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preview_marks_local_targets() {
        let html = render_preview_html(
            "see [[note]] and [b](dir/b.md)\n\n![[pic.png|200]]\n\n![](https://x/y.png)",
            false,
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
        let html = render_preview_html("[[note#My Section|alias]]", false);
        // the consumer needs the anchor to resolve deep links in a static site
        assert!(html.contains("data-wikilink=\"note#My Section\""), "{html}");
        assert!(html.contains(">alias<"), "{html}");
    }

    #[test]
    fn heading_ids_are_added() {
        let html = render_preview_html("# Hello World", false);
        assert!(html.contains("id=\"hello-world\""), "{html}");
    }

    #[test]
    fn highlights_render_as_mark() {
        let html = render_preview_html("this ==is marked== text", false);
        assert!(html.contains("this <mark>is marked</mark> text"), "{html}");
    }

    #[test]
    fn highlight_spans_inline_formatting() {
        let html = render_preview_html("==**words** and more==", false);
        assert!(html.contains("<mark><strong>words</strong> and more</mark>"), "{html}");
    }

    #[test]
    fn loose_equals_stay_literal() {
        let html = render_preview_html("a == b and x ==unclosed", false);
        assert!(!html.contains("<mark>"), "{html}");
        // and never inside code
        let code = render_preview_html("`==not this==`\n\n```\n==nor this==\n```", false);
        assert!(!code.contains("<mark>"), "{code}");
    }

    #[test]
    fn highlight_never_crosses_a_block() {
        let html = render_preview_html("start ==here\n\nnot closed== end", false);
        assert!(!html.contains("<mark>"), "{html}");
    }

    #[test]
    fn single_line_breaks_promote_soft_breaks() {
        // off: a single newline joins the two lines into one paragraph
        let joined = render_preview_html("line one\nline two", false);
        assert!(!joined.contains("<br"), "{joined}");
        // on: the same newline becomes a hard <br>
        let broken = render_preview_html("line one\nline two", true);
        assert!(broken.contains("<br"), "{broken}");
    }
}
