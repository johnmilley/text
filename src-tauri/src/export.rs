//! Static-site export for shared folders: markdown → HTML with resolved
//! wikilinks/embeds, code pages for text files, verbatim copies of
//! attachments, generated folder listings, and a sidebar nav on every page.
//! Pure filesystem work — git/network plumbing lives in share.rs.

use crate::files::{is_image_file, is_text_file};
use percent_encoding::{utf8_percent_encode, AsciiSet, CONTROLS};
use pulldown_cmark::{html, CowStr, Event, LinkType, Options, Parser, Tag, TagEnd};
use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::fs;
use std::path::Path;

const PAGE_TEMPLATE: &str = include_str!("../templates/share/page.html");
const SITE_CSS: &str = include_str!("../templates/share/style.css");
const HLJS_JS: &str = include_str!("../templates/share/highlight.min.js");
const HLJS_CSS: &str = include_str!("../templates/share/highlight.css");

/// GitHub rejects blobs over 100 MB; stay under with margin.
const MAX_FILE_BYTES: u64 = 95 * 1024 * 1024;
/// Text files up to this size get a rendered code page.
const MAX_CODE_PAGE_BYTES: u64 = 512 * 1024;

const HREF_SET: &AsciiSet = &CONTROLS.add(b' ').add(b'"').add(b'<').add(b'>').add(b'`')
    .add(b'#').add(b'?').add(b'{').add(b'}').add(b'%').add(b'\\').add(b'^').add(b'|');

#[derive(serde::Serialize)]
pub struct ExportStats {
    pub pages: usize,
    pub skipped: Vec<String>,
}

#[derive(Clone, Copy, PartialEq)]
enum Kind {
    Note,     // markdown → rendered page
    TextFile, // code page + raw copy
    Binary,   // verbatim copy
}

struct SrcFile {
    rel: String, // source path relative to the shared folder, '/'-separated
    kind: Kind,
}

struct Site {
    /// source rel → output rel of the *viewable* artifact (page for
    /// notes/text files, the file itself for binaries)
    out_of: HashMap<String, String>,
    /// source rel → output rel of the raw copy (text files keep one next to
    /// their code page; for binaries this equals `out_of`)
    raw_of: HashMap<String, String>,
    /// lowercase note stem → source rel (first wins, like the app)
    note_by_stem: HashMap<String, String>,
    /// lowercase basename → source rel (first wins)
    by_basename: HashMap<String, String>,
    files: Vec<SrcFile>,
}

/// Directory part of a '/'-separated rel path; "" for top-level entries.
fn dir_of(rel: &str) -> &str {
    match rel.rfind('/') {
        Some(i) => &rel[..i],
        None => "",
    }
}

fn base_of(rel: &str) -> &str {
    rel.rsplit('/').next().unwrap_or(rel)
}

fn stem_of(name: &str) -> &str {
    match name.rfind('.') {
        Some(i) if i > 0 => &name[..i],
        _ => name,
    }
}

fn is_md(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    lower.ends_with(".md") || lower.ends_with(".markdown") || lower.ends_with(".mdown")
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;")
}

fn encode_href(path: &str) -> String {
    path.split('/')
        .map(|seg| utf8_percent_encode(seg, HREF_SET).to_string())
        .collect::<Vec<_>>()
        .join("/")
}

