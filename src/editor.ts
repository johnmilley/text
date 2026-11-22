import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { Compartment, EditorSelection, EditorState, type Extension } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import {
  LanguageDescription,
  codeFolding,
  foldGutter,
  foldKeymap,
  foldNodeProp,
} from "@codemirror/language";
import type { MarkdownConfig } from "@lezer/markdown";
import { vim } from "@replit/codemirror-vim";
import { baseHighlighting, markdownStyling, toggleCheckboxAt, urlAt, wikilinkAt } from "./mdstyle";
import { imageEmbeds, type ImageResolver } from "./images";
import { tableNextCell, tableNextRow, tablePrevCell } from "./tables";
import { blockRenderers, type BlockRenderRuntime } from "./blockrender";
import { livePreview } from "./livepreview";

export interface NoteRef {
  name: string; // file name without extension
  path: string;
}

export interface EditorCallbacks {
  onDocChanged: () => void;
  onStatus: () => void;
  onSave: () => void;
  getNotes: () => NoteRef[];
  /** Non-note files (audio, images, PDFs, …) offered by `[[` completion;
   * `name` is the full file name, extension included. */
  getAttachments?: () => NoteRef[];
  openWikilink: (target: string) => void;
  /** Open an http(s) URL in the system browser. */
  openExternal: (url: string) => void;
  resolveImage: ImageResolver;
  /** Save a pasted image; resolves to the file name to embed, or null. */
  importImageBlob: (blob: File) => Promise<string | null>;
  /** Desktop fallback: WebKitGTK paste events often carry NO data at all for
   * clipboard images — read the native clipboard instead. Resolves to the
   * saved file name to embed, or null when the clipboard has no image. */
  importNativeImage?: () => Promise<string | null>;
  onNavBack: () => void;
  onNavForward: () => void;
  /** mod-registered fenced-code block renderers (omit to disable) */
  blockRender?: BlockRenderRuntime;
}

/** Files that get markdown styling, embeds, and link shortcuts. */
const isMarkdownish = (filename: string) =>
  /\.(md|markdown|mdown|txt|text)$/.test(filename.toLowerCase()) || !filename.includes(".");

const isMac = /Mac/i.test(navigator.platform);

export type TypewriterAnchor = "top" | "center";

/** Scroll the cursor line to its typewriter resting place: the vertical middle
 * ("center"), or the upper third ("top", with a margin so it doesn't ride the
 * very edge). */
const scrollToAnchor = (head: number, anchor: TypewriterAnchor) =>
  anchor === "top"
    ? EditorView.scrollIntoView(head, { y: "start", yMargin: window.innerHeight * 0.28 })
    : EditorView.scrollIntoView(head, { y: "center" });

/** Typewriter scrolling (zen mode): keep the cursor line at a fixed spot while
 * typing or moving. Dispatched on the next frame — dispatching from inside an
 * update listener is not allowed. */
const typewriterScroll = (anchor: TypewriterAnchor) =>
  EditorView.updateListener.of((update) => {
    if (!update.docChanged && !update.selectionSet) return;
    const sel = update.state.selection.main;
    // don't recentre while a range is selected — otherwise the view scrolls on
    // every extend and makes highlighting (mouse drag or shift+arrows) a fight.
    // Resumes once the selection collapses back to a plain caret.
    if (!sel.empty) return;
    const head = sel.head;
    requestAnimationFrame(() => {
      if (update.view.state.selection.main.head !== head) return; // stale
      update.view.dispatch({ effects: scrollToAnchor(head, anchor) });
    });
  });

const URL_RE = /^https?:\/\/\S+$/i;

/** Content attributes for the spellcheck setting. CodeMirror defaults to
 * autocorrect="off", and WebKit (iOS Safari, macOS) won't draw misspelling
 * underlines while autocorrect is off — so the two travel together. */
const spellAttrs = (on: boolean) =>
  EditorView.contentAttributes.of(
    on ? { spellcheck: "true", autocorrect: "on" } : { spellcheck: "false", autocorrect: "off" },
  );

/** Words for the status bar: letters/digits with internal apostrophes and
 * hyphens, so "don't" and "well-known" each count once. */
