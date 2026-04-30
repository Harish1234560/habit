import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Flame, Target, Award, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarOverviewProps {
  allTasks: Task[];
  onSelectDate: (date: string) => void;
  onNavigateToTasks: () => void;
}

type ViewMode = "month" | "year" | "week";
type MV = "lime" | "amber" | "rose" | "violet" | "sky";

interface DayStats { total: number; completed: number; }
interface TooltipState { visible: boolean; dateStr: string; x: number; y: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
const toDateStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayStr = () => { const t = new Date(); return toDateStr(t.getFullYear(), t.getMonth(), t.getDate()); };
const nextDayStr = (d: string) => { const x = new Date(d); x.setDate(x.getDate() + 1); return x.toISOString().slice(0, 10); };
const formatDate = (s: string) => new Date(s + "T00:00:00").toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric" });

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
    if (s.completed >= s.total) {
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
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Azeret+Mono:wght@300;400;500;600&display=swap');

.cov {
  --ink: #f0eff8;
  --ink2: rgba(240,239,248,0.5);
  --ink3: rgba(240,239,248,0.22);
  --bg0: #07070d;
  --bg1: #0e0e18;
  --bg2: #13131f;
  --bg3: #191927;
  --border: rgba(255,255,255,0.06);
  --border2: rgba(255,255,255,0.11);
  --border3: rgba(255,255,255,0.18);
  --lime:   #b6f542;
  --lime2:  rgba(182,245,66,0.12);
  --lime3:  rgba(182,245,66,0.06);
  --rose:   #ff3d6e;
  --amber:  #ffb830;
  --sky:    #38d2ff;
  --violet: #9b6dff;

  font-family: 'Outfit', sans-serif;
  background: var(--bg0);
  color: var(--ink);
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-height: 320px;
}

.cov-bg { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.cov-mesh {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 60% 50% at 0% 0%,   rgba(155,109,255,0.07) 0%, transparent 60%),
    radial-gradient(ellipse 50% 60% at 100% 0%,  rgba(182,245,66,0.05)  0%, transparent 55%),
    radial-gradient(ellipse 70% 40% at 50% 100%, rgba(56,210,255,0.04)  0%, transparent 60%);
  animation: meshShift 16s ease-in-out infinite alternate;
}
@keyframes meshShift {
  0%   { transform: scale(1) rotate(0deg); }
  100% { transform: scale(1.04) rotate(0.5deg); }
}
.cov-dots {
  position: absolute; inset: 0;
  background-image: radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(ellipse 90% 90% at 50% 50%, black 40%, transparent 100%);
}
.cov-scan {
  position: absolute; inset: 0;
  background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.013) 3px, rgba(255,255,255,0.013) 4px);
}
.cov-inner { position: relative; z-index: 1; padding: 30px; }