/// `../` prefix that gets from `from`'s directory back to the site root.
fn root_prefix(from: &str) -> String {
    "../".repeat(from.matches('/').count())
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

/// Collapse `.` / `..` segments (mirrors normalizePath in main.ts).
fn normalize(p: &str) -> String {
    let mut parts: Vec<&str> = vec![];
    for part in p.split('/') {
        match part {
            "" | "." => {}
            ".." => {
                parts.pop();
            }
            _ => parts.push(part),
        }
    }
    parts.join("/")
}

// ---------------------------------------------------------------- walk

fn walk(folder: &Path, dir: &Path, depth: usize, files: &mut Vec<SrcFile>, skipped: &mut Vec<String>) -> Result<(), String> {
    if depth > 32 {
        return Ok(());
    }
    let read = fs::read_dir(dir).map_err(|e| format!("{}: {e}", dir.display()))?;
    for item in read.flatten() {
        let name = item.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue;
        }
        let path = item.path();
        let Ok(ft) = item.file_type() else { continue };
        if ft.is_dir() {
            walk(folder, &path, depth + 1, files, skipped)?;
        } else if ft.is_file() {
            let rel = path
                .strip_prefix(folder)
                .map_err(|e| e.to_string())?
                .to_string_lossy()
                .replace('\\', "/");
            let size = item.metadata().map(|m| m.len()).unwrap_or(0);
            if size > MAX_FILE_BYTES {
                skipped.push(format!("{rel} (over 95 MB)"));
                continue;
            }
            let kind = if is_md(&name) {
                Kind::Note
            } else if is_text_file(&path) && size <= MAX_CODE_PAGE_BYTES {
                Kind::TextFile
            } else {
                Kind::Binary
            };
            files.push(SrcFile { rel, kind });
        }
    }
    Ok(())
}

// ---------------------------------------------------------------- site index

fn sanitize_component(c: &str) -> String {
    let cleaned: String = c
        .chars()
        .map(|ch| match ch {
            '#' | '?' | '%' | '"' | '<' | '>' | '\\' | '|' => '-',
            ch if (ch as u32) < 0x20 => '-',
            ch => ch,
        })
        .collect();
    if cleaned.is_empty() { "-".into() } else { cleaned }
}

fn build_site(mut files: Vec<SrcFile>) -> Site {
    // stable order: makes name dedup and first-wins indexes deterministic
    files.sort_by(|a, b| a.rel.cmp(&b.rel));

    let mut used: BTreeSet<String> = BTreeSet::new();
    let mut dedup = |candidate: String| -> String {
        if used.insert(candidate.clone()) {
            return candidate;
        }
        let (stem, ext) = match candidate.rfind('.') {
            Some(i) if i > candidate.rfind('/').map_or(0, |s| s + 1) => {
                (candidate[..i].to_string(), candidate[i..].to_string())
            }
            _ => (candidate.clone(), String::new()),
        };
        (1..)
            .map(|n| format!("{stem}-{n}{ext}"))
            .find(|p| used.insert(p.clone()))
            .unwrap()
    };

    let mut site = Site {
        out_of: HashMap::new(),
        raw_of: HashMap::new(),
        note_by_stem: HashMap::new(),
        by_basename: HashMap::new(),
        files: vec![],
    };

    for f in &files {
        let name = base_of(&f.rel);
        let dir: String = f
            .rel
            .split('/')
            .rev()
            .skip(1)
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .map(sanitize_component)
            .collect::<Vec<_>>()
            .join("/");
        let join = |n: String| if dir.is_empty() { n } else { format!("{dir}/{n}") };
        let clean = sanitize_component(name);
        match f.kind {
            Kind::Note => {
                // README.md doubles as the folder index when no index.md exists
                let has_index = files.iter().any(|o| {
                    o.kind == Kind::Note
                        && dir_of(&o.rel) == dir_of(&f.rel)
                        && stem_of(base_of(&o.rel)).eq_ignore_ascii_case("index")
                });
                let stem = stem_of(&clean);
                let out_name = if stem.eq_ignore_ascii_case("readme") && !has_index {
                    "index.html".to_string()
                } else {
                    format!("{stem}.html")
                };
                let out = dedup(join(out_name));
                site.out_of.insert(f.rel.clone(), out);
                site.note_by_stem
                    .entry(stem_of(name).to_lowercase())
                    .or_insert_with(|| f.rel.clone());
            }
            Kind::TextFile => {
                let raw = dedup(join(clean.clone()));
                let page = dedup(join(format!("{clean}.html")));
                site.raw_of.insert(f.rel.clone(), raw);
                site.out_of.insert(f.rel.clone(), page);
            }
            Kind::Binary => {
                let out = dedup(join(clean));
                site.raw_of.insert(f.rel.clone(), out.clone());
                site.out_of.insert(f.rel.clone(), out);
            }
        }
        site.by_basename
            .entry(name.to_lowercase())
            .or_insert_with(|| f.rel.clone());
    }
    site.files = files;
    site
}

