import { fuzzyFilter } from "./fuzzy";

export interface PickerItem {
  label: string;
  detail?: string;
  value: string;
  /** label for an inline action button on the row (e.g. "pin"/"unpin") */
  actionLabel?: string;
  /** tooltip for the action button */
  actionTitle?: string;
  /** set by `pick` when the row came from a prefix mode (`">"`, `"#"`, …),
   * so the caller knows which list it chose from. Never set by hand. */
  mode?: string;
}

/**
 * A prefix-switched list inside one picker: typing the prefix as the first
 * character swaps the rows (and the placeholder) without reopening anything.
 * `Ctrl+P` uses this to be files / `>` commands / `#` headings / `@` tags.
 */
export interface PickerMode {
  /** single character that activates the mode, e.g. `">"` */
  prefix: string;
  /** short name shown in the prefix hint row, e.g. `"commands"` */
  name: string;
  placeholder: string;
  /** built fresh each time the mode is entered (the note may have changed) */
  items: () => PickerItem[];
  /** rows shown while the mode's query is still empty */
  emptyItems?: () => PickerItem[];
  onFreeText?: (text: string) => void;
  freeTextHint?: string;
}

interface PickerOpts {
  placeholder: string;
  /** Called as the highlighted row changes (e.g. live theme preview) — but
   * only after the user actually moves the highlight (keys, hover, typing);
   * merely opening the picker never fires it. */
  onHighlight?: (item: PickerItem | null) => void;
  /** if set, called with free text when nothing matches and Enter is hit */
  onFreeText?: (text: string) => void;
  freeTextHint?: string;
  /** invoked when a row's inline action button is clicked. May mutate the
   * `items` array in place; the picker re-renders afterwards. */
  onAction?: (item: PickerItem) => void;
  /** rows to show while the query is empty (e.g. recent files); once the user
   * types, matching falls back to the full `items` list. */
  emptyItems?: PickerItem[];
  /** prefix-switched alternate lists (see `PickerMode`) */
  modes?: PickerMode[];
  /** text the input starts with — pass a mode's prefix to open straight into
   * it (this is all `Ctrl+Shift+P` is: the quick switcher seeded with `">"`) */
  initialQuery?: string;
}

let openModal: (() => void) | null = null;

/** Redraw hook for the picker that is currently open (see `refreshPicker`). */
let rerenderPicker: (() => void) | null = null;

export function closeModal() {
  openModal?.();
  openModal = null;
  rerenderPicker = null;
}

/** Redraw the open picker's rows. A `PickerMode.items()` is synchronous, so a
 * mode backed by an async index (tags) returns what it has, kicks off the
 * load, and calls this when the data lands. No-op when nothing is open. */
export function refreshPicker() {
  rerenderPicker?.();
}

function buildModal(): { overlay: HTMLElement; box: HTMLElement } {
  closeModal();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  const box = document.createElement("div");
  box.className = "modal-box";
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  openModal = () => overlay.remove();
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) closeModal();
  });
  return { overlay, box };
}

/** Fuzzy picker over a list. Resolves with the chosen item, or null.
 *
 * With `opts.modes`, a leading prefix character swaps which list is being
 * filtered (files → commands → headings …); the resolved item carries the
 * prefix in `.mode` so the caller can route it. */