/* ── Header ── */
.cov-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; gap: 16px; flex-wrap: wrap; }
.cov-logo { display: flex; flex-direction: column; gap: 0; }
.cov-logo-line { display: flex; align-items: center; gap: 10px; }
.cov-title {
  font-size: 32px; font-weight: 900; letter-spacing: -2px; line-height: 1;
  background: linear-gradient(135deg, #fff 40%, rgba(255,255,255,0.6) 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.cov-accent-word {
  font-size: 32px; font-weight: 900; letter-spacing: -2px; line-height: 1;
  background: linear-gradient(135deg, var(--lime) 0%, var(--sky) 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  animation: shimmer 4s linear infinite;
}
@keyframes shimmer {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.cov-chip {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--lime3); border: 1px solid rgba(182,245,66,0.22);
  border-radius: 999px; padding: 3px 9px;
  font-family: 'Azeret Mono', monospace; font-size: 10px;
  color: var(--lime); letter-spacing: 0.4px;
}
.cov-chip-dot {
  width: 5px; height: 5px; border-radius: 50%; background: var(--lime);
  animation: chipBlink 2s ease-in-out infinite;
}
@keyframes chipBlink {
  0%, 100% { box-shadow: 0 0 0 0 rgba(182,245,66,0.5); }
  50%       { box-shadow: 0 0 0 4px rgba(182,245,66,0); }
}
.cov-sub { font-family: 'Azeret Mono', monospace; font-size: 11px; color: var(--ink3); margin-top: 8px; }
.cov-sub b { color: var(--lime); font-weight: 500; }
.cov-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* Segmented tabs */
.cov-tabs {
  display: flex; border: 1px solid var(--border2); border-radius: 12px;
  overflow: hidden; background: var(--bg2); position: relative;
}
.cov-tab {
  padding: 7px 18px; border: none; background: transparent;
  font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1px;
  color: var(--ink3); cursor: pointer; transition: color 0.2s;
  position: relative; z-index: 1;
}
.cov-tab:hover { color: var(--ink2); }
.cov-tab.on { color: var(--bg0); }
.cov-tab-pill {
  position: absolute; top: 3px; bottom: 3px;
  border-radius: 9px;
  background: var(--lime);
  box-shadow: 0 0 20px rgba(182,245,66,0.35), 0 0 40px rgba(182,245,66,0.15);
  transition: left 0.28s cubic-bezier(.34,1.56,.64,1), width 0.2s ease;
  z-index: 0;
}

/* Nav */
.cov-nav {
  display: flex; align-items: center; gap: 2px;
  background: var(--bg2); border: 1px solid var(--border2); border-radius: 12px; padding: 4px;
}
.cov-nav-btn {
  width: 30px; height: 30px; border-radius: 8px; border: none;
  background: transparent; color: var(--ink2); cursor: pointer;
  display: grid; place-items: center;
  transition: background 0.15s, color 0.15s, transform 0.2s cubic-bezier(.34,1.56,.64,1);
}
.cov-nav-btn:hover { background: var(--border2); color: var(--ink); transform: scale(1.1); }
.cov-nav-btn:active { transform: scale(0.9); }
.cov-nav-label {
  font-family: 'Azeret Mono', monospace; font-size: 12px;
  color: var(--ink); min-width: 148px; text-align: center; font-weight: 500;
}
.cov-today-btn {
  padding: 6px 14px; border-radius: 8px; margin-left: 4px;
  border: 1px solid var(--border2); background: transparent;
  font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.8px;
  color: var(--ink3); cursor: pointer; transition: all 0.18s;
}
.cov-today-btn:hover { border-color: var(--sky); color: var(--sky); background: rgba(56,210,255,0.08); }

/* ── Metrics ── */
.cov-metrics { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 26px; }
.cov-metric {
  background: var(--bg2); border: 1px solid var(--border); border-radius: 18px;
  padding: 18px 16px; position: relative; overflow: hidden; cursor: default;
  transition: transform 0.25s cubic-bezier(.34,1.56,.64,1), border-color 0.2s, box-shadow 0.25s;
}
.cov-metric:hover { transform: translateY(-5px) scale(1.01); border-color: var(--border3); box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
.cov-metric::before {
  content: ''; position: absolute; inset: 0;
  background: repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255,255,255,0.015) 8px, rgba(255,255,255,0.015) 9px);
  opacity: 0; transition: opacity 0.3s;
}
.cov-metric:hover::before { opacity: 1; }
.cov-metric-edge {
  position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  border-radius: 18px 0 0 18px; opacity: 0.5; transition: opacity 0.3s, box-shadow 0.3s;
}
.cov-metric:hover .cov-metric-edge { opacity: 1; }
.cov-metric-icon { color: var(--ink3); margin-bottom: 14px; transition: transform 0.3s cubic-bezier(.34,1.56,.64,1); }
.cov-metric:hover .cov-metric-icon { transform: rotate(-8deg) scale(1.2); }
.cov-metric-lbl { font-family: 'Azeret Mono', monospace; font-size: 9.5px; color: var(--ink3); letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 6px; }
.cov-metric-val { font-size: 32px; font-weight: 900; letter-spacing: -2px; line-height: 1; }
.cov-metric-sub { font-family: 'Azeret Mono', monospace; font-size: 10px; color: var(--ink3); margin-top: 5px; }
.mv-lime   { color: var(--lime); }
.mv-amber  { color: var(--amber); }
.mv-rose   { color: var(--rose); }
.mv-violet { color: var(--violet); }
.mv-sky    { color: var(--sky); }

/* ── Divider ── */
.cov-hr { border: none; height: 1px; margin: 22px 0; background: linear-gradient(90deg, transparent, var(--border3) 20%, var(--border3) 80%, transparent); }

/* ── Month Grid ── */
.cov-dow { display: grid; grid-template-columns: repeat(7,1fr); gap: 5px; margin-bottom: 7px; }
.cov-dow-cell { text-align: center; font-family: 'Azeret Mono', monospace; font-size: 10px; color: var(--ink3); padding: 4px 0; text-transform: uppercase; letter-spacing: 1.2px; }
.cov-daygrid { display: grid; grid-template-columns: repeat(7,1fr); gap: 5px; }

.cov-day {
  aspect-ratio: 1; border-radius: 16px; border: 1px solid var(--border);
  background: var(--bg2); cursor: pointer; position: relative; overflow: hidden;
  display: flex; flex-direction: column; justify-content: space-between; padding: 8px;
  transition: transform 0.2s cubic-bezier(.34,1.56,.64,1), border-color 0.18s, box-shadow 0.2s;
  outline: none;
}
.cov-day.t-perfect::after {
  content: ''; position: absolute; top: 0; right: 0; width: 10px; height: 10px;
  background: conic-gradient(var(--lime) 90deg, transparent 90deg 180deg, var(--lime) 180deg 270deg, transparent 270deg);
  background-size: 5px 5px; border-radius: 0 16px 0 4px; opacity: 0.5;
}
.cov-day:not(.t-future):hover { transform: scale(1.1) translateY(-3px); z-index: 10; border-color: var(--border3); box-shadow: 0 14px 36px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.07); }
.cov-day:not(.t-future):active { transform: scale(0.95); }
.cov-day.t-future { opacity: 0.28; cursor: default; }
.cov-day.t-perfect { background: rgba(182,245,66,0.055); border-color: rgba(182,245,66,0.2); }
.cov-day.t-great   { background: rgba(56,210,255,0.04);  border-color: rgba(56,210,255,0.14); }
.cov-day.t-half    { background: rgba(255,184,48,0.04);  border-color: rgba(255,184,48,0.13); }
.cov-day.t-low     { background: rgba(255,100,60,0.04);  border-color: rgba(255,100,60,0.12); }
.cov-day.t-missed  { background: rgba(255,61,110,0.05);  border-color: rgba(255,61,110,0.16); }
.cov-day.is-today  { border-color: rgba(182,245,66,0.45); box-shadow: 0 0 0 2px rgba(182,245,66,0.12), 0 0 30px rgba(182,245,66,0.06); }
.cov-day-ring {
  position: absolute; inset: -1px; border-radius: 16px;
  border: 1px solid rgba(182,245,66,0.35);
  animation: ringPulse 3.5s ease-in-out infinite; pointer-events: none;
}
@keyframes ringPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(182,245,66,0.2); }
  50%       { box-shadow: 0 0 0 6px rgba(182,245,66,0); }
}
.cov-day-num { font-size: 13px; font-weight: 700; line-height: 1; }
.cov-day.is-today .cov-day-num { color: var(--lime); }
.cov-day-pip { font-family: 'Azeret Mono', monospace; font-size: 9px; color: var(--ink3); line-height: 1; align-self: flex-end; }
.cov-day-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; overflow: hidden; }
.cov-day-bar-fill {
  height: 100%; border-radius: 0 2px 0 0;
  transition: width 0.5s cubic-bezier(.22,.68,0,1.2); position: relative;
}
.cov-day-bar-fill::after {
  content: ''; position: absolute; top: 0; right: -20px; width: 16px; height: 100%;
  background: rgba(255,255,255,0.7); filter: blur(5px); opacity: 0; transition: opacity 0.2s;
}
.cov-day:hover .cov-day-bar-fill::after { opacity: 1; }
.db-perfect { background: linear-gradient(90deg, rgba(56,210,255,0.9), var(--lime)); }
.db-great   { background: var(--sky); }
.db-half    { background: var(--amber); }
.db-low     { background: #ff7340; }
.db-missed  { background: var(--rose); width: 100% !important; opacity: 0.7; }

/* Legend */
.cov-legend { display: flex; gap: 16px; margin-top: 16px; flex-wrap: wrap; }
.cov-legend-item { display: flex; align-items: center; gap: 6px; font-family: 'Azeret Mono', monospace; font-size: 10px; color: var(--ink3); cursor: default; transition: color 0.18s; }
.cov-legend-item:hover { color: var(--ink2); }
.cov-legend-dot { width: 8px; height: 8px; border-radius: 3px; transition: transform 0.2s cubic-bezier(.34,1.56,.64,1); }
.cov-legend-item:hover .cov-legend-dot { transform: scale(1.6) rotate(8deg); }

/* ── Year Heatmap ── */
.cov-hm-wrap { overflow-x: auto; padding-bottom: 8px; }
.cov-hm-inner { display: flex; gap: 14px; min-width: max-content; }
.cov-hm-month { display: flex; flex-direction: column; }
.cov-hm-lbl { font-family: 'Azeret Mono', monospace; font-size: 10px; color: var(--ink3); text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 6px; text-align: center; }
.cov-hm-cols { display: flex; gap: 3px; }
.cov-hm-col  { display: flex; flex-direction: column; gap: 3px; }
.cov-hm-cell { width: 12px; height: 12px; border-radius: 3px; cursor: default; transition: transform 0.14s cubic-bezier(.34,1.56,.64,1), box-shadow 0.14s; }
.cov-hm-cell:hover { transform: scale(1.8); z-index: 10; }
.hmc-blank   { background: transparent; }
.hmc-empty   { background: rgba(255,255,255,0.045); }
.hmc-future  { background: rgba(255,255,255,0.025); border: 1px dashed rgba(255,255,255,0.08); }
.hmc-perfect { background: var(--lime); box-shadow: 0 0 6px rgba(182,245,66,0.5); }
.hmc-great   { background: var(--sky); opacity: 0.8; }
.hmc-half    { background: var(--amber); opacity: 0.8; }
.hmc-low     { background: #ff7340; opacity: 0.7; }
.hmc-missed  { background: var(--rose); opacity: 0.65; }
.cov-hm-cell.hmc-perfect:hover { box-shadow: 0 0 10px rgba(182,245,66,0.8); }
.cov-hm-cell.hmc-missed:hover  { box-shadow: 0 0 10px rgba(255,61,110,0.7); }
.cov-hm-cell.hmc-half:hover    { box-shadow: 0 0 10px rgba(255,184,48,0.7); }
.cov-hm-dow { display: flex; flex-direction: column; gap: 3px; margin-right: 8px; padding-top: 22px; }
.cov-hm-dow-lbl { font-family: 'Azeret Mono', monospace; font-size: 9px; color: var(--ink3); height: 12px; display: flex; align-items: center; }

/* ── Week View ── */
.cov-week-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 8px; margin-bottom: 22px; }
.cov-week-card {
  background: var(--bg2); border: 1px solid var(--border); border-radius: 18px;
  padding: 14px 12px; cursor: pointer; position: relative; overflow: hidden; text-align: left;
  transition: transform 0.25s cubic-bezier(.34,1.56,.64,1), border-color 0.18s, box-shadow 0.2s;
}
.cov-week-card::before {
  content: ''; position: absolute; bottom: -3px; left: 6px; right: 6px; height: 100%;
  background: var(--bg3); border: 1px solid var(--border); border-radius: 18px; z-index: -1;
  opacity: 0; transition: opacity 0.2s, transform 0.25s;
}
.cov-week-card:hover::before { opacity: 1; transform: translateY(3px); }
.cov-week-card:hover { transform: translateY(-6px); border-color: var(--border3); box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
.cov-week-card:active { transform: translateY(-2px); }
.cov-week-card.is-today { border-color: rgba(182,245,66,0.3); background: rgba(182,245,66,0.03); }
.cov-week-card.is-today:hover { border-color: rgba(182,245,66,0.5); box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 24px rgba(182,245,66,0.08); }
.cov-wk-topbar { position: absolute; top: 0; left: 0; right: 0; height: 2px; border-radius: 18px 18px 0 0; opacity: 0; transition: opacity 0.2s; }
.cov-week-card.is-today .cov-wk-topbar { opacity: 1; background: var(--lime); box-shadow: 0 0 12px rgba(182,245,66,0.5); }
.cov-week-card:not(.is-today):hover .cov-wk-topbar { opacity: 1; background: var(--violet); }
.cov-wk-dow { font-family: 'Azeret Mono', monospace; font-size: 10px; color: var(--ink3); text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 3px; }
.cov-wk-day { font-size: 26px; font-weight: 900; letter-spacing: -2px; line-height: 1; margin-bottom: 12px; transition: color 0.18s; }
.cov-week-card.is-today .cov-wk-day { color: var(--lime); }
.cov-wk-ratio { font-family: 'Azeret Mono', monospace; font-size: 10px; color: var(--ink3); margin-bottom: 5px; }
.cov-wk-track { height: 3px; border-radius: 2px; background: rgba(255,255,255,0.06); margin-bottom: 10px; overflow: hidden; }
.cov-wk-fill { height: 100%; border-radius: 2px; transition: width 0.6s cubic-bezier(.22,.68,0,1.2); }
.cov-wk-tasks { display: flex; flex-direction: column; gap: 4px; }
.cov-wk-task { display: flex; align-items: center; gap: 6px; }
.cov-wk-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; transition: transform 0.18s; }
.cov-week-card:hover .cov-wk-dot { transform: scale(1.4); }
.cov-wk-name { font-family: 'Azeret Mono', monospace; font-size: 9px; color: var(--ink3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color 0.18s; }
.cov-week-card:hover .cov-wk-name { color: var(--ink2); }
.cov-wk-more { font-family: 'Azeret Mono', monospace; font-size: 9px; color: var(--violet); margin-top: 3px; opacity: 0; transform: translateX(-6px); transition: opacity 0.2s, transform 0.2s; }
.cov-week-card:hover .cov-wk-more { opacity: 1; transform: none; }

/* Mini chart */
.cov-wk-chart-lbl { font-family: 'Azeret Mono', monospace; font-size: 10px; color: var(--ink3); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
.cov-wk-bars { display: flex; align-items: flex-end; gap: 8px; height: 72px; }
.cov-wk-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; }
.cov-wk-bar-track { width: 100%; flex: 1; background: rgba(255,255,255,0.04); border-radius: 6px 6px 0 0; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; transition: background 0.2s; }
.cov-wk-bar-col:hover .cov-wk-bar-track { background: rgba(255,255,255,0.07); }
.cov-wk-bar-fill { border-radius: 6px 6px 0 0; transition: height 0.55s cubic-bezier(.22,.68,0,1.2); position: relative; }
.cov-wk-bar-fill::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 35%; background: rgba(255,255,255,0.14); border-radius: 6px 6px 0 0; }
.cov-wk-bar-col:hover .cov-wk-bar-fill { box-shadow: 0 -6px 16px rgba(182,245,66,0.2); }
.cov-wk-bar-pct { font-family: 'Azeret Mono', monospace; font-size: 9px; color: var(--ink3); transition: color 0.18s; }
.cov-wk-bar-col:hover .cov-wk-bar-pct { color: var(--ink); }

/* ── Tooltip ── */
.cov-tooltip {
  position: fixed; z-index: 9999; pointer-events: none;
  background: rgba(14,14,24,0.95);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--border3); border-radius: 18px; padding: 16px; min-width: 185px;
  box-shadow: 0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.03);
  font-family: 'Outfit', sans-serif;
  animation: ttIn 0.16s cubic-bezier(.34,1.56,.64,1) forwards;
}
@keyframes ttIn {
  from { opacity: 0; transform: translateY(8px) scale(0.95); }
  to   { opacity: 1; transform: none; }
}
.cov-tt-date { font-size: 13px; font-weight: 700; color: var(--ink); margin-bottom: 12px; }
.cov-tt-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.cov-tt-k { font-family: 'Azeret Mono', monospace; font-size: 10px; color: var(--ink3); }
.cov-tt-v { font-family: 'Azeret Mono', monospace; font-size: 10px; font-weight: 600; color: var(--ink); }
.cov-tt-sep { height: 1px; background: var(--border); margin: 8px 0; }
.cov-tt-bar { height: 4px; border-radius: 4px; background: rgba(255,255,255,0.07); margin-top: 10px; overflow: hidden; }
.cov-tt-fill { height: 100%; border-radius: 4px; }