impl Site {
    /// Resolve a link target the way the app does: relative to the note's
    /// dir, then the share root, then by bare basename (case-insensitive).
    fn resolve(&self, target: &str, cur_dir: &str) -> Option<&String> {
        let t = percent_encoding::percent_decode_str(target)
            .decode_utf8()
            .map(|c| c.into_owned())
            .unwrap_or_else(|_| target.to_string());
        let t = t.trim().trim_start_matches('/');
        let candidates = if cur_dir.is_empty() {
            vec![t.to_string()]
        } else {
            vec![format!("{cur_dir}/{t}"), t.to_string()]
        };
        for c in &candidates {
            let norm = normalize(c);
            if self.out_of.contains_key(&norm) {
                return self.out_of.get(&norm);
            }
        }
        let base = t.rsplit('/').next().unwrap_or(t).to_lowercase();
        self.by_basename.get(&base).and_then(|rel| self.out_of.get(rel))
    }

    /// Like `resolve`, but for wikilink note targets: stem match first.
    fn resolve_note(&self, target: &str) -> Option<&String> {
        self.note_by_stem
            .get(&target.trim().to_lowercase())
            .and_then(|rel| self.out_of.get(rel))
            .or_else(|| {
                let base = target.trim().to_lowercase();
                self.by_basename.get(&base).and_then(|rel| self.out_of.get(rel))
            })
    }

    fn raw_for(&self, source_rel: &str) -> Option<&String> {
        self.raw_of.get(source_rel).or_else(|| self.out_of.get(source_rel))
    }
}

/// Relative href from the page at `from` (output rel) to output rel `to`.
fn rel_href(from: &str, to: &str) -> String {
    encode_href(&format!("{}{}", root_prefix(from), to))
}

// ---------------------------------------------------------------- markdown

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

/// Render one note to body HTML, resolving wikilinks/embeds against the site.
fn render_markdown(text: &str, page_out: &str, src_dir: &str, site: &Site) -> String {
    let mut events: Vec<Event> = Parser::new_ext(text, MD_OPTIONS).collect();

    // heading ids, so [[note#section]] anchors land
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

    let mut out: Vec<Event> = Vec::with_capacity(events.len());
    let mut broken_link = false;
    let mut iter = events.into_iter().peekable();
    while let Some(ev) = iter.next() {
        match ev {
            // ![[embed]] and ![alt](path) — swallow the group, emit raw HTML
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
                out.push(Event::Html(
                    embed_html(&dest_url, &alt, wiki, page_out, src_dir, site).into(),
                ));
            }
            // [[wikilink]] — resolve to a page, or degrade to a plain span
            Event::Start(Tag::Link { link_type: LinkType::WikiLink { .. }, dest_url, .. }) => {
                let (target, anchor) = match dest_url.split_once('#') {
                    Some((t, a)) => (t, Some(a)),
                    None => (dest_url.as_ref(), None),
                };
                // [[#section]] links within the same note
                let resolved: Option<String> = if target.trim().is_empty() {
                    Some(page_out.to_string())
                } else {
                    site.resolve_note(target).cloned()
                };
                match resolved {
                    Some(to) => {
                        let mut href = rel_href(page_out, &to);
                        if let Some(a) = anchor {
                            href.push('#');
                            href.push_str(&slugify(a));
                        }
                        out.push(Event::Start(Tag::Link {
                            link_type: LinkType::Inline,
                            dest_url: href.into(),
                            title: "".into(),
                            id: "".into(),
                        }));
                    }
                    None => {
                        broken_link = true;
                        out.push(Event::Html("<span class=\"broken-link\">".into()));
                    }
                }
            }
            Event::End(TagEnd::Link) if broken_link => {
                broken_link = false;
                out.push(Event::Html("</span>".into()));
            }
            // ordinary links: rewrite local relative targets to output pages
            Event::Start(Tag::Link { link_type, dest_url, title, id }) => {
                let dest = dest_url.to_string();
                let external = dest.starts_with('#')
                    || dest.contains(':') // http:, https:, mailto:, data:…
                    || dest.starts_with("//");
                let new_dest = if external {
                    dest
                } else {
                    match site.resolve(&dest, src_dir) {
                        Some(to) => rel_href(page_out, to),
                        None => dest,
                    }
                };
                out.push(Event::Start(Tag::Link {
                    link_type,
                    dest_url: new_dest.into(),
                    title,
                    id,
                }));
            }
            other => out.push(other),
        }
    }

    let mut body = String::new();
    html::push_html(&mut body, out.into_iter());
    body
}

