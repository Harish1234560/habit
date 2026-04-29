import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Flame, Target, Calendar, TrendingUp, Zap, Award, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarOverviewProps {
  allTasks: Task[];
  onSelectDate: (date: string) => void;
  onNavigateToTasks: () => void;
}

type ViewMode = "month" | "year" | "week";

interface DayStats {
  total: number;
  completed: number;
}

interface TooltipState {
  visible: boolean;
  dateStr: string;
  x: number;
  y: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function toDateStr(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function todayStr() { const t = new Date(); return toDateStr(t.getFullYear(), t.getMonth(), t.getDate()); }
function nextDayStr(d: string) { const x = new Date(d); x.setDate(x.getDate() + 1); return x.toISOString().slice(0, 10); }
function formatDate(dateStr: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(dateStr + "T00:00:00").toLocaleString("en-US", opts ?? { weekday: "long", month: "long", day: "numeric" });
}

function getTier(stats: DayStats | undefined, dateStr: string, tStr: string) {
  if (!stats || stats.total === 0) return dateStr > tStr ? "future" : "empty";
  const r = stats.completed / stats.total;
  if (r >= 1) return "perfect";
  if (r >= 0.75) return "great";
  if (r >= 0.5) return "half";
  if (r > 0) return "low";
  return dateStr <= tStr ? "missed" : "future";
}

function calcStreaks(dayStats: Map<string, DayStats>) {
  const dates = [...dayStats.keys()].sort();
  const tStr = todayStr();
  let cur = 0, best = 0, tmp = 0, prev: string | null = null;
  for (const d of dates) {
    const s = dayStats.get(d)!;
    if (d > tStr || s.total === 0) continue;
    const perfect = s.completed >= s.total;
    if (perfect) {
      tmp = prev && nextDayStr(prev) === d ? tmp + 1 : 1;
      best = Math.max(best, tmp);
      if (d === tStr) cur = tmp;
    } else { if (d === tStr) cur = 0; tmp = 0; }
    prev = d;
  }
  return { cur, best };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,700;12..96,800&family=Fira+Code:wght@300;400;500&display=swap');

  :root {
    --cal-bg: #060609;
    --cal-surface: #0d0d15;
    --cal-panel: #111120;
    --cal-panel2: #161628;
    --cal-border: rgba(255,255,255,0.055);
    --cal-border-hi: rgba(255,255,255,0.12);
    --cal-border-glow: rgba(120,100,255,0.35);
    --cal-txt: #eaeaf5;
    --cal-muted: rgba(180,180,210,0.45);
    --cal-muted2: rgba(180,180,210,0.25);

    --cal-perfect: #34eca0;
    --cal-great: #22d47e;
    --cal-half: #f5c130;
    --cal-low: #f07d2a;
    --cal-missed: #e8365a;
    --cal-future: rgba(255,255,255,0.08);

    --cal-violet: #7b5cff;
    --cal-indigo: #4f5cff;
    --cal-sky: #38bdf8;
    --cal-teal: #34eca0;

    --cal-glow-v: rgba(123,92,255,0.18);
    --cal-glow-t: rgba(52,236,160,0.18);
  }

  .cal-root {
    font-family: 'Bricolage Grotesque', sans-serif;
    background: var(--cal-bg);
    color: var(--cal-txt);
    min-height: 200px;
    position: relative;
    isolation: isolate;
    overflow: hidden;
  }

  /* Layered ambient background */
  .cal-ambient {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }
  .cal-ambient-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0;
    animation: orbFloat 8s ease-in-out infinite;
  }
  .cal-ambient-orb.a {
    width: 500px; height: 500px;
    top: -160px; left: -100px;
    background: radial-gradient(circle, rgba(123,92,255,0.12), transparent 70%);
    animation-delay: 0s;
    opacity: 1;
  }
  .cal-ambient-orb.b {
    width: 400px; height: 400px;
    top: -80px; right: -80px;
    background: radial-gradient(circle, rgba(52,236,160,0.09), transparent 70%);
    animation-delay: 3s;
    opacity: 1;
  }
  .cal-ambient-orb.c {
    width: 300px; height: 300px;
    bottom: -100px; left: 30%;
    background: radial-gradient(circle, rgba(79,92,255,0.08), transparent 70%);
    animation-delay: 5s;
    opacity: 1;
  }
  @keyframes orbFloat {
    0%, 100% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(-20px) scale(1.05); }
  }

  /* Grid lines */
  .cal-gridlines {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
    z-index: 0;
  }

