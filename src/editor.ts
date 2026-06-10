import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  keymap,
} from "@codemirror/view";
import { Compartment, EditorSelection, EditorState, type Extension } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { LanguageDescription } from "@codemirror/language";
import { vim } from "@replit/codemirror-vim";
import { baseHighlighting, markdownStyling, wikilinkAt } from "./mdstyle";

export interface NoteRef {
  name: string; // file name without extension
  path: string;
}

export interface EditorCallbacks {
  onDocChanged: () => void;
  onStatus: () => void;
  onSave: () => void;
  getNotes: () => NoteRef[];
  openWikilink: (target: string) => void;
}

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
    maxWidth: "74ch",
    margin: "0 auto",
    padding: "28px 20px 50vh 20px",
    caretColor: "var(--cursor)",
  },
  "&.cm-focused": { outline: "none" },
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

function wikiCompletions(getNotes: () => NoteRef[]) {
  return (ctx: CompletionContext): CompletionResult | null => {
    const match = ctx.matchBefore(/\[\[[^[\]]*$/);
    if (!match) return null;
    return {
      from: match.from + 2,
      validFor: /^[^[\]]*$/,
      options: getNotes().map((note) => ({
        label: note.name,
        apply: (view, _completion, from, to) => {
          const closed = view.state.sliceDoc(to, to + 2) === "]]";
          const insert = note.name + (closed ? "" : "]]");
          const cursor = from + note.name.length + 2;
          view.dispatch({
            changes: { from, to, insert },
            selection: { anchor: cursor },
          });
        },
      })),
    };
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

export class Editor {
  view: EditorView;
  private lang = new Compartment();
  private vimMode = new Compartment();
  private callbacks: EditorCallbacks;
  private vimOn = false;
  private currentFile = "";

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
      this.lang.of([]),
      cmTheme,
      baseHighlighting(),
      history(),
      drawSelection(),
      EditorView.lineWrapping,
      highlightActiveLine(),
      highlightSelectionMatches(),
      autocompletion({ override: [wikiCompletions(cbs.getNotes)], icons: false }),
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
        indentWithTab,
      ]),
      EditorView.domEventHandlers({
        mousedown: (event, view) => {
          if (!(event.ctrlKey || event.metaKey)) return false;
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
          if (pos == null) return false;
          const target = wikilinkAt(view, pos);
          if (!target) return false;
          event.preventDefault();
          cbs.openWikilink(target);
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
    return state;
  }

  /** Open a document: fresh state (own undo history), language by filename. */
  openDoc(content: string, filename: string) {
    this.view.setState(this.makeState(content, filename));
    void this.applyLanguage(filename);
  }

  private async applyLanguage(filename: string) {
    const lower = filename.toLowerCase();
    if (/\.(md|markdown|mdown|txt|text)$/.test(lower) || !lower.includes(".")) {
      this.view.dispatch({
        effects: this.lang.reconfigure([
          markdown({ codeLanguages: languages }),
          markdownStyling(),
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

  setVim(on: boolean) {
    if (on === this.vimOn) return;
    this.vimOn = on;
    this.view.dispatch({ effects: this.vimMode.reconfigure(on ? vim() : []) });
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

  status(): { line: number; col: number; words: number; chars: number } {
    const state = this.view.state;
    const head = state.selection.main.head;
    const line = state.doc.lineAt(head);
    const text = state.doc.toString();
    const words = (text.match(/[\p{L}\p{N}'’-]+/gu) ?? []).length;
    return {
      line: line.number,
      col: head - line.from + 1,
      words,
      chars: text.length,
    };
  }
}