/// HTML for an embed: an <img> when the target is an image, a download link
/// for other attachments, a muted span when nothing resolves.
fn embed_html(dest: &str, alt: &str, wiki: bool, page_out: &str, src_dir: &str, site: &Site) -> String {
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

    let image = is_image_file(Path::new(target))
        || target.to_ascii_lowercase().ends_with(".svg");
    if image {
        if let Some(to) = site.resolve(target, src_dir) {
            let style = width
                .map(|w| format!(" style=\"max-width:{w}px\""))
                .unwrap_or_default();
            return format!(
                "<img src=\"{}\" alt=\"{}\" loading=\"lazy\"{}>",
                rel_href(page_out, to),
                html_escape(alt),
                style
            );
        }
    } else {
        // ![[lecture.pdf]] / ![[notes.zip]] — attachment link
        let source = site
            .resolve(target, src_dir)
            .cloned()
            .or_else(|| {
                let base = target.rsplit('/').next().unwrap_or(target).to_lowercase();
                site.by_basename
                    .get(&base)
                    .and_then(|rel| site.raw_for(rel))
                    .cloned()
            });
        if let Some(to) = source {
            let label = if alt.is_empty() || alt.chars().all(|c| c.is_ascii_digit()) {
                target.rsplit('/').next().unwrap_or(target)
            } else {
                alt
            };
            return format!(
                "<a class=\"attachment\" href=\"{}\">{}</a>",
                rel_href(page_out, &to),
                html_escape(label)
            );
        }
    }
    format!("<span class=\"broken-link\">missing: {}</span>", html_escape(target))
}

// ---------------------------------------------------------------- nav + listings

#[derive(Default)]
struct NavDir {
    dirs: BTreeMap<String, NavDir>,
    /// display name → output rel of the viewable artifact
    files: Vec<(String, String)>,
}

fn nav_tree(site: &Site) -> NavDir {
    let mut root = NavDir::default();
    for f in &site.files {
        let out = site.out_of[&f.rel].clone();
        let mut node = &mut root;
        let parts: Vec<&str> = f.rel.split('/').collect();
        for part in &parts[..parts.len() - 1] {
            node = node.dirs.entry((*part).to_string()).or_default();
        }
        let name = parts.last().unwrap();
        let display = if f.kind == Kind::Note {
            stem_of(name).to_string()
        } else {
            (*name).to_string()
        };
        node.files.push((display, out));
    }
    root
}

fn datish(name: &str) -> bool {
    let s = stem_of(name);
    !s.is_empty() && s.starts_with(|c: char| c.is_ascii_digit())
        && s.chars().all(|c| c.is_ascii_digit() || c == '-')
}

/// Order names like the app tree: alphabetical, but date-shaped names
/// (daily notes: YYYY / MM / YYYY-MM-DD) newest first.
fn ordered<'a, T>(items: impl Iterator<Item = (&'a String, T)>) -> Vec<(&'a String, T)> {
    let mut v: Vec<(&String, T)> = items.collect();
    v.sort_by(|a, b| {
        if datish(a.0) && datish(b.0) {
            b.0.cmp(a.0)
        } else {
            a.0.to_lowercase().cmp(&b.0.to_lowercase())
        }
    });
    v
}