  /* Noise */
  .cal-noise {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  .cal-inner {
    position: relative;
    z-index: 2;
    padding: 32px;
  }

  /* ─── Header ─── */
  .cal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
    gap: 20px;
    flex-wrap: wrap;
  }
  .cal-wordmark {
    display: flex;
    align-items: baseline;
    gap: 0;
  }
  .cal-title {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -1.5px;
    color: var(--cal-txt);
    line-height: 1;
  }
  .cal-title-dot {
    color: var(--cal-violet);
    font-weight: 800;
    animation: dotPulse 3s ease-in-out infinite;
  }
  @keyframes dotPulse {
    0%, 100% { opacity: 1; text-shadow: 0 0 0 transparent; }
    50% { opacity: 1; text-shadow: 0 0 20px var(--cal-violet); }
  }
  .cal-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgba(123,92,255,0.12);
    border: 1px solid rgba(123,92,255,0.25);
    border-radius: 100px;
    padding: 3px 10px;
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    color: var(--cal-violet);
    letter-spacing: 0.5px;
    margin-left: 10px;
    vertical-align: middle;
    position: relative;
    top: -3px;
  }
  .cal-badge::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--cal-violet);
    animation: badgePulse 2s ease-in-out infinite;
  }
  @keyframes badgePulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(123,92,255,0.5); }
    50% { box-shadow: 0 0 0 4px rgba(123,92,255,0); }
  }
  .cal-sub {
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    color: var(--cal-muted);
    margin-top: 8px;
    letter-spacing: 0.3px;
  }
  .cal-sub span { color: var(--cal-teal); }

  .cal-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  /* View toggle */
  .view-tabs {
    display: flex;
    background: var(--cal-panel);
    border: 1px solid var(--cal-border);
    border-radius: 12px;
    padding: 4px;
    gap: 2px;
    position: relative;
  }
  .view-tab {
    padding: 6px 16px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.8px;
    cursor: pointer;
    border: none;
    background: transparent;
    color: var(--cal-muted);
    transition: color 0.2s;
    font-family: 'Bricolage Grotesque', sans-serif;
    text-transform: uppercase;
    position: relative;
    z-index: 1;
  }
  .view-tab:hover { color: var(--cal-txt); }
  .view-tab.active {
    color: #fff;
  }
  .view-tab-indicator {
    position: absolute;
    top: 4px;
    height: calc(100% - 8px);
    border-radius: 8px;
    background: linear-gradient(135deg, var(--cal-violet), var(--cal-indigo));
    box-shadow: 0 0 20px rgba(123,92,255,0.4), inset 0 1px 0 rgba(255,255,255,0.15);
    transition: left 0.25s cubic-bezier(.34,1.56,.64,1), width 0.2s ease;
    z-index: 0;
  }

  /* Nav group */
  .nav-group {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--cal-panel);
    border: 1px solid var(--cal-border);
    border-radius: 12px;
    padding: 4px;
  }
  .nav-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--cal-muted);
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: all 0.18s cubic-bezier(.34,1.56,.64,1);
  }
  .nav-btn:hover {
    background: rgba(255,255,255,0.07);
    color: var(--cal-txt);
    transform: scale(1.1);
  }
  .nav-btn:active { transform: scale(0.92); }
  .nav-label {
    font-family: 'Fira Code', monospace;
    font-size: 12px;
    color: var(--cal-txt);
    min-width: 150px;
    text-align: center;
    font-weight: 500;
    padding: 0 4px;
  }
  .today-btn {
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid var(--cal-border-hi);
    background: transparent;
    color: var(--cal-muted);
    cursor: pointer;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    transition: all 0.2s;
    font-family: 'Bricolage Grotesque', sans-serif;
    margin-left: 4px;
  }
  .today-btn:hover {
    border-color: var(--cal-teal);
    color: var(--cal-teal);
    background: rgba(52,236,160,0.06);
    box-shadow: 0 0 12px rgba(52,236,160,0.12);
  }

  /* ─── Metric Cards ─── */
  .metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 28px;
  }
  .metric {
    background: var(--cal-panel);
    border: 1px solid var(--cal-border);
    border-radius: 16px;
    padding: 18px 16px;
    position: relative;
    overflow: hidden;
    cursor: default;
    transition: transform 0.25s cubic-bezier(.34,1.56,.64,1), border-color 0.25s, box-shadow 0.25s;
    group: true;
  }
  .metric:hover {
    transform: translateY(-4px);
    border-color: var(--cal-border-hi);
    box-shadow: 0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04);
  }
  /* Sweep highlight on hover */
  .metric::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
  }
  .metric:hover::before { opacity: 1; }
  /* Top accent bar */
  .metric::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: var(--metric-accent, var(--cal-violet));
    opacity: 0;
    transition: opacity 0.3s;
    box-shadow: 0 0 12px var(--metric-accent, var(--cal-violet));
  }
  .metric:hover::after { opacity: 1; }
  .metric-icon {
    color: var(--cal-muted2);
    margin-bottom: 12px;
    transition: color 0.2s, transform 0.3s cubic-bezier(.34,1.56,.64,1);
  }
  .metric:hover .metric-icon {
    color: var(--metric-accent, var(--cal-violet));
    transform: scale(1.15) rotate(-5deg);
  }
  .metric-label {
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    color: var(--cal-muted);
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .metric-value {
    font-size: 30px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -1.5px;
    transition: text-shadow 0.3s;
  }
  .metric:hover .metric-value { text-shadow: 0 0 30px var(--metric-accent-glow, rgba(123,92,255,0.4)); }
  .metric-sub {
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    color: var(--cal-muted2);
    margin-top: 5px;
  }
  .metric-value.green { color: var(--cal-perfect); --metric-accent: var(--cal-perfect); --metric-accent-glow: rgba(52,236,160,0.4); }
  .metric-value.amber { color: var(--cal-half); --metric-accent: var(--cal-half); --metric-accent-glow: rgba(245,193,48,0.4); }
  .metric-value.red   { color: var(--cal-missed); --metric-accent: var(--cal-missed); --metric-accent-glow: rgba(232,54,90,0.4); }
  .metric-value.purple { color: var(--cal-violet); --metric-accent: var(--cal-violet); --metric-accent-glow: rgba(123,92,255,0.4); }
  .metric.accent-green { --metric-accent: var(--cal-perfect); }
  .metric.accent-amber { --metric-accent: var(--cal-half); }
  .metric.accent-red   { --metric-accent: var(--cal-missed); }
  .metric.accent-purple { --metric-accent: var(--cal-violet); }

  /* ─── Divider ─── */
  .cal-divider {
    border: none;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--cal-border-hi) 30%, var(--cal-border-hi) 70%, transparent);
    margin: 24px 0;
  }

  /* ─── Month Grid ─── */
  .dow-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    margin-bottom: 8px;
  }
  .dow-label {
    text-align: center;
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    color: var(--cal-muted2);
    padding: 5px 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .day-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }

  .day-cell {
    aspect-ratio: 1;
    border-radius: 14px;
    border: 1px solid var(--cal-border);
    background: var(--cal-panel);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 8px;
    transition:
      transform 0.22s cubic-bezier(.34,1.56,.64,1),
      border-color 0.2s,
      box-shadow 0.22s,
      background 0.2s;
    outline: none;
  }

  /* Hover shimmer sweep */
  .day-cell::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 55%);
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
    border-radius: inherit;
  }
  .day-cell:not(.future):hover { transform: scale(1.09) translateY(-2px); z-index: 10; }
  .day-cell:not(.future):hover::before { opacity: 1; }
  .day-cell:not(.future):hover { border-color: rgba(255,255,255,0.18); box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06); }
  .day-cell:not(.future):active { transform: scale(0.96); }

  /* Glow ring on perfect days hover */
  .day-cell.perfect:not(.future):hover {
    border-color: rgba(52,236,160,0.5);
    box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 20px rgba(52,236,160,0.15), 0 0 0 1px rgba(52,236,160,0.2);
  }
  .day-cell.missed:not(.future):hover {
    border-color: rgba(232,54,90,0.4);
    box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 16px rgba(232,54,90,0.12);
  }

  .day-cell.today {
    border-color: rgba(52,236,160,0.4);
    box-shadow: 0 0 0 2px rgba(52,236,160,0.15), 0 0 30px rgba(52,236,160,0.06);
  }
  .day-cell.future { opacity: 0.3; cursor: default; }
  .day-cell.perfect { background: rgba(52,236,160,0.05); border-color: rgba(52,236,160,0.2); }
  .day-cell.great   { background: rgba(34,212,126,0.04); border-color: rgba(34,212,126,0.15); }
  .day-cell.half    { background: rgba(245,193,48,0.04); border-color: rgba(245,193,48,0.14); }
  .day-cell.low     { background: rgba(240,125,42,0.04); border-color: rgba(240,125,42,0.12); }
  .day-cell.missed  { background: rgba(232,54,90,0.05); border-color: rgba(232,54,90,0.16); }

  .day-num {
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
    color: var(--cal-txt);
    transition: color 0.2s;
  }
  .day-cell.today .day-num { color: var(--cal-teal); }
  .day-pip {
    font-family: 'Fira Code', monospace;
    font-size: 9px;
    color: var(--cal-muted);
    line-height: 1;
    align-self: flex-end;
  }

  /* Animated progress bar */
  .day-bar {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 3px;
    overflow: hidden;
  }
  .day-bar-fill {
    height: 100%;
    border-radius: 0 2px 0 0;
    position: relative;
    transition: width 0.5s cubic-bezier(.22,.68,0,1.2);
  }
  .day-bar-fill::after {
    content: '';
    position: absolute;
    top: 0; right: 0;
    width: 20px; height: 100%;
    background: rgba(255,255,255,0.5);
    filter: blur(4px);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .day-cell:hover .day-bar-fill::after { opacity: 1; }

  .bar-perfect { background: linear-gradient(90deg, var(--cal-great), var(--cal-perfect)); }
  .bar-great   { background: var(--cal-great); }
  .bar-half    { background: var(--cal-half); }
  .bar-low     { background: var(--cal-low); }
  .bar-missed  { background: var(--cal-missed); width: 100% !important; opacity: 0.6; }

  /* Today ring pulse */
  .today-ring {
    position: absolute;
    inset: -1px;
    border-radius: 14px;
    border: 1px solid rgba(52,236,160,0.4);
    animation: todayRing 3s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes todayRing {
    0%, 100% { box-shadow: 0 0 0 0 rgba(52,236,160,0.2); }
    50% { box-shadow: 0 0 0 5px rgba(52,236,160,0); }
  }

  /* Legend */
  .legend {
    display: flex;
    gap: 18px;
    margin-top: 18px;
    flex-wrap: wrap;
    align-items: center;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    color: var(--cal-muted);
    cursor: default;
    transition: color 0.2s;
  }
  .legend-item:hover { color: var(--cal-txt); }
  .legend-dot {
    width: 8px; height: 8px;
    border-radius: 3px;
    transition: transform 0.2s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s;
  }
  .legend-item:hover .legend-dot {
    transform: scale(1.5);
    box-shadow: 0 0 8px currentColor;
  }

  /* ─── Heatmap ─── */
  .heatmap-wrap { overflow-x: auto; padding-bottom: 8px; }
  .heatmap-inner { display: flex; gap: 12px; min-width: max-content; }
  .hm-month { display: flex; flex-direction: column; }
  .hm-month-label {
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    color: var(--cal-muted);
    text-transform: uppercase;
    letter-spacing: 1.2px;
    margin-bottom: 6px;
    text-align: center;
  }
  .hm-cols { display: flex; gap: 3px; }
  .hm-col { display: flex; flex-direction: column; gap: 3px; }
  .hm-cell {
    width: 12px; height: 12px;
    border-radius: 3px;
    transition: transform 0.15s cubic-bezier(.34,1.56,.64,1), box-shadow 0.15s;
    cursor: default;
    position: relative;
  }
  .hm-cell:hover { transform: scale(1.7); z-index: 10; }
  .hm-cell.hm-perfect:hover { box-shadow: 0 0 8px rgba(52,236,160,0.7); }
  .hm-cell.hm-missed:hover  { box-shadow: 0 0 8px rgba(232,54,90,0.6); }
  .hm-cell.hm-half:hover    { box-shadow: 0 0 8px rgba(245,193,48,0.6); }

  .hm-empty   { background: rgba(255,255,255,0.04); }
  .hm-future  { background: rgba(255,255,255,0.025); border: 1px dashed rgba(255,255,255,0.07); }
  .hm-perfect { background: var(--cal-perfect); box-shadow: 0 0 4px rgba(52,236,160,0.4); }
  .hm-great   { background: var(--cal-great); opacity: 0.85; }
  .hm-half    { background: var(--cal-half); opacity: 0.8; }
  .hm-low     { background: var(--cal-low); opacity: 0.75; }
  .hm-missed  { background: var(--cal-missed); opacity: 0.7; }
  .hm-blank   { background: transparent; }

  .hm-dow { display: flex; flex-direction: column; gap: 3px; margin-right: 8px; padding-top: 22px; }
  .hm-dow-label {
    font-family: 'Fira Code', monospace;
    font-size: 9px;
    color: var(--cal-muted2);
    height: 12px;
    display: flex;
    align-items: center;
    letter-spacing: 0.5px;
  }

  /* ─── Week View ─── */
  .week-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 8px;
    margin-bottom: 24px;
  }
  .week-card {
    background: var(--cal-panel);
    border: 1px solid var(--cal-border);
    border-radius: 16px;
    padding: 14px 12px;
    cursor: pointer;
    transition:
      transform 0.25s cubic-bezier(.34,1.56,.64,1),
      border-color 0.2s,
      box-shadow 0.2s,
      background 0.2s;
    position: relative;
    overflow: hidden;
    text-align: left;
  }
  .week-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(160deg, rgba(255,255,255,0.05) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
  }
  .week-card:hover {
    transform: translateY(-5px);
    border-color: var(--cal-border-hi);
    box-shadow: 0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04);
  }
  .week-card:hover::before { opacity: 1; }
  .week-card:active { transform: translateY(-2px); }
  .week-card.today {
    border-color: rgba(52,236,160,0.3);
    background: rgba(52,236,160,0.03);
  }
  .week-card.today:hover {
    border-color: rgba(52,236,160,0.5);
    box-shadow: 0 16px 40px rgba(0,0,0,0.4), 0 0 20px rgba(52,236,160,0.1);
  }
  .week-top-bar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    border-radius: 16px 16px 0 0;
    background: transparent;
    transition: opacity 0.2s;
    opacity: 0;
  }
  .week-card.today .week-top-bar {
    background: linear-gradient(90deg, var(--cal-teal), var(--cal-sky));
    box-shadow: 0 0 12px rgba(52,236,160,0.5);
    opacity: 1;
  }
  .week-card:not(.today):hover .week-top-bar {
    background: linear-gradient(90deg, var(--cal-violet), var(--cal-indigo));
    opacity: 1;
  }
  .week-dow {
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    color: var(--cal-muted);
    text-transform: uppercase;
    letter-spacing: 1.2px;
    margin-bottom: 4px;
  }
  .week-day {
    font-size: 24px;
    font-weight: 800;
    line-height: 1;
    margin-bottom: 12px;
    letter-spacing: -1px;
    transition: color 0.2s;
  }
  .week-card.today .week-day { color: var(--cal-teal); }
  .week-card:not(.today):hover .week-day { color: rgba(255,255,255,0.9); }
  .week-ratio {
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    color: var(--cal-muted);
    margin-bottom: 6px;
  }
  .week-bar-track {
    height: 3px;
    background: rgba(255,255,255,0.06);
    border-radius: 2px;
    margin-bottom: 10px;
    overflow: hidden;
  }
  .week-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.6s cubic-bezier(.22,.68,0,1.2);
    position: relative;
  }
  .week-bar-fill::after {
    content: '';
    position: absolute;
    top: 0; right: 0;
    width: 10px; height: 100%;
    background: rgba(255,255,255,0.6);
    filter: blur(3px);
    opacity: 0.5;
  }
  .week-tasks { display: flex; flex-direction: column; gap: 4px; }
  .week-task-row { display: flex; align-items: center; gap: 6px; }
  .week-task-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .week-card:hover .week-task-dot { transform: scale(1.3); }
  .week-task-name {
    font-family: 'Fira Code', monospace;
    font-size: 9px;
    color: var(--cal-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.2s;
  }
  .week-card:hover .week-task-name { color: rgba(180,180,210,0.65); }
  .week-more {
    font-family: 'Fira Code', monospace;
    font-size: 9px;
    color: var(--cal-violet);
    margin-top: 2px;
    opacity: 0;
    transform: translateX(-4px);
    transition: opacity 0.2s, transform 0.2s;
  }
  .week-card:hover .week-more { opacity: 1; transform: translateX(0); }

  /* Bar chart */
  .week-chart-wrap { margin-top: 8px; }
  .week-chart-label {
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    color: var(--cal-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 12px;
  }
  .week-bars { display: flex; align-items: flex-end; gap: 8px; height: 72px; }
  .week-bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    height: 100%;
  }
  .week-bar-track2 {
    width: 100%;
    flex: 1;
    background: rgba(255,255,255,0.04);
    border-radius: 6px 6px 0 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    transition: background 0.2s;
  }
  .week-bar-col:hover .week-bar-track2 { background: rgba(255,255,255,0.06); }
  .week-bar-body {
    border-radius: 6px 6px 0 0;
    transition: height 0.5s cubic-bezier(.22,.68,0,1.2), box-shadow 0.2s;
    position: relative;
    overflow: hidden;
  }
  .week-bar-body::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 40%;
    background: rgba(255,255,255,0.12);
    border-radius: 6px 6px 0 0;
  }
  .week-bar-col:hover .week-bar-body { box-shadow: 0 -4px 16px rgba(123,92,255,0.3); }
  .week-bar-pct {
    font-family: 'Fira Code', monospace;
    font-size: 9px;
    color: var(--cal-muted2);
    transition: color 0.2s;
  }
  .week-bar-col:hover .week-bar-pct { color: var(--cal-txt); }

  /* ─── Tooltip ─── */
  .cal-tooltip {
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    background: rgba(22, 22, 40, 0.92);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 16px;
    min-width: 180px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04);
    font-family: 'Bricolage Grotesque', sans-serif;
    animation: tooltipIn 0.18s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes tooltipIn {
    from { opacity: 0; transform: translateY(6px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .tt-date { font-size: 13px; font-weight: 700; color: var(--cal-txt); margin-bottom: 12px; }
  .tt-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .tt-key { font-family: 'Fira Code', monospace; font-size: 10px; color: var(--cal-muted); }
  .tt-val { font-family: 'Fira Code', monospace; font-size: 10px; font-weight: 600; color: var(--cal-txt); }
  .tt-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 8px 0; }
  .tt-bar { height: 4px; border-radius: 4px; background: rgba(255,255,255,0.07); margin-top: 10px; overflow: hidden; position: relative; }
  .tt-bar-fill {
    height: 100%;
    border-radius: 4px;
    position: relative;
    transition: width 0.4s ease;
  }
  .tt-bar-fill::after {
    content: '';
    position: absolute; top: 0; right: 0;
    width: 14px; height: 100%;
    background: rgba(255,255,255,0.5);
    filter: blur(4px);
  }

  /* ─── Responsive ─── */
  @media (max-width: 640px) {
    .metrics { grid-template-columns: repeat(2, 1fr); }
    .week-grid { grid-template-columns: repeat(4, 1fr); }
    .cal-inner { padding: 18px; }
    .cal-title { font-size: 22px; }
  }
`;

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent?: "green" | "amber" | "red" | "purple";
}) {
  return (
    <div className={cn("metric", accent && `accent-${accent}`)}>
      <div className="metric-icon"><Icon size={15} /></div>
      <div className="metric-label">{label}</div>
      <div className={cn("metric-value", accent ?? "")}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function DayTooltip({ tooltip, stats }: { tooltip: TooltipState; stats: DayStats | undefined }) {
  if (!tooltip.visible || !stats || stats.total === 0) return null;
  const rate = Math.round((stats.completed / stats.total) * 100);
  const barColor =
    rate >= 100 ? "var(--cal-perfect)" :
    rate >= 75  ? "var(--cal-great)" :
    rate >= 50  ? "var(--cal-half)" :
    rate > 0    ? "var(--cal-low)" :
                  "var(--cal-missed)";

  // Keep tooltip inside viewport
  const x = Math.min(tooltip.x + 16, window.innerWidth - 210);
  const y = tooltip.y - 20;

  return (
    <div className="cal-tooltip" style={{ left: x, top: y }}>
      <div className="tt-date">{formatDate(tooltip.dateStr)}</div>
      <div className="tt-row">
        <span className="tt-key">Completed</span>
        <span className="tt-val" style={{ color: barColor }}>{stats.completed}/{stats.total}</span>
      </div>
      <div className="tt-row">
        <span className="tt-key">Rate</span>
        <span className="tt-val">{rate}%</span>
      </div>
      <div className="tt-divider" />
      <div className="tt-row">
        <span className="tt-key">Remaining</span>
        <span className="tt-val">{stats.total - stats.completed}</span>
      </div>
      <div className="tt-bar">
        <div className="tt-bar-fill" style={{ width: `${rate}%`, background: barColor }} />
      </div>
    </div>
  );
}

// ─── View Tab Slider ──────────────────────────────────────────────────────────

function ViewTabs({ view, setView }: { view: ViewMode; setView: (v: ViewMode) => void }) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 4, width: 60 });
  const views: ViewMode[] = ["month", "year", "week"];

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const idx = views.indexOf(view);
    const btns = el.querySelectorAll<HTMLButtonElement>(".view-tab");
    const btn = btns[idx];
    if (btn) {
      setIndicatorStyle({ left: btn.offsetLeft, width: btn.offsetWidth });
    }
  }, [view]);

  return (
    <div className="view-tabs" ref={tabsRef}>
      <div className="view-tab-indicator" style={{ left: indicatorStyle.left, width: indicatorStyle.width }} />
      {views.map((v) => (
        <button key={v} className={cn("view-tab", view === v && "active")} onClick={() => setView(v)}>{v}</button>
      ))}
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({ viewYear, viewMonth, dayStats, recurringCount, onSelect, onHover }: {
  viewYear: number; viewMonth: number; dayStats: Map<string, DayStats>;
  recurringCount: number; onSelect: (d: string) => void;
  onHover: (d: string | null, x?: number, y?: number) => void;
}) {
  const tStr = todayStr();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: ({ day: number; dateStr: string } | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, dateStr: toDateStr(viewYear, viewMonth, d) });

  const BAR_MAP: Record<string, string> = {
    perfect: "bar-perfect", great: "bar-great", half: "bar-half", low: "bar-low", missed: "bar-missed"
  };

  return (
    <div>
      <div className="dow-header">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} className="dow-label">{d}</div>
        ))}
      </div>
      <div className="day-grid">
        {cells.map((cell, idx) => {
          if (!cell) return <div key={`e-${idx}`} />;
          const stats = dayStats.get(cell.dateStr);
          const tier = getTier(stats, cell.dateStr, tStr);
          const isToday = cell.dateStr === tStr;
          const isFuture = cell.dateStr > tStr;
          const rate = stats && stats.total > 0 ? stats.completed / stats.total : 0;

          return (
            <button
              key={cell.dateStr}
              onClick={() => !isFuture && onSelect(cell.dateStr)}
              onMouseEnter={(e) => onHover(cell.dateStr, e.clientX, e.clientY)}
              onMouseLeave={() => onHover(null)}
              className={cn("day-cell", tier, isToday && "today", isFuture && "future")}
            >
              {isToday && <div className="today-ring" />}
              <span className="day-num">{cell.day}</span>
              {stats && stats.total > 0 ? (
                <span className="day-pip">{stats.completed}/{stats.total}</span>
              ) : isFuture && recurringCount > 0 ? (
                <span className="day-pip" style={{ color: "rgba(255,255,255,0.12)" }}>{recurringCount}</span>
              ) : null}
              {tier !== "empty" && tier !== "future" && (
                <div className="day-bar">
                  <div
                    className={cn("day-bar-fill", BAR_MAP[tier] ?? "")}
                    style={{ width: tier === "missed" ? "100%" : `${Math.max(rate * 100, 5)}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="legend">
        {[
          { color: "var(--cal-perfect)", label: "Perfect" },
          { color: "var(--cal-great)",   label: "≥75%" },
          { color: "var(--cal-half)",    label: "≥50%" },
          { color: "var(--cal-low)",     label: "Some" },
          { color: "var(--cal-missed)",  label: "Missed" },
        ].map(({ color, label }) => (
          <div key={label} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Year View ────────────────────────────────────────────────────────────────

function YearView({ viewYear, dayStats }: { viewYear: number; dayStats: Map<string, DayStats> }) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const tStr = todayStr();

  function cellClass(dateStr: string | null): string {
    if (!dateStr) return "hm-blank";
    if (dateStr > tStr) return "hm-future";
    const s = dayStats.get(dateStr);
    if (!s || s.total === 0) return "hm-empty";
    const r = s.completed / s.total;
    if (r >= 1)   return "hm-perfect";
    if (r >= 0.75) return "hm-great";
    if (r >= 0.5)  return "hm-half";
    if (r > 0)     return "hm-low";
    return "hm-missed";
  }

  const monthData = months.map((name, mi) => {
    const dim = new Date(viewYear, mi + 1, 0).getDate();
    const firstWd = new Date(viewYear, mi, 1).getDay();
    const weeks = Math.ceil((firstWd + dim) / 7);
    const cols: (string | null)[][] = [];
    for (let w = 0; w < weeks; w++) {
      const col: (string | null)[] = [];
      for (let wd = 0; wd < 7; wd++) {
        const d = w * 7 + wd - firstWd + 1;
        col.push(d < 1 || d > dim ? null : toDateStr(viewYear, mi, d));
      }
      cols.push(col);
    }
    return { name, cols };
  });

  return (
    <div className="heatmap-wrap">
      <div style={{ display: "flex", gap: 0 }}>
        <div className="hm-dow">
          {["S","M","T","W","T","F","S"].map((d, i) => (
            <div key={i} className="hm-dow-label">{i % 2 === 1 ? d : ""}</div>
          ))}
        </div>
        <div className="heatmap-inner">
          {monthData.map(({ name, cols }) => (
            <div key={name} className="hm-month">
              <div className="hm-month-label">{name}</div>
              <div className="hm-cols">
                {cols.map((col, wi) => (
                  <div key={wi} className="hm-col">
                    {col.map((dateStr, di) => (
                      <div key={di} className={cn("hm-cell", cellClass(dateStr))} title={dateStr ?? ""} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="legend" style={{ marginTop: 16 }}>
        {[
          { color: "var(--cal-perfect)", label: "Perfect" },
          { color: "var(--cal-great)",   label: "Great" },
          { color: "var(--cal-half)",    label: "Half" },
          { color: "var(--cal-low)",     label: "Some" },
          { color: "var(--cal-missed)",  label: "Missed" },
          { color: "rgba(255,255,255,0.04)", label: "Empty" },
        ].map(({ color, label }) => (
          <div key={label} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ allTasks, dayStats, onSelect }: {
  allTasks: Task[]; dayStats: Map<string, DayStats>; onSelect: (d: string) => void;
}) {
  const today = new Date();
  const base = new Date(today);
  base.setDate(today.getDate() - today.getDay());
  const tStr = todayStr();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const stats = dayStats.get(dateStr);
    return {
      dateStr, label: ["SUN","MON","TUE","WED","THU","FRI","SAT"][i], day: d.getDate(),
      stats, tasks: allTasks.filter((t) => t.date === dateStr),
      rate: stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    };
  });

  function barColor(rate: number) {
    if (rate >= 100) return "linear-gradient(90deg, var(--cal-great), var(--cal-perfect))";
    if (rate >= 75)  return "var(--cal-great)";
    if (rate >= 50)  return "var(--cal-half)";
    if (rate > 0)    return "var(--cal-low)";
    return "rgba(255,255,255,0.06)";
  }
  function barColorFlat(rate: number) {
    if (rate >= 100) return "var(--cal-perfect)";
    if (rate >= 75)  return "var(--cal-great)";
    if (rate >= 50)  return "var(--cal-half)";
    if (rate > 0)    return "var(--cal-low)";
    return "rgba(255,255,255,0.06)";
  }

  return (
    <div>
      <div className="week-grid">
        {days.map(({ dateStr, label, day, stats, tasks, rate }) => {
          const isToday = dateStr === tStr;
          return (
            <button key={dateStr} onClick={() => onSelect(dateStr)} className={cn("week-card", isToday && "today")}>
              <div className="week-top-bar" />
              <div className="week-dow">{label}</div>
              <div className="week-day">{day}</div>
              {stats ? (
                <>
                  <div className="week-ratio">{stats.completed}/{stats.total}</div>
                  <div className="week-bar-track">
                    <div className="week-bar-fill" style={{ width: `${rate}%`, background: barColor(rate) }} />
                  </div>
                  <div className="week-tasks">
                    {tasks.slice(0, 3).map((t) => (
                      <div key={t.id} className="week-task-row">
                        <div className="week-task-dot" style={{
                          background: t.completed ? "var(--cal-perfect)" : "rgba(255,255,255,0.14)",
                          boxShadow: t.completed ? "0 0 4px rgba(52,236,160,0.4)" : "none"
                        }} />
                        <span className="week-task-name">{t.title ?? `#${t.id?.slice(-4)}`}</span>
                      </div>
                    ))}
                    {tasks.length > 3 && <div className="week-more">+{tasks.length - 3} more</div>}
                  </div>
                </>
              ) : (
                <div className="week-ratio" style={{ opacity: 0.3 }}>—</div>
              )}
            </button>
          );
        })}
      </div>

      <div className="week-chart-wrap">
        <div className="week-chart-label">Completion rate this week</div>
        <div className="week-bars">
          {days.map(({ dateStr, label, rate }) => (
            <div key={dateStr} className="week-bar-col">
              <div className="week-bar-track2">
                <div
                  className="week-bar-body"
                  style={{ height: `${Math.max(rate, 3)}%`, background: barColorFlat(rate) }}
                />
              </div>
              <div className="week-bar-pct">{rate > 0 ? `${rate}` : label.slice(0,1)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function CalendarOverview({ allTasks, onSelectDate, onNavigateToTasks }: CalendarOverviewProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [view, setView] = useState<ViewMode>("month");
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, dateStr: "", x: 0, y: 0 });

  useEffect(() => {
    const id = "cal-overview-v2-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = STYLES;
      document.head.appendChild(el);
    }
  }, []);

  const dayStats = useMemo(() => {
    const map = new Map<string, DayStats>();
    for (const t of allTasks) {
      const cur = map.get(t.date) ?? { total: 0, completed: 0 };
      cur.total++;
      if (t.completed) cur.completed++;
      map.set(t.date, cur);
    }
    return map;
  }, [allTasks]);

  const recurringCount = useMemo(() => allTasks.filter((t) => t.recurring).length, [allTasks]);
  const { cur: curStreak, best: bestStreak } = useMemo(() => calcStreaks(dayStats), [dayStats]);

  const { monthTotal, monthCompleted, activeDays, perfectDays, completionRate } = useMemo(() => {
    const dim = new Date(viewYear, viewMonth + 1, 0).getDate();
    const tStr = todayStr();
    let monthTotal = 0, monthCompleted = 0, activeDays = 0, perfectDays = 0;
    for (let d = 1; d <= dim; d++) {
      const str = toDateStr(viewYear, viewMonth, d);
      if (str > tStr) break;
      const s = dayStats.get(str);
      if (s && s.total > 0) {
        activeDays++;
        monthTotal += s.total;
        monthCompleted += s.completed;
        if (s.completed >= s.total) perfectDays++;
      }
    }
    return { monthTotal, monthCompleted, activeDays, perfectDays,
      completionRate: monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0 };
  }, [dayStats, viewYear, viewMonth]);

  const goPrev = useCallback(() => {
    if (view === "year") { setViewYear((y) => y - 1); return; }
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1);
  }, [view, viewMonth]);

  const goNext = useCallback(() => {
    if (view === "year") { setViewYear((y) => y + 1); return; }
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1);
  }, [view, viewMonth]);

  const goToday = useCallback(() => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }, []);

  const handleSelect = useCallback((date: string) => {
    onSelectDate(date);
    onNavigateToTasks();
  }, [onSelectDate, onNavigateToTasks]);

  const handleHover = useCallback((date: string | null, x?: number, y?: number) => {
    if (!date) { setTooltip((t) => ({ ...t, visible: false })); return; }
    setTooltip({ visible: true, dateStr: date, x: x ?? 0, y: y ?? 0 });
  }, []);

  const monthLabel = view === "year"
    ? `${viewYear}`
    : new Date(viewYear, viewMonth, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  const completionAccent = completionRate >= 75 ? "green" : completionRate >= 40 ? "amber" : "red";

  return (
    <div className="cal-root">
      {/* Ambient background */}
      <div className="cal-ambient">
        <div className="cal-ambient-orb a" />
        <div className="cal-ambient-orb b" />
        <div className="cal-ambient-orb c" />
      </div>
      <div className="cal-gridlines" />
      <div className="cal-noise" />

      {/* Floating tooltip */}
      <DayTooltip tooltip={tooltip} stats={tooltip.dateStr ? dayStats.get(tooltip.dateStr) : undefined} />

      <div className="cal-inner">
        {/* Header */}
        <div className="cal-header">
          <div>
            <div className="cal-wordmark">
              <span className="cal-title">Cal<span className="cal-title-dot">.</span>Overview</span>
              <span className="cal-badge">v2</span>
            </div>
            <div className="cal-sub">
              <span>{activeDays}</span> active days &nbsp;·&nbsp; <span>{monthCompleted}/{monthTotal}</span> tasks this period
            </div>
          </div>

          <div className="cal-controls">
            <ViewTabs view={view} setView={setView} />
            <div className="nav-group">
              <button className="nav-btn" onClick={goPrev}><ChevronLeft size={14} /></button>
              <span className="nav-label">{monthLabel}</span>
              <button className="nav-btn" onClick={goNext}><ChevronRight size={14} /></button>
              <button className="today-btn" onClick={goToday}>Today</button>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="metrics">
          <MetricCard label="Completion" value={`${completionRate}%`} sub={`${monthCompleted}/${monthTotal}`} icon={Target} accent={completionAccent} />
          <MetricCard label="Active Days" value={activeDays} sub="this period" icon={Calendar} accent="purple" />
          <MetricCard label="Streak" value={`${curStreak}d`} sub={`best ${bestStreak}d`} icon={Flame} accent={curStreak >= 3 ? "green" : curStreak >= 1 ? "amber" : undefined} />
          <MetricCard label="Perfect Days" value={perfectDays} sub="all tasks done" icon={Award} accent={perfectDays >= 5 ? "green" : "purple"} />
        </div>

        <hr className="cal-divider" />

        {/* Content */}
        {view === "month" && (
          <MonthView
            viewYear={viewYear}
            viewMonth={viewMonth}
            dayStats={dayStats}
            recurringCount={recurringCount}
            onSelect={handleSelect}
            onHover={handleHover}
          />
        )}
        {view === "year" && <YearView viewYear={viewYear} dayStats={dayStats} />}
        {view === "week" && <WeekView allTasks={allTasks} dayStats={dayStats} onSelect={handleSelect} />}
      </div>
    </div>
  );
}