export function pick(items: PickerItem[], opts: PickerOpts): Promise<PickerItem | null> {
  return new Promise((resolve) => {
    const { box } = buildModal();
    const input = document.createElement("input");
    input.className = "modal-input";
    input.placeholder = opts.placeholder;
    if (opts.initialQuery) input.value = opts.initialQuery;
    const list = document.createElement("div");
    list.className = "modal-list";
    box.append(input, list);

    // the prefix legend, so the alternate lists are discoverable at all
    if (opts.modes?.length) {
      const hint = document.createElement("div");
      hint.className = "modal-modes";
      for (const mode of opts.modes) {
        const chip = document.createElement("span");
        chip.className = "modal-mode";
        const key = document.createElement("kbd");
        key.textContent = mode.prefix;
        chip.append(key, document.createTextNode(" " + mode.name));
        // clicking a chip is the mouse route into the mode
        chip.addEventListener("mousedown", (e) => {
          e.preventDefault();
          input.value = mode.prefix;
          input.focus();
          sel = 0;
          interacted = true;
          render();
        });
        hint.appendChild(chip);
      }
      box.appendChild(hint);
    }

    let shown: PickerItem[] = [];
    let sel = 0;
    let done = false;
    let interacted = false; // suppresses onHighlight until the user moves

    // items for the mode currently typed, rebuilt only when the mode changes
    let modeKey: string | null = null;
    let modeItems: PickerItem[] = [];

    const finish = (item: PickerItem | null) => {
      if (done) return;
      done = true;
      closeModal();
      resolve(item);
    };

    const render = () => {
      const mode = opts.modes?.find((m) => input.value.startsWith(m.prefix)) ?? null;
      if ((mode?.prefix ?? null) !== modeKey) {
        modeKey = mode?.prefix ?? null;
        modeItems = mode ? mode.items() : [];
        sel = 0;
      }
      input.placeholder = mode ? mode.placeholder : opts.placeholder;
      const query = (mode ? input.value.slice(mode.prefix.length) : input.value).trim();
      const pool = mode ? modeItems : items;
      const blanks = mode ? mode.emptyItems?.() : opts.emptyItems;
      const freeText = mode ? mode.onFreeText : opts.onFreeText;
      const freeTextHint = mode ? mode.freeTextHint : opts.freeTextHint;

      shown =
        blanks && !query
          ? blanks
          : fuzzyFilter(query, pool, (i) => i.label + " " + (i.detail ?? ""));
      // stamp the mode so the caller can tell a command from a file
      if (mode) for (const item of shown) item.mode = mode.prefix;
      sel = Math.min(sel, Math.max(0, shown.length - 1));
      list.replaceChildren(
        ...shown.map((item, i) => {
          const row = document.createElement("div");
          row.className = "modal-row" + (i === sel ? " selected" : "");
          const label = document.createElement("span");
          label.textContent = item.label;
          row.appendChild(label);
          if (item.detail) {
            const detail = document.createElement("span");
            detail.className = "modal-detail";
            detail.textContent = item.detail;
            row.appendChild(detail);
          }
          if (item.actionLabel && opts.onAction) {
            const btn = document.createElement("button");
            btn.className = "modal-row-action";
            btn.textContent = item.actionLabel;
            if (item.actionTitle) btn.title = item.actionTitle;
            // act without choosing the row; let the caller mutate items, then redraw
            btn.addEventListener("mousedown", (e) => {
              e.preventDefault();
              e.stopPropagation();
              opts.onAction!(item);
              render();
            });
            row.appendChild(btn);
          }
          row.addEventListener("mousemove", () => {
            if (sel !== i) {
              sel = i;
              interacted = true;
              render();
            }
          });
          row.addEventListener("mousedown", (e) => {
            e.preventDefault();
            finish(item);
          });
          return row;
        }),
      );
      if (!shown.length && freeText && query) {
        const row = document.createElement("div");
        row.className = "modal-row selected";
        row.textContent = `${freeTextHint ?? "Create"}: ${query}`;
        list.appendChild(row);
      }
      list.querySelector(".selected")?.scrollIntoView({ block: "nearest" });
      if (interacted) opts.onHighlight?.(shown[sel] ?? null);
    };

    input.addEventListener("input", () => {
      sel = 0;
      interacted = true;
      render();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || (e.key === "n" && e.ctrlKey)) {
        sel = Math.min(sel + 1, shown.length - 1);
        interacted = true;
        render();
        e.preventDefault();
      } else if (e.key === "ArrowUp" || (e.key === "p" && e.ctrlKey)) {
        sel = Math.max(sel - 1, 0);
        interacted = true;
        render();
        e.preventDefault();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (shown[sel]) finish(shown[sel]);
        else {
          const mode = opts.modes?.find((m) => input.value.startsWith(m.prefix)) ?? null;
          const freeText = mode ? mode.onFreeText : opts.onFreeText;
          const query = (mode ? input.value.slice(mode.prefix.length) : input.value).trim();
          if (freeText && query) {
            done = true;
            closeModal();
            freeText(query);
            resolve(null);
          }
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        // inside a mode, Escape steps back to the plain list first. The
        // window-level handler closes any open modal on Escape, so this one
        // has to be kept from reaching it.
        if (opts.modes?.some((m) => input.value.startsWith(m.prefix))) {
          e.stopPropagation();
          input.value = "";
          sel = 0;
          render();
          return;
        }
        finish(null);
      }
    });
    render();
    rerenderPicker = () => {
      if (!done) render();
    };
    input.focus();
    // seeded query (e.g. ">"): caret at the end, ready to type
    input.setSelectionRange(input.value.length, input.value.length);
  });
}

/** Generic dismissable box (Escape / click outside); caller fills it in. */
export function infoBox(build: (box: HTMLElement) => void) {
  const { box } = buildModal();
  build(box);
}

/** One-line text prompt. Resolves with the string, or null on cancel. */
export function promptText(label: string, initial = ""): Promise<string | null> {
  return new Promise((resolve) => {
    const { box } = buildModal();
    const caption = document.createElement("div");
    caption.className = "modal-caption";
    caption.textContent = label;
    const input = document.createElement("input");
    input.className = "modal-input";
    input.value = initial;
    box.append(caption, input);
    let done = false;
    const finish = (v: string | null) => {
      if (done) return;
      done = true;
      closeModal();
      resolve(v);
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finish(input.value.trim() || null);
      else if (e.key === "Escape") finish(null);
    });
    input.focus();
    const dot = initial.lastIndexOf(".");
    input.setSelectionRange(0, dot > 0 ? dot : initial.length);
  });
}

/** Small confirm dialog. */
export function confirmBox(message: string, action: string): Promise<boolean> {
  return new Promise((resolve) => {
    const { box } = buildModal();
    const caption = document.createElement("div");
    caption.className = "modal-caption";
    caption.textContent = message;
    const row = document.createElement("div");
    row.className = "modal-buttons";
    const ok = document.createElement("button");
    ok.textContent = action;
    ok.className = "danger";
    const cancel = document.createElement("button");
    cancel.textContent = "Cancel";
    row.append(cancel, ok);
    box.append(caption, row);
    const finish = (v: boolean) => {
      closeModal();
      resolve(v);
    };
    ok.addEventListener("click", () => finish(true));
    cancel.addEventListener("click", () => finish(false));
    box.addEventListener("keydown", (e) => {
      if (e.key === "Escape") finish(false);
      if (e.key === "Enter") finish(true);
    });
    ok.focus();
  });
}