fn nav_html(node: &NavDir, current: &str, prefix: &str, out: &mut String) {
    out.push_str("<ul>");
    for (name, child) in ordered(node.dirs.iter()) {
        out.push_str("<li><details open><summary>");
        out.push_str(&html_escape(name));
        out.push_str("</summary>");
        nav_html(child, current, prefix, out);
        out.push_str("</details></li>");
    }
    let mut files: Vec<&(String, String)> = node.files.iter().collect();
    files.sort_by(|a, b| {
        if datish(&a.0) && datish(&b.0) {
            b.0.cmp(&a.0)
        } else {
            a.0.to_lowercase().cmp(&b.0.to_lowercase())
        }
    });
    for (display, out_rel) in files {
        let class = if out_rel == current { " class=\"current\"" } else { "" };
        out.push_str(&format!(
            "<li><a{} href=\"{}{}\">{}</a></li>",
            class,
            prefix,
            encode_href(out_rel),
            html_escape(display)
        ));
    }
    out.push_str("</ul>");
}

/// Generated listing body for a folder without its own index note.
fn listing_html(dir_out: &str, node: &NavDir, title: &str) -> String {
    let mut body = format!("<h1>{}</h1><ul class=\"listing\">", html_escape(title));
    for (name, _) in ordered(node.dirs.iter()) {
        let href = encode_href(&format!("{name}/index.html"));
        body.push_str(&format!(
            "<li class=\"dir\"><a href=\"{}\">{}</a></li>",
            href,
            html_escape(name)
        ));
    }
    let mut files: Vec<&(String, String)> = node.files.iter().collect();
    files.sort_by(|a, b| {
        if datish(&a.0) && datish(&b.0) {
            b.0.cmp(&a.0)
        } else {
            a.0.to_lowercase().cmp(&b.0.to_lowercase())
        }
    });
    let dir_prefix = if dir_out.is_empty() { String::new() } else { format!("{dir_out}/") };
    for (display, out_rel) in files {
        // listing links are relative to the listing's own directory
        let href = out_rel.strip_prefix(&dir_prefix).unwrap_or(out_rel);
        body.push_str(&format!(
            "<li><a href=\"{}\">{}</a></li>",
            encode_href(href),
            html_escape(display)
        ));
    }
    body.push_str("</ul>");
    body
}

// ---------------------------------------------------------------- assembly

fn assemble(title: &str, share_title: &str, nav: &str, content: &str, page_out: &str) -> String {
    PAGE_TEMPLATE
        .replace("{{root}}", &root_prefix(page_out))
        .replace("{{title}}", &html_escape(title))
        .replace("{{share_title}}", &html_escape(share_title))
        .replace("{{nav}}", nav)
        .replace("{{content}}", content) // last: user text may contain tokens
}

fn write_out(out_root: &Path, rel: &str, content: &str) -> Result<(), String> {
    let path = out_root.join(rel);
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| format!("{}: {e}", path.display()))
}