@media (max-width: 640px) {
  .cov-metrics { grid-template-columns: repeat(2,1fr); }
  .cov-week-grid { grid-template-columns: repeat(4,1fr); }
  .cov-inner { padding: 16px; }
  .cov-title, .cov-accent-word { font-size: 24px; }
}
`;

function injectStyles() {
  const id = "cov3-styles";
  if (typeof document !== "undefined" && !document.getElementById(id)) {
    const el = document.createElement("style"); el.id = id; el.textContent = STYLES;
    document.head.appendChild(el);
  }
}

// ─── Color helpers ────────────────────────────────────────────────────────────

const TIER_BAR: Record<string, string> = { perfect: "db-perfect", great: "db-great", half: "db-half", low: "db-low", missed: "db-missed" };
const EDGE_COLOR: Record<MV, string> = { lime: "var(--lime)", amber: "var(--amber)", rose: "var(--rose)", violet: "var(--violet)", sky: "var(--sky)" };

function hmCellClass(dateStr: string | null, tStr: string, dayStats: Map<string, DayStats>) {
  if (!dateStr) return "hmc-blank";
  if (dateStr > tStr) return "hmc-future";
  const s = dayStats.get(dateStr);
  if (!s || s.total === 0) return "hmc-empty";
  const r = s.completed / s.total;
  if (r >= 1) return "hmc-perfect";
  if (r >= 0.75) return "hmc-great";
  if (r >= 0.5) return "hmc-half";
  if (r > 0) return "hmc-low";
  return "hmc-missed";
}

function weekBarColor(rate: number) {
  if (rate >= 100) return "linear-gradient(90deg, var(--sky), var(--lime))";
  if (rate >= 75)  return "var(--sky)";
  if (rate >= 50)  return "var(--amber)";
  if (rate > 0)    return "#ff7340";
  return "rgba(255,255,255,0.06)";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, icon: Icon, mv = "violet" }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; mv?: MV;
}) {
  return (
    <div className="cov-metric">
      <div className="cov-metric-edge" style={{ background: EDGE_COLOR[mv] }} />
      <div className="cov-metric-icon"><Icon size={15} /></div>
      <div className="cov-metric-lbl">{label}</div>
      <div className={`cov-metric-val mv-${mv}`}>{value}</div>
      {sub && <div className="cov-metric-sub">{sub}</div>}
    </div>
  );
}

function Tooltip({ tooltip, stats }: { tooltip: TooltipState; stats: DayStats | undefined }) {
  if (!tooltip.visible || !stats || stats.total === 0) return null;
  const rate = Math.round((stats.completed / stats.total) * 100);
  const color = rate >= 100 ? "var(--lime)" : rate >= 75 ? "var(--sky)" : rate >= 50 ? "var(--amber)" : rate > 0 ? "#ff7340" : "var(--rose)";
  const x = Math.min(tooltip.x + 16, (typeof window !== "undefined" ? window.innerWidth : 1200) - 210);
  return (
    <div className="cov-tooltip" style={{ left: x, top: tooltip.y - 18 }}>
      <div className="cov-tt-date">{formatDate(tooltip.dateStr)}</div>
      <div className="cov-tt-row"><span className="cov-tt-k">Done</span><span className="cov-tt-v" style={{ color }}>{stats.completed}/{stats.total}</span></div>
      <div className="cov-tt-row"><span className="cov-tt-k">Rate</span><span className="cov-tt-v">{rate}%</span></div>
      <div className="cov-tt-sep" />
      <div className="cov-tt-row"><span className="cov-tt-k">Left</span><span className="cov-tt-v">{stats.total - stats.completed}</span></div>
      <div className="cov-tt-bar"><div className="cov-tt-fill" style={{ width: `${rate}%`, background: color }} /></div>
    </div>
  );
}

function ViewTabs({ view, setView }: { view: ViewMode; setView: (v: ViewMode) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });
  const tabs: ViewMode[] = ["month", "year", "week"];

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const btns = el.querySelectorAll<HTMLButtonElement>(".cov-tab");
    const i = tabs.indexOf(view);
    if (btns[i]) setPill({ left: btns[i].offsetLeft, width: btns[i].offsetWidth });
  }, [view]);

  return (
    <div className="cov-tabs" ref={ref}>
      <div className="cov-tab-pill" style={{ left: pill.left, width: pill.width }} />
      {tabs.map((v) => (
        <button key={v} className={cn("cov-tab", view === v && "on")} onClick={() => setView(v)}>{v}</button>
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
  const dim = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: ({ day: number; dateStr: string } | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push({ day: d, dateStr: toDateStr(viewYear, viewMonth, d) });

  return (
    <div>
      <div className="cov-dow">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="cov-dow-cell">{d}</div>)}
      </div>
      <div className="cov-daygrid">
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
              className={cn("cov-day", `t-${tier}`, isToday && "is-today", isFuture && "t-future")}
            >
              {isToday && <div className="cov-day-ring" />}
              <span className="cov-day-num">{cell.day}</span>
              {stats && stats.total > 0 ? (
                <span className="cov-day-pip">{stats.completed}/{stats.total}</span>
              ) : isFuture && recurringCount > 0 ? (
                <span className="cov-day-pip" style={{ color: "rgba(255,255,255,0.1)" }}>{recurringCount}</span>
              ) : null}
              {tier !== "empty" && tier !== "future" && (
                <div className="cov-day-bar">
                  <div className={cn("cov-day-bar-fill", TIER_BAR[tier] ?? "")}
                    style={{ width: tier === "missed" ? "100%" : `${Math.max(rate * 100, 5)}%` }} />
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="cov-legend">
        {[["var(--lime)","Perfect"],["var(--sky)","≥75%"],["var(--amber)","≥50%"],["#ff7340","Some"],["var(--rose)","Missed"]].map(([color, label]) => (
          <div key={label} className="cov-legend-item">
            <span className="cov-legend-dot" style={{ background: color }} />{label}
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
    <div className="cov-hm-wrap">
      <div style={{ display: "flex" }}>
        <div className="cov-hm-dow">
          {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="cov-hm-dow-lbl">{i % 2 === 1 ? d : ""}</div>)}
        </div>
        <div className="cov-hm-inner">
          {monthData.map(({ name, cols }) => (
            <div key={name} className="cov-hm-month">
              <div className="cov-hm-lbl">{name}</div>
              <div className="cov-hm-cols">
                {cols.map((col, wi) => (
                  <div key={wi} className="cov-hm-col">
                    {col.map((ds, di) => <div key={di} className={cn("cov-hm-cell", hmCellClass(ds, tStr, dayStats))} title={ds ?? ""} />)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="cov-legend" style={{ marginTop: 16 }}>
        {[["var(--lime)","Perfect"],["var(--sky)","Great"],["var(--amber)","Half"],["#ff7340","Some"],["var(--rose)","Missed"],["rgba(255,255,255,0.04)","Empty"]].map(([color, label]) => (
          <div key={label} className="cov-legend-item">
            <span className="cov-legend-dot" style={{ background: color }} />{label}
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
    const d = new Date(base); d.setDate(base.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const stats = dayStats.get(dateStr);
    const rate = stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    return { dateStr, label: ["SUN","MON","TUE","WED","THU","FRI","SAT"][i], day: d.getDate(), stats, tasks: allTasks.filter((t) => t.date === dateStr), rate };
  });

  return (
    <div>
      <div className="cov-week-grid">
        {days.map(({ dateStr, label, day, stats, tasks, rate }) => (
          <button key={dateStr} onClick={() => onSelect(dateStr)} className={cn("cov-week-card", dateStr === tStr && "is-today")}>
            <div className="cov-wk-topbar" />
            <div className="cov-wk-dow">{label}</div>
            <div className="cov-wk-day">{day}</div>
            {stats ? (
              <>
                <div className="cov-wk-ratio">{stats.completed}/{stats.total}</div>
                <div className="cov-wk-track"><div className="cov-wk-fill" style={{ width: `${rate}%`, background: weekBarColor(rate) }} /></div>
                <div className="cov-wk-tasks">
                  {tasks.slice(0, 3).map((t) => (
                    <div key={t.id} className="cov-wk-task">
                      <div className="cov-wk-dot" style={{ background: t.completed ? "var(--lime)" : "rgba(255,255,255,0.12)", boxShadow: t.completed ? "0 0 5px rgba(182,245,66,0.5)" : "none" }} />
                      <span className="cov-wk-name">{t.title ?? `#${t.id?.slice(-4)}`}</span>
                    </div>
                  ))}
                  {tasks.length > 3 && <div className="cov-wk-more">+{tasks.length - 3} more</div>}
                </div>
              </>
            ) : <div className="cov-wk-ratio" style={{ opacity: 0.25 }}>—</div>}
          </button>
        ))}
      </div>
      <div>
        <div className="cov-wk-chart-lbl">Completion — this week</div>
        <div className="cov-wk-bars">
          {days.map(({ dateStr, label, rate }) => (
            <div key={dateStr} className="cov-wk-bar-col">
              <div className="cov-wk-bar-track">
                <div className="cov-wk-bar-fill" style={{ height: `${Math.max(rate, 3)}%`, background: weekBarColor(rate) }} />
              </div>
              <div className="cov-wk-bar-pct">{rate > 0 ? `${rate}` : label[0]}</div>
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

  useEffect(() => { injectStyles(); }, []);

  const dayStats = useMemo(() => {
    const map = new Map<string, DayStats>();
    for (const t of allTasks) {
      const cur = map.get(t.date) ?? { total: 0, completed: 0 };
      cur.total++; if (t.completed) cur.completed++;
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
        activeDays++; monthTotal += s.total; monthCompleted += s.completed;
        if (s.completed >= s.total) perfectDays++;
      }
    }
    return { monthTotal, monthCompleted, activeDays, perfectDays, completionRate: monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0 };
  }, [dayStats, viewYear, viewMonth]);

  const goPrev = useCallback(() => {
    if (view === "year") { setViewYear((y) => y - 1); return; }
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1);
  }, [view, viewMonth]);

  const goNext = useCallback(() => {
    if (view === "year") { setViewYear((y) => y + 1); return; }
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1);
  }, [view, viewMonth]);

  const goToday = useCallback(() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }, []);
  const handleSelect = useCallback((date: string) => { onSelectDate(date); onNavigateToTasks(); }, [onSelectDate, onNavigateToTasks]);
  const handleHover = useCallback((date: string | null, x?: number, y?: number) => {
    if (!date) { setTooltip((t) => ({ ...t, visible: false })); return; }
    setTooltip({ visible: true, dateStr: date, x: x ?? 0, y: y ?? 0 });
  }, []);

  const monthLabel = view === "year"
    ? `${viewYear}`
    : new Date(viewYear, viewMonth, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  const compMv: MV = completionRate >= 75 ? "lime" : completionRate >= 40 ? "amber" : "rose";
  const streakMv: MV = curStreak >= 3 ? "lime" : curStreak >= 1 ? "amber" : "violet";

  return (
    <div className="cov">
      <div className="cov-bg">
        <div className="cov-mesh" />
        <div className="cov-dots" />
        <div className="cov-scan" />
      </div>

      <Tooltip tooltip={tooltip} stats={tooltip.dateStr ? dayStats.get(tooltip.dateStr) : undefined} />

      <div className="cov-inner">
        <div className="cov-header">
          <div className="cov-logo">
            <div className="cov-logo-line">
              <span className="cov-title">Cal&nbsp;</span>
              <span className="cov-accent-word">Overview</span>
              <span className="cov-chip"><span className="cov-chip-dot" />live</span>
            </div>
            <div className="cov-sub">
              <b>{activeDays}</b> active days &nbsp;·&nbsp; <b>{monthCompleted}/{monthTotal}</b> tasks this period
            </div>
          </div>
          <div className="cov-controls">
            <ViewTabs view={view} setView={setView} />
            <div className="cov-nav">
              <button className="cov-nav-btn" onClick={goPrev}><ChevronLeft size={14} /></button>
              <span className="cov-nav-label">{monthLabel}</span>
              <button className="cov-nav-btn" onClick={goNext}><ChevronRight size={14} /></button>
              <button className="cov-today-btn" onClick={goToday}>Today</button>
            </div>
          </div>
        </div>

        <div className="cov-metrics">
          <MetricCard label="Completion" value={`${completionRate}%`} sub={`${monthCompleted}/${monthTotal}`} icon={Target} mv={compMv} />
          <MetricCard label="Active Days" value={activeDays} sub="this period" icon={Activity} mv="sky" />
          <MetricCard label="Streak" value={`${curStreak}d`} sub={`best ${bestStreak}d`} icon={Flame} mv={streakMv} />
          <MetricCard label="Perfect" value={perfectDays} sub="all tasks done" icon={Award} mv={perfectDays >= 5 ? "lime" : "violet"} />
        </div>

        <hr className="cov-hr" />

        {view === "month" && (
          <MonthView viewYear={viewYear} viewMonth={viewMonth} dayStats={dayStats}
            recurringCount={recurringCount} onSelect={handleSelect} onHover={handleHover} />
        )}
        {view === "year" && <YearView viewYear={viewYear} dayStats={dayStats} />}
        {view === "week" && <WeekView allTasks={allTasks} dayStats={dayStats} onSelect={handleSelect} />}
      </div>
    </div>
  );
}