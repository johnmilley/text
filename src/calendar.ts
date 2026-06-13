import { infoBox } from "./modal";

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
}

const pad = (n: number) => String(n).padStart(2, "0");
const dateStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function openCalendar(host: CalendarHost) {
  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth();

  infoBox((box) => {
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
        cell.title = date + (host.hasNote(date) ? "" : " (creates the note)");
        cell.addEventListener("click", () => host.open(date));
        grid.appendChild(cell);
      }
    };

    const shift = (by: number) => {
      month += by;
      while (month < 0) (month += 12), year--;
      while (month > 11) (month -= 12), year++;
      render();
    };

    head.append(
      nav("‹", "previous month", () => shift(-1)),
      title,
      nav("today", "back to this month", () => {
        year = today.getFullYear();
        month = today.getMonth();
        render();
      }),
      nav("›", "next month", () => shift(1)),
    );
    box.append(head, grid);
    render();

    box.tabIndex = -1;
    box.addEventListener("keydown", (e) => {
      if (e.key === "PageUp" || e.key === "ArrowLeft") shift(-1);
      else if (e.key === "PageDown" || e.key === "ArrowRight") shift(1);
    });
    box.focus();
  });
}