pub fn export_site(folder: &Path, out_root: &Path) -> Result<ExportStats, String> {
    let share_title = folder
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| "shared notes".into());

    let mut files = vec![];
    let mut skipped = vec![];
    walk(folder, folder, 0, &mut files, &mut skipped)?;
    if files.is_empty() {
        return Err("this folder has no files to share".into());
    }
    let site = build_site(files);
    let tree = nav_tree(&site);
    fs::create_dir_all(out_root).map_err(|e| e.to_string())?;

    // assets
    write_out(out_root, "_assets/style.css", SITE_CSS)?;
    write_out(out_root, "_assets/highlight.css", HLJS_CSS)?;
    write_out(out_root, "_assets/highlight.min.js", HLJS_JS)?;

    let nav_for = |page_out: &str| {
        let mut nav = String::new();
        nav_html(&tree, page_out, &root_prefix(page_out), &mut nav);
        nav
    };

    let mut pages = 0;

    for f in &site.files {
        let src_path = folder.join(&f.rel);
        let out_rel = site.out_of[&f.rel].clone();
        let src_dir = dir_of(&f.rel).to_string();
        match f.kind {
            Kind::Note => {
                let text = fs::read_to_string(&src_path)
                    .map_err(|e| format!("{}: {e}", src_path.display()))?;
                let body = render_markdown(&text, &out_rel, &src_dir, &site);
                let title = stem_of(base_of(&f.rel));
                write_out(
                    out_root,
                    &out_rel,
                    &assemble(title, &share_title, &nav_for(&out_rel), &body, &out_rel),
                )?;
                pages += 1;
            }
            Kind::TextFile => {
                let raw_rel = site.raw_of[&f.rel].clone();
                let dest = out_root.join(&raw_rel);
                if let Some(dir) = dest.parent() {
                    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
                }
                fs::copy(&src_path, &dest).map_err(|e| format!("{}: {e}", src_path.display()))?;
                let text = fs::read_to_string(&src_path).unwrap_or_default();
                let name = base_of(&f.rel);
                let ext = name.rsplit('.').next().unwrap_or("").to_lowercase();
                let lang = if ext == name.to_lowercase() { String::new() } else { ext };
                let raw_href = encode_href(base_of(&raw_rel));
                let body = format!(
                    "<h1>{}</h1><p class=\"raw-link\"><a href=\"{}\" download>download raw file</a></p><pre><code class=\"language-{}\">{}</code></pre>",
                    html_escape(name),
                    raw_href,
                    html_escape(&lang),
                    html_escape(&text)
                );
                write_out(
                    out_root,
                    &out_rel,
                    &assemble(name, &share_title, &nav_for(&out_rel), &body, &out_rel),
                )?;
                pages += 1;
            }
            Kind::Binary => {
                let dest = out_root.join(&out_rel);
                if let Some(dir) = dest.parent() {
                    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
                }
                fs::copy(&src_path, &dest).map_err(|e| format!("{}: {e}", src_path.display()))?;
            }
        }
    }

    // folder listings for every directory that didn't produce an index.html
    let mut dirs: Vec<(String, &NavDir)> = vec![(String::new(), &tree)];
    let mut stack: Vec<(String, &NavDir)> = vec![(String::new(), &tree)];
    while let Some((dir_out, node)) = stack.pop() {
        for (name, child) in &node.dirs {
            let clean = sanitize_component(name);
            let child_out = if dir_out.is_empty() { clean } else { format!("{dir_out}/{clean}") };
            dirs.push((child_out.clone(), child));
            stack.push((child_out, child));
        }
    }
    for (dir_out, node) in dirs {
        let index_rel = if dir_out.is_empty() {
            "index.html".to_string()
        } else {
            format!("{dir_out}/index.html")
        };
        if site.out_of.values().any(|v| v == &index_rel) {
            continue; // an index.md / README.md note already owns this slot
        }
        let title = if dir_out.is_empty() {
            share_title.clone()
        } else {
            dir_out.rsplit('/').next().unwrap_or(&dir_out).to_string()
        };
        let body = listing_html(&dir_out, node, &title);
        write_out(
            out_root,
            &index_rel,
            &assemble(&title, &share_title, &nav_for(&index_rel), &body, &index_rel),
        )?;
        pages += 1;
    }

    Ok(ExportStats { pages, skipped })
}

// ---------------------------------------------------------------- tests

#[cfg(test)]
mod tests {
    use super::*;

    fn site_with(rels: &[(&str, Kind)]) -> Site {
        build_site(
            rels.iter()
                .map(|(r, k)| SrcFile { rel: (*r).to_string(), kind: *k })
                .collect(),
        )
    }

    #[test]
    fn image_wikilink_parses_as_image() {
        // sanity-check that pulldown treats ![[x]] as an image wikilink
        let events: Vec<Event> =
            Parser::new_ext("![[photo.png|300]]", MD_OPTIONS).collect();
        assert!(events.iter().any(|e| matches!(
            e,
            Event::Start(Tag::Image { link_type: LinkType::WikiLink { .. }, .. })
        )));
    }

