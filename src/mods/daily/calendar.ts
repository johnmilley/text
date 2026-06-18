import type { TextAPI } from "../types";

/**
 * Calendar for daily notes (ala Obsidian's Calendar plugin): a month grid
 * where days that already have a note are marked; clicking any day opens
 * (creating if needed) that day's note. Daily notes live at
 * daily_dir/YYYY/MM/YYYY-MM-DD.md — the same scheme the "today" button uses.
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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function openCalendar(app: TextAPI, host: CalendarHost) {
  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth();

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

    // "on this day" panel: entries from the same month+day in other years
    const panel = document.createElement("div");
    panel.className = "cal-otd";
    panel.hidden = true;

    const showOnThisDay = (date: string) => {
      const [, mo, d] = date.split("-").map(Number);
      const list = host.anniversaries(date);
      panel.replaceChildren();

      const head2 = document.createElement("div");
      head2.className = "cal-otd-head";
      head2.append(`on this day · ${MONTHS[mo - 1]} ${d}`);
      const x = document.createElement("button");
      x.className = "cal-otd-close";
      x.textContent = "×";
      x.title = "close";
      x.addEventListener("click", () => (panel.hidden = true));
      head2.appendChild(x);
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
      panel.hidden = false;
    };

    const render = () => {
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
      const days = new Date(year, month + 1, 0).getDate();
      for (let i = 0; i < lead; i++) grid.appendChild(document.createElement("div"));
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
        const others = host.anniversaries(date).length;
        if (others) cell.classList.add("has-anniversary");
        cell.title =
          date +
          (host.hasNote(date) ? "" : " (creates the note)") +
          (others ? ` · ${others} other year${others > 1 ? "s" : ""} — right-click` : "");
        cell.addEventListener("click", () => host.open(date));
        // right-click any day to see that day's entries from other years
        cell.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          showOnThisDay(date);
        });
        grid.appendChild(cell);
      }
    };

    const shift = (by: number) => {
      month += by;
      while (month < 0) (month += 12), year--;
      while (month > 11) (month -= 12), year++;
      render();
    };
    const shiftYear = (by: number) => {
      year += by;
      render();
    };

    head.append(
      nav("«", "previous year", () => shiftYear(-1)),
      nav("‹", "previous month", () => shift(-1)),
      title,
      nav("today", "back to this month", () => {
        year = today.getFullYear();
        month = today.getMonth();
        render();
      }),
      nav("›", "next month", () => shift(1)),
      nav("»", "next year", () => shiftYear(1)),
    );
    const otdBtn = document.createElement("button");
    otdBtn.className = "cal-otd-btn";
    otdBtn.textContent = "on this day";
    otdBtn.title = "entries from this date in past years";
    otdBtn.addEventListener("click", () =>
      showOnThisDay(dateStr(today.getFullYear(), today.getMonth(), today.getDate())),
    );

    box.append(head, grid, otdBtn, panel);
    render();

    box.tabIndex = -1;
    // arrows page months; Shift+arrows (and PageUp/Down) page years
    box.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") e.shiftKey ? shiftYear(-1) : shift(-1);
      else if (e.key === "ArrowRight") e.shiftKey ? shiftYear(1) : shift(1);
      else if (e.key === "PageUp") shiftYear(-1);
      else if (e.key === "PageDown") shiftYear(1);
    });
    box.focus();
  });
}
