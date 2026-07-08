import type { TextAPI } from "../types";

/**
 * Calendar for daily notes (ala Obsidian's Calendar plugin): a month grid
 * where days that already have a note are marked; activating any day opens
 * (creating if needed) that day's note. Daily notes live at
 * daily_dir/YYYY/MM/YYYY-MM-DD.md — the same scheme the "today" button uses.
 *
 * On open the keyboard lands on a selected day (today): arrows move day to day
 * (crossing months), Enter opens it; PageUp/Down page months, Shift+PageUp/Down
 * page years. The "on this day" panel below the grid always reflects the
 * selected day, listing that date's notes from other years.
 */

export interface CalendarHost {
  /** does a note exist for this YYYY-MM-DD? */
  hasNote: (date: string) => boolean;
  /** open (or create + open) the note for YYYY-MM-DD */
  open: (date: string) => void;
  /** existing notes from *other* years that share this date's month + day,
   * newest first — the "on this day in years past" set */
  anniversaries: (date: string) => string[];
}

const pad = (n: number) => String(n).padStart(2, "0");
const dateStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function openCalendar(app: TextAPI, host: CalendarHost) {
  const today = new Date();
  // displayed month + selected day-of-month (starts on today)
  let year = today.getFullYear();
  let month = today.getMonth();
  let sel = today.getDate();
  // touch has no hover to browse with, so the first tap on a day selects it
  // (peek) and only a second tap (or the panel's open button) opens it; a mouse
  // keeps click-to-open, since hovering already previews the day
  let touchLast = false;

  app.ui.info((box) => {
    box.classList.add("calendar-box");

    const head = document.createElement("div");
    head.className = "cal-head";
    const title = document.createElement("span");
    title.className = "cal-title";
    const nav = (label: string, tip: string, run: () => void) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.title = tip;
      b.addEventListener("click", run);
      return b;
    };
    const grid = document.createElement("div");
    grid.className = "cal-grid";

    // "on this day" panel: always visible, tracks the selected day and lists
    // that date's notes from other years
    const panel = document.createElement("div");
    panel.className = "cal-otd";

    const updatePanel = (date: string) => {
      const [, mo, d] = date.split("-").map(Number);
      const list = host.anniversaries(date);
      panel.replaceChildren();

      // primary action for the selected day — a tap can peek at a day (this
      // panel) and open it deliberately from here (or by tapping the day again)
      const open = document.createElement("button");
      open.className = "cal-otd-open";
      open.textContent = `${host.hasNote(date) ? "open" : "create"} ${date}`;
      open.addEventListener("click", () => host.open(date));
      panel.appendChild(open);

      const head2 = document.createElement("div");
      head2.className = "cal-otd-head";
      head2.append(`on this day · ${MONTHS[mo - 1]} ${d}`);
      panel.appendChild(head2);

      if (!list.length) {
        const empty = document.createElement("div");
        empty.className = "cal-otd-empty";
        empty.textContent = "no entries from other years";
        panel.appendChild(empty);
      } else {
        for (const ad of list) {
          const link = document.createElement("button");
          link.className = "cal-otd-link";
          link.textContent = ad;
          link.addEventListener("click", () => host.open(ad));
          panel.appendChild(link);
        }
        if (list.length > 1) {
          const all = document.createElement("button");
          all.className = "cal-otd-all";
          all.textContent = `open all (${list.length})`;
          all.addEventListener("click", () => {
            for (const ad of list) host.open(ad);
          });
          panel.appendChild(all);
        }
      }
    };

    // render the month; `focusSel` puts keyboard focus on the selected day so
    // arrow navigation continues (set for keyboard-driven renders + first show)
    const render = (focusSel: boolean) => {
      sel = Math.min(sel, daysInMonth(year, month));
      title.textContent = `${MONTHS[month]} ${year}`;
      grid.replaceChildren();
      for (const d of ["mo", "tu", "we", "th", "fr", "sa", "su"]) {
        const h = document.createElement("div");
        h.className = "cal-dow";
        h.textContent = d;
        grid.appendChild(h);
      }
      const first = new Date(year, month, 1);
      const lead = (first.getDay() + 6) % 7; // Monday-first
      const days = daysInMonth(year, month);
      for (let i = 0; i < lead; i++) grid.appendChild(document.createElement("div"));
      let selCell: HTMLButtonElement | null = null;
      for (let d = 1; d <= days; d++) {
        const date = dateStr(year, month, d);
        const cell = document.createElement("button");
        cell.className = "cal-day";
        cell.textContent = String(d);
        if (host.hasNote(date)) cell.classList.add("has-note");
        if (
          d === today.getDate() &&
          month === today.getMonth() &&
          year === today.getFullYear()
        ) {
          cell.classList.add("today");
        }
        if (d === sel) {
          cell.classList.add("kbd-sel");
          selCell = cell;
        }
        const others = host.anniversaries(date).length;
        if (others) cell.classList.add("has-anniversary");
        cell.title =
          date +
          (host.hasNote(date) ? "" : " (creates the note)") +
          (others ? ` · ${others} other year${others > 1 ? "s" : ""}` : "");
        cell.addEventListener("pointerdown", (e) => {
          touchLast = e.pointerType === "touch";
        });
        cell.addEventListener("click", () => {
          // touch has no hover: a tap only SELECTS the day (peek) — it opens
          // from the panel's "open" button, so browsing never jumps you into a
          // document. A mouse keeps click-to-open (hover already previews).
          if (touchLast) {
            sel = d;
            render(false);
          } else {
            host.open(date);
          }
        });
        // hovering a day selects it (mouse only), so the panel follows the pointer
        cell.addEventListener("mouseenter", () => {
          if (touchLast || sel === d) return;
          sel = d;
          render(false);
        });
        grid.appendChild(cell);
      }
      updatePanel(dateStr(year, month, sel));
      if (focusSel) selCell?.focus({ preventScroll: true });
    };

    const selDate = () => dateStr(year, month, sel);

    // move the selection by whole days, crossing month/year boundaries
    const moveDay = (delta: number) => {
      const abs = new Date(year, month, sel + delta);
      year = abs.getFullYear();
      month = abs.getMonth();
      sel = abs.getDate();
      render(true);
    };
    const shift = (by: number) => {
      month += by;
      while (month < 0) (month += 12), year--;
      while (month > 11) (month -= 12), year++;
      render(true);
    };
    const shiftYear = (by: number) => {
      year += by;
      render(true);
    };

    head.append(
      nav("«", "previous year", () => shiftYear(-1)),
      nav("‹", "previous month", () => shift(-1)),
      title,
      nav("today", "back to today", () => {
        year = today.getFullYear();
        month = today.getMonth();
        sel = today.getDate();
        render(true);
      }),
      nav("›", "next month", () => shift(1)),
      nav("»", "next year", () => shiftYear(1)),
    );

    box.append(head, grid, panel);

    box.tabIndex = -1;
    // arrows move day-by-day (± a week vertically); Enter opens the selected
    // day; PageUp/Down page months, Shift+PageUp/Down page years
    box.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "ArrowLeft": e.preventDefault(); moveDay(-1); break;
        case "ArrowRight": e.preventDefault(); moveDay(1); break;
        case "ArrowUp": e.preventDefault(); moveDay(-7); break;
        case "ArrowDown": e.preventDefault(); moveDay(7); break;
        case "Enter":
        case " ": e.preventDefault(); host.open(selDate()); break;
        case "PageUp": e.preventDefault(); e.shiftKey ? shiftYear(-1) : shift(-1); break;
        case "PageDown": e.preventDefault(); e.shiftKey ? shiftYear(1) : shift(1); break;
      }
    });

    render(true);
  });
}