const countWords = (text: string) => (text.match(/[\p{L}\p{N}'’-]+/gu) ?? []).length;

const cmTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--bg)",
    color: "var(--fg)",
    fontSize: "var(--editor-font-size, 15px)",
    height: "100%",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-editor)",
    lineHeight: "1.65",
  },
  ".cm-content": {
    // a measured column, centered when the pane is wider: --line-width caps
    // the text (100vw = fill the pane) and --editor-margin is the minimum
    // breathing room at the edges. max-width includes the side padding —
    // .cm-content is border-box — hence the calc.
    padding: "28px var(--editor-margin, 24px) 50vh",
    maxWidth: "calc(var(--line-width, 100vw) + 2 * var(--editor-margin, 24px))",
    margin: "0 auto",
    caretColor: "var(--cursor)",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-gutters": {
    backgroundColor: "var(--bg)",
    color: "var(--fg-muted)",
    border: "none",
    paddingLeft: "6px",
  },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--fg)" },
  ".cm-foldGutter .cm-gutterElement": {
    padding: "0 4px 0 2px",
    cursor: "pointer",
    opacity: "0.5",
  },
  ".cm-foldGutter .cm-gutterElement:hover": { opacity: "1", color: "var(--fg)" },
  ".cm-foldPlaceholder": {
    background: "color-mix(in srgb, var(--accent) 14%, transparent)",
    border: "none",
    color: "var(--fg-muted)",
    borderRadius: "4px",
    padding: "0 7px",
    margin: "0 4px",
    cursor: "pointer",
  },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--cursor)" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground":
    { background: "var(--selection)" },
  ".cm-activeLine": { backgroundColor: "transparent" },
  "&.cm-focused .cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--bg-hover) 45%, transparent)" },
  ".cm-selectionMatch": { backgroundColor: "color-mix(in srgb, var(--accent) 22%, transparent)" },
  ".cm-panels": {
    backgroundColor: "var(--bg-panel)",
    color: "var(--fg)",
    borderTop: "1px solid var(--border)",
  },
  ".cm-searchMatch": {
    backgroundColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
    outline: "1px solid var(--accent)",
  },
  ".cm-searchMatch-selected": { backgroundColor: "color-mix(in srgb, var(--accent) 50%, transparent)" },
  ".cm-tooltip": {
    backgroundColor: "var(--bg-panel)",
    color: "var(--fg)",
    border: "1px solid var(--border)",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: "var(--bg-hover)",
    color: "var(--fg)",
  },
});

/** Markdown folding, prose-editor style. lang-markdown makes *every*
 * multi-line block foldable — a paragraph whose source spans two lines, a
 * blockquote, an HTML block, a wrapped list item — which scatters chevrons
 * through ordinary prose. Keep the useful ones: heading sections (the
 * language's foldService, untouched here), fenced code blocks, and list
 * items that own a nested list. Code inside a fence still folds the way its
 * own language does. */
const noFold = () => null;
const proseFolding: MarkdownConfig = {
  props: [
    foldNodeProp.add({
      Paragraph: noFold,
      Blockquote: noFold,
      HTMLBlock: noFold,
      CommentBlock: noFold,
      ProcessingInstructionBlock: noFold,
      LinkReference: noFold,
      SetextHeading1: noFold,
      SetextHeading2: noFold,
      Table: noFold,
      ListItem: (node, state) => {
        // only a list item with a sub-list folds (the sub-list collapses)
        for (let ch = node.firstChild; ch; ch = ch.nextSibling) {
          if (ch.name === "BulletList" || ch.name === "OrderedList") {
            return { from: state.doc.lineAt(node.from).to, to: node.to };
          }
        }
        return null;
      },
    }),
  ],
};

const ATTACHMENT_KIND: [RegExp, string][] = [
  [/\.(mp3|m4a|wav|ogg|oga|opus|flac|aac|webm)$/i, "audio"],
  [/\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i, "image"],
  [/\.(mp4|mov|mkv|avi|m4v)$/i, "video"],
  [/\.pdf$/i, "pdf"],
];
const attachmentKind = (name: string) =>
  ATTACHMENT_KIND.find(([re]) => re.test(name))?.[1] ?? "file";

/** `[[` completes notes (by name) and attachments (by full file name — audio,
 * images, PDFs, …), so a recording can be linked without dragging it in from
 * the file tree. Notes rank first; attachments carry their kind as detail. */
