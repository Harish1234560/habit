import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// ─── Styles injected once ─────────────────────────────────────────────────────
const CALENDAR_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');

  .xc-root {
    --xc-bg:          #0c0c10;
    --xc-surface:     #13131a;
    --xc-panel:       #1a1a25;
    --xc-border:      rgba(255,255,255,0.07);
    --xc-border-hi:   rgba(255,255,255,0.14);
    --xc-gold:        #c9a84c;
    --xc-gold-dim:    rgba(201,168,76,0.15);
    --xc-gold-glow:   rgba(201,168,76,0.25);
    --xc-txt:         #e8e4d8;
    --xc-muted:       #6b6880;
    --xc-selected-bg: #c9a84c;
    --xc-selected-fg: #0c0c10;
    --xc-today-ring:  #c9a84c;
    --xc-range-bg:    rgba(201,168,76,0.1);
    --xc-hover:       rgba(201,168,76,0.08);
    --xc-outside:     rgba(232,228,216,0.2);
    --xc-radius:      14px;
    font-family: 'DM Mono', monospace;
    color: var(--xc-txt);
    display: inline-block;
  }

  /* Wrapper card */
  .xc-card {
    background: var(--xc-surface);
    border: 1px solid var(--xc-border);
    border-radius: var(--xc-radius);
    padding: 24px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05);
  }

  /* Corner ornaments */
  .xc-card::before,
  .xc-card::after {
    content: '';
    position: absolute;
    width: 40px;
    height: 40px;
    border-color: var(--xc-gold);
    border-style: solid;
    opacity: 0.35;
  }
  .xc-card::before { top: 10px; left: 10px; border-width: 1px 0 0 1px; border-radius: 4px 0 0 0; }
  .xc-card::after  { bottom: 10px; right: 10px; border-width: 0 1px 1px 0; border-radius: 0 0 4px 0; }

  /* Caption / header */
  .xc-caption {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--xc-border);
    position: relative;
  }
  .xc-caption::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 1px;
    background: var(--xc-gold);
  }

  .xc-caption-label {
    font-family: 'Cormorant Garamond', serif;
    font-size: 17px;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: var(--xc-txt);
    text-align: center;
    flex: 1;
  }

  /* Nav buttons */
  .xc-nav-btn {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    border: 1px solid var(--xc-border-hi);
    background: var(--xc-panel);
    color: var(--xc-muted);
    cursor: pointer;
    transition: all 0.18s;
    flex-shrink: 0;
  }
  .xc-nav-btn:hover {
    border-color: var(--xc-gold);
    color: var(--xc-gold);
    background: var(--xc-gold-dim);
    box-shadow: 0 0 12px var(--xc-gold-glow);
  }
  .xc-nav-btn:disabled { opacity: 0.25; cursor: not-allowed; }
  .xc-nav-btn:disabled:hover { border-color: var(--xc-border-hi); color: var(--xc-muted); background: var(--xc-panel); box-shadow: none; }

  /* Day-of-week header */
  .xc-head-row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    margin-bottom: 6px;
  }
  .xc-head-cell {
    text-align: center;
    font-size: 9px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--xc-gold);
    opacity: 0.7;
    padding: 4px 0;
  }

  /* Week rows */
  .xc-row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 3px;
    margin-bottom: 3px;
  }

  /* Day cells */
  .xc-day-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .xc-day {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid transparent;
    background: transparent;
    color: var(--xc-txt);
    cursor: pointer;
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    font-weight: 400;
    display: grid;
    place-items: center;
    transition: all 0.15s;
    position: relative;
    z-index: 1;
  }
  .xc-day:hover {
    background: var(--xc-hover);
    border-color: rgba(201,168,76,0.3);
    color: var(--xc-gold);
  }

  /* Today */
  .xc-day[data-today='true'] {
    border-color: var(--xc-today-ring);
    color: var(--xc-gold);
    font-weight: 500;
  }
  .xc-day[data-today='true']::after {
    content: '';
    position: absolute;
    bottom: 5px;
    left: 50%;
    transform: translateX(-50%);
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--xc-gold);
  }

  /* Selected */
  .xc-day[data-selected='true'] {
    background: var(--xc-selected-bg);
    border-color: var(--xc-selected-bg);
    color: var(--xc-selected-fg);
    font-weight: 500;
    box-shadow: 0 0 16px var(--xc-gold-glow), 0 4px 12px rgba(0,0,0,0.3);
  }
  .xc-day[data-selected='true']:hover {
    background: var(--xc-selected-bg);
    color: var(--xc-selected-fg);
  }
  .xc-day[data-selected='true'][data-today='true']::after { background: var(--xc-selected-fg); }

  /* Range */
  .xc-day[data-range-middle='true'] {
    border-radius: 0;
    background: var(--xc-range-bg);
    border-color: transparent;
    color: var(--xc-gold);
  }
  .xc-day[data-range-start='true'] { border-radius: 50% 0 0 50%; }
  .xc-day[data-range-end='true']   { border-radius: 0 50% 50% 0; }
  .xc-day[data-range-start='true'][data-range-end='true'] { border-radius: 50%; }

  /* Outside month */
  .xc-day[data-outside='true'] {
    color: var(--xc-outside);
    pointer-events: none;
  }

  /* Disabled */
  .xc-day[data-disabled='true'] {
    opacity: 0.2;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* Multi-month layout */
  .xc-months {
    display: flex;
    flex-wrap: wrap;
    gap: 28px;
  }
  .xc-month { flex: 1; min-width: 240px; }

  /* Subtle scanline texture */
  .xc-card-inner {
    position: relative;
  }
  .xc-card-inner::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(255,255,255,0.006) 2px,
      rgba(255,255,255,0.006) 4px
    );
    pointer-events: none;
    z-index: 0;
  }