    #[test]
    fn renders_wikilinks_and_embeds() {
        let site = site_with(&[
            ("a.md", Kind::Note),
            ("sub/b.md", Kind::Note),
            ("img/photo.png", Kind::Binary),
            ("docs/syllabus.pdf", Kind::Binary),
        ]);
        let html = render_markdown(
            "see [[b]] and [[B#My Section|alias]] and [[missing note]]\n\n![[photo.png|300]]\n\n![[syllabus.pdf]]",
            "a.html",
            "",
            &site,
        );
        assert!(html.contains("href=\"sub/b.html\""), "{html}");
        assert!(html.contains("sub/b.html#my-section"), "{html}");
        assert!(html.contains(">alias<"), "{html}");
        assert!(html.contains("broken-link"), "{html}");
        assert!(html.contains("img/photo.png") && html.contains("max-width:300px"), "{html}");
        assert!(html.contains("docs/syllabus.pdf"), "{html}");
    }

    #[test]
    fn heading_ids_and_relative_links() {
        let site = site_with(&[("notes/deep.md", Kind::Note), ("a.md", Kind::Note)]);
        let html = render_markdown("# Hello World\n\n[[a]]", "notes/deep.html", "notes", &site);
        assert!(html.contains("id=\"hello-world\""), "{html}");
        assert!(html.contains("href=\"../a.html\""), "{html}");
    }

    #[test]
    fn readme_becomes_index() {
        let site = site_with(&[("README.md", Kind::Note), ("course/README.md", Kind::Note)]);
        assert_eq!(site.out_of["README.md"], "index.html");
        assert_eq!(site.out_of["course/README.md"], "course/index.html");
    }

    #[test]
    fn exports_a_full_site() {
        let src = std::env::temp_dir().join("text-export-test-src");
        let out = std::env::temp_dir().join("text-export-test-out");
        for d in [&src, &out] {
            let _ = fs::remove_dir_all(d);
        }
        fs::create_dir_all(src.join("sub")).unwrap();
        fs::write(src.join("README.md"), "# Hi\n\nsee [[note]] and `code`\n").unwrap();
        fs::write(src.join("sub/note.md"), "## Section\n\n- [ ] task\n\n![[pic.png]]\n").unwrap();
        fs::write(src.join("sub/pic.png"), b"\x89PNG fake").unwrap();
        fs::write(src.join("script.py"), "print('hello')\n").unwrap();
        fs::write(src.join("weird #name.md"), "odd\n").unwrap();

        let stats = export_site(&src, &out).unwrap();
        assert!(stats.pages >= 4, "pages = {}", stats.pages);
        assert!(stats.skipped.is_empty());
        // README became the root index; assets and pages landed
        assert!(out.join("index.html").exists());
        assert!(out.join("sub/note.html").exists());
        assert!(out.join("sub/pic.png").exists());
        assert!(out.join("script.py.html").exists());
        assert!(out.join("script.py").exists());
        assert!(out.join("_assets/style.css").exists());
        assert!(out.join("_assets/highlight.min.js").exists());
        let index = fs::read_to_string(out.join("index.html")).unwrap();
        assert!(index.contains("href=\"sub/note.html\""), "{index}");
        let note = fs::read_to_string(out.join("sub/note.html")).unwrap();
        // hrefs route via the site root: ../sub/pic.png from sub/note.html
    assert!(note.contains("<img src=\"../sub/pic.png\""), "{note}");
        assert!(note.contains("type=\"checkbox\""), "{note}");
        // sanitized page name, no '#'
        assert!(out.join("weird -name.html").exists());
        for d in [&src, &out] {
            let _ = fs::remove_dir_all(d);
        }
    }

    #[test]
    fn sanitizes_and_dedupes_output_names() {
        let site = site_with(&[("what?.md", Kind::Note), ("what-.md", Kind::Note)]);
        let outs: Vec<&String> = site.out_of.values().collect();
        assert!(outs.iter().all(|o| !o.contains('?')));
        assert_eq!(outs.len(), 2);
        assert_ne!(site.out_of["what?.md"], site.out_of["what-.md"]);
    }
}