function wikiCompletions(getNotes: () => NoteRef[], getAttachments?: () => NoteRef[]) {
  return (ctx: CompletionContext): CompletionResult | null => {
    const match = ctx.matchBefore(/\[\[[^[\]]*$/);
    if (!match) return null;
    const option = (label: string, extra: { detail?: string; boost?: number }) => ({
      label,
      ...extra,
      apply: (view: EditorView, _completion: unknown, from: number, to: number) => {
        const closed = view.state.sliceDoc(to, to + 2) === "]]";
        const insert = label + (closed ? "" : "]]");
        const cursor = from + label.length + 2;
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: cursor },
        });
      },
    });
    return {
      from: match.from + 2,
      validFor: /^[^[\]]*$/,
      options: [
        ...getNotes().map((note) => option(note.name, { boost: 1 })),
        ...(getAttachments?.() ?? []).map((f) => option(f.name, { detail: attachmentKind(f.name) })),
      ],
    };
  };
}

/** Wrap the selection in `marker` when something is selected; with an empty
 * selection the keypress falls through and types the character normally
 * (regular markdown editor behaviour for `, like Ctrl+B/I for **‍/*). */
function wrapIfSelected(marker: string) {
  return (view: EditorView): boolean => {
    if (view.state.selection.ranges.every((r) => r.empty)) return false;
    return toggleWrap(marker)(view);
  };
}

/** Toggle `marker` (e.g. ** or *) around each selection range. */
function toggleWrap(marker: string) {
  return (view: EditorView): boolean => {
    const len = marker.length;
    const tr = view.state.changeByRange((range) => {
      const { from, to } = range;
      const before = view.state.sliceDoc(Math.max(0, from - len), from);
      const after = view.state.sliceDoc(to, to + len);
      if (before === marker && after === marker) {
        return {
          changes: [
            { from: from - len, to: from },
            { from: to, to: to + len },
          ],
          range: EditorSelection.range(from - len, to - len),
        };
      }
      return {
        changes: [
          { from, insert: marker },
          { from: to, insert: marker },
        ],
        range: EditorSelection.range(from + len, to + len),
      };
    });
    view.dispatch(tr);
    return true;
  };
}

/** Markdown link from the selection: [sel](cursor), or [cursor](sel) when the
 * selection is already a URL. */
function insertLink(view: EditorView): boolean {
  const tr = view.state.changeByRange((range) => {
    const sel = view.state.sliceDoc(range.from, range.to);
    if (URL_RE.test(sel)) {
      return {
        changes: { from: range.from, to: range.to, insert: `[](${sel})` },
        range: EditorSelection.cursor(range.from + 1),
      };
    }
    return {
      changes: { from: range.from, to: range.to, insert: `[${sel}]()` },
      range: EditorSelection.cursor(range.from + sel.length + 3),
    };
  });
  view.dispatch(tr);
  return true;
}