`;

function injectStyles() {
  const id = "xc-calendar-styles";
  if (typeof document !== "undefined" && !document.getElementById(id)) {
    const el = document.createElement("style");
    el.id = id;
    el.textContent = CALENDAR_STYLES;
    document.head.appendChild(el);
  }
}

// ─── Nav button ───────────────────────────────────────────────────────────────

function NavBtn({ onClick, disabled, dir }: { onClick?: () => void; disabled?: boolean; dir: "left" | "right" }) {
  return (
    <button className="xc-nav-btn" onClick={onClick} disabled={disabled} aria-label={dir === "left" ? "Previous" : "Next"}>
      {dir === "left" ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  React.useEffect(() => { injectStyles(); }, []);

  return (
    <div className={cn("xc-root", className)}>
      <div className="xc-card">
        <div className="xc-card-inner">
          <DayPicker
            showOutsideDays={showOutsideDays}
            classNames={{
              months:           "xc-months",
              month:            "xc-month",
              caption:          "xc-caption",
              caption_label:    "xc-caption-label",
              nav:              "",
              nav_button:       "xc-nav-btn",
              nav_button_previous: "",
              nav_button_next:  "",
              table:            "w-full",
              head_row:         "xc-head-row",
              head_cell:        "xc-head-cell",
              row:              "xc-row",
              cell:             "xc-day-cell",
              day:              "xc-day",
              day_selected:     "",
              day_today:        "",
              day_outside:      "",
              day_disabled:     "",
              day_range_start:  "",
              day_range_end:    "",
              day_range_middle: "",
              day_hidden:       "invisible",
              ...classNames,
            }}
            components={{
              IconLeft:  () => <ChevronLeft  size={13} />,
              IconRight: () => <ChevronRight size={13} />,
              Day: ({ date, displayMonth, ...dayProps }) => {
                const isToday    = isSameDay(date, new Date());
                const isOutside  = date.getMonth() !== displayMonth.getMonth();
                const isSelected = isInSelected(date, props);
                const isDisabled = isDateDisabled(date, props);
                const rangeState = getRangeState(date, props);

                return (
                  <div className="xc-day-cell">
                    <button
                      {...dayProps}
                      className="xc-day"
                      data-today={isToday || undefined}
                      data-selected={isSelected || undefined}
                      data-outside={isOutside || undefined}
                      data-disabled={isDisabled || undefined}
                      data-range-middle={rangeState === "middle" || undefined}
                      data-range-start={rangeState === "start" || undefined}
                      data-range-end={rangeState === "end" || undefined}
                      aria-selected={isSelected}
                      aria-disabled={isDisabled}
                      tabIndex={isDisabled || isOutside ? -1 : 0}
                    >
                      {date.getDate()}
                    </button>
                  </div>
                );
              },
            }}
            {...props}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isInSelected(date: Date, props: CalendarProps): boolean {
  if (!props.selected) return false;
  if (props.selected instanceof Date) return isSameDay(date, props.selected);
  if (Array.isArray(props.selected)) return props.selected.some((d) => d instanceof Date && isSameDay(d, date));
  // DateRange
  const range = props.selected as { from?: Date; to?: Date };
  if (range.from && range.to) return date >= range.from && date <= range.to;
  if (range.from) return isSameDay(date, range.from);
  return false;
}

function isDateDisabled(date: Date, props: CalendarProps): boolean {
  if (!props.disabled) return false;
  if (typeof props.disabled === "function") return (props.disabled as (d: Date) => boolean)(date);
  if (props.disabled instanceof Date) return isSameDay(date, props.disabled);
  if (Array.isArray(props.disabled)) return (props.disabled as Date[]).some((d) => isSameDay(d, date));
  return false;
}

function getRangeState(date: Date, props: CalendarProps): "start" | "end" | "middle" | null {
  const range = props.selected as { from?: Date; to?: Date } | undefined;
  if (!range || !range.from || !range.to) return null;
  if (isSameDay(date, range.from) && isSameDay(date, range.to)) return "start";
  if (isSameDay(date, range.from)) return "start";
  if (isSameDay(date, range.to)) return "end";
  if (date > range.from && date < range.to) return "middle";
  return null;
}

Calendar.displayName = "Calendar";

export { Calendar };