/** Set the selected lines to ATX heading `level`; same level toggles off. */
function setHeading(level: number) {
  return (view: EditorView): boolean => {
    const { state } = view;
    const changes: { from: number; to: number; insert: string }[] = [];
    const seen = new Set<number>();
    for (const range of state.selection.ranges) {
      const last = state.doc.lineAt(range.to).number;
      for (let n = state.doc.lineAt(range.from).number; n <= last; n++) {
        if (seen.has(n)) continue;
        seen.add(n);
        const line = state.doc.line(n);
        if (!line.text && seen.size > 1) continue; // skip blanks in multi-line selections
        const m = /^(#{1,6})\s+/.exec(line.text);
        const insert = m && m[1].length === level ? "" : "#".repeat(level) + " ";
        changes.push({ from: line.from, to: line.from + (m?.[0].length ?? 0), insert });
      }
    }
    view.dispatch({ changes });
    return true;
  };
}

export class Editor {
  view: EditorView;
  private lang = new Compartment();
  private vimMode = new Compartment();
  private typewriter = new Compartment();
  private lineNos = new Compartment();
  private activeLine = new Compartment();
  private spellcheck = new Compartment();
  private callbacks: EditorCallbacks;
  private vimOn = false;
  private typewriterOn = false;
  private typewriterAnchor: TypewriterAnchor = "top";
  private lineNumbersOn = false;
  private highlightLineOn = true;
  private spellcheckOn = false;
  private liveOn = false;
  private currentFile = "";
  private markdownish = true;

  constructor(parent: HTMLElement, callbacks: EditorCallbacks) {
    this.callbacks = callbacks;
    this.view = new EditorView({
      parent,
      state: this.makeState("", "untitled.md"),
    });
  }

  private extensions(): Extension[] {
    const cbs = this.callbacks;
    return [
      this.vimMode.of(this.vimOn ? vim() : []),
      this.typewriter.of(this.typewriterOn ? typewriterScroll(this.typewriterAnchor) : []),
      this.lang.of([]),
      cmTheme,
      baseHighlighting(),
      history(),
      // lets Ctrl+D (selectNextOccurrence, from searchKeymap below) actually
      // grow into a real multi-cursor selection — without this CM6 silently
      // collapses any multi-range selection back down to one
      EditorState.allowMultipleSelections.of(true),
      drawSelection(),
      EditorView.lineWrapping,
      this.lineNos.of(this.lineNumbersOn ? lineNumbers() : []),
      this.activeLine.of(this.highlightLineOn ? highlightActiveLine() : []),
      this.spellcheck.of(spellAttrs(this.spellcheckOn)),
      // heading sections (and code blocks, lists, …) fold via the language's
      // fold info; the gutter chevron shows on hover-worthy lines only
      codeFolding({ placeholderText: "⋯" }),
      foldGutter(),
      highlightSelectionMatches(),
      autocompletion({ override: [wikiCompletions(cbs.getNotes, cbs.getAttachments)], icons: false }),
      keymap.of([
        {
          key: "Mod-s",
          run: () => {
            cbs.onSave();
            return true;
          },
        },
        { key: "Mod-b", run: toggleWrap("**") },
        { key: "Mod-i", run: toggleWrap("*") },
        { key: "Mod-Shift-x", run: (view) => this.markdownish && toggleWrap("~~")(view) },
        { key: "Mod-k", run: (view) => this.markdownish && insertLink(view) },
        // ` around a selection makes it inline code (empty selection types `)
        { key: "`", run: (view) => this.markdownish && wrapIfSelected("`")(view) },
        ...[1, 2, 3, 4, 5, 6].map((level) => ({
          key: `Mod-${level}`,
          run: (view: EditorView) => this.markdownish && setHeading(level)(view),
        })),
        // markdown tables: Tab/Shift+Tab hop cells, Enter hops rows, each
        // hop reformats the table (no-ops outside tables → defaults apply)
        {
          key: "Tab",
          run: (view) => this.markdownish && tableNextCell(view),
          shift: (view) => this.markdownish && tablePrevCell(view),
        },
        { key: "Enter", run: (view) => this.markdownish && tableNextRow(view) },
        // back/forward nav through opened files: Mod+[ / Mod+] everywhere
        // (shadowing defaultKeymap's indentLess/indentMore — Tab and
        // Shift+Tab indent), plus Alt+arrows off macOS, where Option+arrows
        // must stay word motion
        { key: "Mod-[", run: () => (cbs.onNavBack(), true) },
        { key: "Mod-]", run: () => (cbs.onNavForward(), true) },
        ...(isMac
          ? []
          : [
              { key: "Alt-ArrowLeft", run: () => (cbs.onNavBack(), true) },
              { key: "Alt-ArrowRight", run: () => (cbs.onNavForward(), true) },
            ]),
        {
          // open a blank line above the current one (keeping its indent)
          key: "Shift-Mod-Enter",
          run: (view) => {
            const line = view.state.doc.lineAt(view.state.selection.main.head);
            const indent = /^[\t ]*/.exec(line.text)![0];
            view.dispatch({
              changes: { from: line.from, insert: indent + "\n" },
              selection: { anchor: line.from + indent.length },
              scrollIntoView: true,
            });
            return true;
          },
        },
        {
          key: "Mod-Enter",
          run: (view) => {
            const target = wikilinkAt(view, view.state.selection.main.head);
            if (!target) return false;
            cbs.openWikilink(target);
            return true;
          },
        },
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        ...foldKeymap,
        indentWithTab,
      ]),
      EditorView.domEventHandlers({
        mousedown: (event, view) => {
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
          if (pos == null) return false;
          // plain click on a rendered task checkbox toggles it
          if (
            event.button === 0 &&
            !event.ctrlKey &&
            !event.metaKey &&
            (event.target as HTMLElement).closest?.(".cm-checkbox") &&
            toggleCheckboxAt(view, pos)
          ) {
            event.preventDefault();
            return true;
          }
          if (!(event.ctrlKey || event.metaKey)) return false;
          const target = wikilinkAt(view, pos);
          if (target) {
            event.preventDefault();
            cbs.openWikilink(target);
            return true;
          }
          const url = urlAt(view, pos);
          if (url) {
            event.preventDefault();
            cbs.openExternal(url);
            return true;
          }
          return false;
        },
        paste: (event, view) => {
          if (!this.markdownish || !event.clipboardData) return false;
          // a clipboard image — screenshots arrive in .files, while images
          // copied from file managers / browsers often only appear in .items
          const cb = event.clipboardData;
          const image =
            [...cb.files].find((f) => f.type.startsWith("image/")) ??
            [...cb.items]
              .find((it) => it.kind === "file" && it.type.startsWith("image/"))
              ?.getAsFile() ??
            null;
          const insertEmbed = (name: string | null) => {
            if (!name) return;
            const { from, to } = view.state.selection.main;
            const insert = `![[${name}]]`;
            view.dispatch({
              changes: { from, to, insert },
              selection: { anchor: from + insert.length },
            });
          };
          if (image) {
            event.preventDefault();
            void cbs.importImageBlob(image).then(insertEmbed);
            return true;
          }
          // an empty paste event (no image, no text of any kind) is how a
          // clipboard image looks through WebKitGTK — ask the native side
          if (cbs.importNativeImage && !cb.types.some((t) => t.startsWith("text/"))) {
            event.preventDefault();
            void cbs.importNativeImage().then(insertEmbed);
            return true;
          }
          // a URL pasted over selected text becomes a link
          const text = event.clipboardData.getData("text/plain").trim();
          const { from, to } = view.state.selection.main;
          if (from === to || !URL_RE.test(text)) return false;
          const sel = view.state.sliceDoc(from, to);
          if (URL_RE.test(sel)) return false; // replacing a URL — plain paste
          event.preventDefault();
          view.dispatch({
            changes: { from, to, insert: `[${sel}](${text})` },
            selection: { anchor: from + sel.length + text.length + 4 },
          });
          return true;
        },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) cbs.onDocChanged();
        if (update.docChanged || update.selectionSet) cbs.onStatus();
      }),
    ];
  }

  private makeState(content: string, filename: string): EditorState {
    const state = EditorState.create({ doc: content, extensions: this.extensions() });
    this.currentFile = filename;
    this.markdownish = isMarkdownish(filename);
    return state;
  }

  /** Open a document: fresh state (own undo history), language by filename. */
  openDoc(content: string, filename: string) {
    this.view.setState(this.makeState(content, filename));
    this.view.scrollDOM.scrollTop = 0; // always open at the top of the file
    void this.applyLanguage(filename);
  }

  /** Capture the live editor state for a backgrounded tab. The EditorState
   * carries the document, cursor, undo history, and language config. */
  snapshot(): { state: EditorState; scrollTop: number } {
    return { state: this.view.state, scrollTop: this.view.scrollDOM.scrollTop };
  }

  /** Bring a snapshot back (tab switch), restoring scroll once laid out. */
  restoreSnapshot(snap: { state: EditorState; scrollTop: number }, filename: string) {
    this.view.setState(snap.state);
    this.currentFile = filename;
    this.markdownish = isMarkdownish(filename);
    // the snapshot froze the compartments as they were when stashed — bring
    // them back in line with the current settings
    this.view.dispatch({
      effects: [
        this.lineNos.reconfigure(this.lineNumbersOn ? lineNumbers() : []),
        this.activeLine.reconfigure(this.highlightLineOn ? highlightActiveLine() : []),
        this.vimMode.reconfigure(this.vimOn ? vim() : []),
        this.spellcheck.reconfigure(spellAttrs(this.spellcheckOn)),
      ],
    });
    // the language compartment came back frozen too — rebuild it so a tab
    // backgrounded before live preview was toggled comes back in step
    void this.applyLanguage(filename);
    requestAnimationFrame(() => {
      this.view.scrollDOM.scrollTop = snap.scrollTop;
    });
  }

  private async applyLanguage(filename: string) {
    if (isMarkdownish(filename)) {
      this.view.dispatch({
        effects: this.lang.reconfigure([
          // markdownLanguage = commonmark + GFM (tables, strikethrough, task lists)
          markdown({ base: markdownLanguage, codeLanguages: languages, extensions: proseFolding }),
          markdownStyling(),
          // live preview hides the markup mdstyle has just finished styling —
          // it rides on top, and switching it off leaves plain source mode
          this.liveOn ? livePreview() : [],
          imageEmbeds(this.callbacks.resolveImage, this.liveOn),
          this.callbacks.blockRender
            ? blockRenderers(this.callbacks.blockRender, this.liveOn)
            : [],
        ]),
      });
      return;
    }
    const desc = LanguageDescription.matchFilename(languages, filename);
    if (!desc) {
      this.view.dispatch({ effects: this.lang.reconfigure([]) });
      return;
    }
    const support = await desc.load();
    if (this.currentFile === filename) {
      this.view.dispatch({ effects: this.lang.reconfigure(support) });
    }
  }

  /** Replace content in place (external reload), keeping the cursor put. */
  replaceContent(content: string) {
    const prev = this.view.state.selection.main.head;
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: content },
      selection: { anchor: Math.min(prev, content.length) },
    });
  }

  /** Insert text at the given client coordinates (file drop), or the cursor. */
  insertAt(text: string, coords?: { x: number; y: number }) {
    const pos =
      (coords ? this.view.posAtCoords(coords) : null) ?? this.view.state.selection.main.head;
    this.view.dispatch({
      changes: { from: pos, insert: text },
      selection: { anchor: pos + text.length },
    });
    this.view.focus();
  }

  setVim(on: boolean) {
    if (on === this.vimOn) return;
    this.vimOn = on;
    this.view.dispatch({ effects: this.vimMode.reconfigure(on ? vim() : []) });
  }

  setLineNumbers(on: boolean) {
    if (on === this.lineNumbersOn) return;
    this.lineNumbersOn = on;
    this.view.dispatch({ effects: this.lineNos.reconfigure(on ? lineNumbers() : []) });
  }

  setHighlightLine(on: boolean) {
    if (on === this.highlightLineOn) return;
    this.highlightLineOn = on;
    this.view.dispatch({
      effects: this.activeLine.reconfigure(on ? highlightActiveLine() : []),
    });
  }

  /** Live preview: hide markdown syntax except on the line being edited.
   * Only ever applied to markdown documents (see applyLanguage). */
  setLivePreview(on: boolean) {
    if (on === this.liveOn) return;
    this.liveOn = on;
    void this.applyLanguage(this.currentFile);
  }

  get livePreviewOn(): boolean {
    return this.liveOn;
  }

  setSpellcheck(on: boolean) {
    if (on === this.spellcheckOn) return;
    this.spellcheckOn = on;
    this.view.dispatch({
      effects: this.spellcheck.reconfigure(spellAttrs(on)),
    });
  }

  /** Zen mode: keep the cursor line at its anchor spot while editing. */
  setTypewriter(on: boolean, anchor: TypewriterAnchor = this.typewriterAnchor) {
    if (on === this.typewriterOn && anchor === this.typewriterAnchor) return;
    this.typewriterOn = on;
    this.typewriterAnchor = anchor;
    this.view.dispatch({
      effects: this.typewriter.reconfigure(on ? typewriterScroll(anchor) : []),
    });
    if (on) {
      this.view.dispatch({
        effects: scrollToAnchor(this.view.state.selection.main.head, anchor),
      });
    }
  }

  get text(): string {
    return this.view.state.doc.toString();
  }

  focus() {
    this.view.focus();
  }

  jumpToLine(line: number) {
    const doc = this.view.state.doc;
    const pos = doc.line(Math.min(Math.max(line, 1), doc.lines)).from;
    this.view.dispatch({
      selection: { anchor: pos },
      effects: EditorView.scrollIntoView(pos, { y: "center" }),
    });
    this.view.focus();
  }

  /** Cheap, safe to call on every keystroke: where the caret is, and how much
   * is selected. Counting the *document* means walking all of it, so that
   * lives in `docStatus()` and the status bar throttles it. */
  cursorStatus(): { line: number; col: number; selWords: number; selChars: number } {
    const state = this.view.state;
    const head = state.selection.main.head;
    const line = state.doc.lineAt(head);
    let selChars = 0;
    let selWords = 0;
    for (const range of state.selection.ranges) {
      if (range.empty) continue;
      const text = state.sliceDoc(range.from, range.to);
      selChars += text.length;
      selWords += countWords(text);
    }
    return { line: line.number, col: head - line.from + 1, selWords, selChars };
  }

  /** Whole-document counts — O(doc), so call it on a throttle. */
  docStatus(): { words: number; chars: number } {
    const text = this.view.state.doc.toString();
    return { words: countWords(text), chars: text.length };
  }
}
