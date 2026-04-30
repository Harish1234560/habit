import { Task } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import {
  CalendarDays, ChevronDown, ChevronUp, Clock, Filter,
  LayoutGrid, List, StickyNote, TrendingUp, Zap,
  CheckCircle2, Circle, AlertTriangle, Coffee, Sun,
  Sunset, Moon, Search, Tag, Download, BarChart2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "timeline" | "grid" | "kanban";
type GroupBy = "time-of-day" | "category" | "priority" | "status";
type SortBy = "time" | "priority" | "name" | "duration";
type PriorityLevel = "high" | "medium" | "low";

interface PlanningViewProps {
  tasks: Task[];
  selectedDate?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 56; // px per hour in timeline
const TIMELINE_START = 6; // 6 AM
const TIMELINE_END = 23; // 11 PM

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Work:     { bg: "bg-blue-500/10",   text: "text-blue-600 dark:text-blue-400",   border: "border-blue-500/30" },
  Health:   { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" },
  Growth:   { bg: "bg-amber-500/10",  text: "text-amber-600 dark:text-amber-400",  border: "border-amber-500/30" },
  Planning: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/30" },
  General:  { bg: "bg-slate-500/10",  text: "text-slate-600 dark:text-slate-400",  border: "border-slate-500/30" },
};

const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; color: string; dot: string; icon: React.ReactNode }> = {
  high:   { label: "High",   color: "text-destructive", dot: "bg-destructive",   icon: <AlertTriangle className="w-3 h-3" /> },
  medium: { label: "Medium", color: "text-warning",     dot: "bg-warning",       icon: <Zap className="w-3 h-3" /> },
  low:    { label: "Low",    color: "text-muted-foreground", dot: "bg-muted-foreground", icon: <Circle className="w-3 h-3" /> },
};

const TIME_BLOCKS = [
  { id: "morning",   label: "Morning",   icon: <Sun className="w-3.5 h-3.5" />,     start: 6,  end: 12, color: "text-amber-500" },
  { id: "afternoon", label: "Afternoon", icon: <Coffee className="w-3.5 h-3.5" />,  start: 12, end: 17, color: "text-orange-500" },
  { id: "evening",   label: "Evening",   icon: <Sunset className="w-3.5 h-3.5" />,  start: 17, end: 20, color: "text-rose-500" },
  { id: "night",     label: "Night",     icon: <Moon className="w-3.5 h-3.5" />,    start: 20, end: 24, color: "text-indigo-500" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${String(m).padStart(2, "0")} ${ap}`;
}

function getDuration(start: string, end: string): number {
  return timeToMinutes(end) - timeToMinutes(start);
}

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
}

function inferPriority(task: Task): PriorityLevel {
  const p = (task as any).priority as PriorityLevel | undefined;
  if (p && PRIORITY_CONFIG[p]) return p;
  if (task.category === "Work" || task.recurring) return "high";
  if (task.category === "Health" || task.category === "Growth") return "medium";
  return "low";
}

function getTimeBlock(startTime: string) {
  const h = parseInt(startTime.split(":")[0], 10);
  return TIME_BLOCKS.find((b) => h >= b.start && h < b.end) ?? TIME_BLOCKS[0];
}

function getCategoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.General;
}

function exportCSV(tasks: Task[]) {
  const header = ["Name", "Category", "Start", "End", "Duration (min)", "Completed", "Streak"];
  const rows = tasks.map((t) => [
    `"${t.name}"`, t.category, t.startTime, t.endTime,
    getDuration(t.startTime, t.endTime), t.completed, t.streak,
  ]);
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "plan.csv";
  a.click();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TaskPill({ task, compact = false }: { task: Task; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const cat = getCategoryStyle(task.category);
  const priority = inferPriority(task);
  const dur = getDuration(task.startTime, task.endTime);

  return (
    <div
      onClick={() => setOpen((v) => !v)}
      className={cn(
        "group relative rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-sm",
        cat.bg, cat.border,
        task.completed && "opacity-60",
        compact ? "px-2.5 py-1.5" : "px-3 py-2.5",
      )}
    >
      {/* Priority stripe */}
      <div className={cn("absolute left-0 inset-y-0 w-0.5 rounded-l-lg", PRIORITY_CONFIG[priority].dot)} />

      <div className="flex items-center gap-2 pl-2">
        {task.completed
          ? <CheckCircle2 className={cn("w-3.5 h-3.5 shrink-0 text-success")} />
          : <Circle className={cn("w-3.5 h-3.5 shrink-0", cat.text)} />
        }
        <span className={cn("text-sm font-medium flex-1 min-w-0 truncate", task.completed && "line-through text-muted-foreground")}>
          {task.name}
        </span>
        {task.recurring && <span title="Recurring" className="text-primary opacity-60 text-xs">↺</span>}
        {task.streak >= 3 && <span className="text-xs">{task.streak >= 7 ? "🔥" : "⚡"}</span>}
        {!compact && (
          <span className={cn("text-xs shrink-0", cat.text)}>{fmtDuration(dur)}</span>
        )}
        <button className="shrink-0 text-muted-foreground">
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {open && (
        <div className="mt-2 pl-2 border-t border-border/40 pt-2 space-y-1.5">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> {fmt12(task.startTime)} – {fmt12(task.endTime)}
            </span>
            <span className={cn("text-xs flex items-center gap-1", PRIORITY_CONFIG[priority].color)}>
              {PRIORITY_CONFIG[priority].icon} {PRIORITY_CONFIG[priority].label} priority
            </span>
            <span className={cn("text-xs flex items-center gap-1", cat.text)}>
              <Tag className="w-3 h-3" /> {task.category}
            </span>
          </div>
          {task.totalTime > 0 && (
            <p className="text-xs text-success">⏱ {fmtDuration(Math.floor(task.totalTime / 60))} tracked</p>
          )}
          {task.subTask && (
            <p className={cn("text-xs", task.subTask.completed ? "line-through text-muted-foreground" : "text-foreground")}>
              └ {task.subTask.name}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Timeline View ────────────────────────────────────────────────────────────

function TimelineView({ tasks }: { tasks: Task[] }) {
  const hours = Array.from({ length: TIMELINE_END - TIMELINE_START }, (_, i) => TIMELINE_START + i);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowOffsetPx = ((nowMinutes - TIMELINE_START * 60) / 60) * HOUR_HEIGHT;

  const positionedTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        const h = parseInt(t.startTime.split(":")[0], 10);
        return h >= TIMELINE_START && h < TIMELINE_END;
      })
      .map((t) => {
        const startMin = timeToMinutes(t.startTime);
        const endMin = timeToMinutes(t.endTime);
        const top = ((startMin - TIMELINE_START * 60) / 60) * HOUR_HEIGHT;
        const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 24);
        return { task: t, top, height };
      });
  }, [tasks]);

  return (
    <div className="relative" style={{ height: `${(TIMELINE_END - TIMELINE_START) * HOUR_HEIGHT}px` }}>
      {/* Hour lines */}
      {hours.map((h) => (
        <div key={h} className="absolute inset-x-0 flex items-start gap-3" style={{ top: `${(h - TIMELINE_START) * HOUR_HEIGHT}px` }}>
          <span className="text-[10px] text-muted-foreground w-12 shrink-0 pt-px text-right select-none">
            {h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}
          </span>
          <div className="flex-1 border-t border-border/40 mt-1.5" />
        </div>
      ))}

      {/* Now line */}
      {nowOffsetPx > 0 && nowOffsetPx < (TIMELINE_END - TIMELINE_START) * HOUR_HEIGHT && (
        <div className="absolute inset-x-0 flex items-center gap-3 z-20 pointer-events-none" style={{ top: `${nowOffsetPx}px` }}>
          <span className="text-[10px] font-medium text-primary w-12 text-right">Now</span>
          <div className="flex-1 border-t-2 border-primary border-dashed" />
          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
        </div>
      )}

      {/* Task blocks */}
      <div className="absolute inset-x-0 pl-16">
        {positionedTasks.map(({ task, top, height }) => {
          const cat = getCategoryStyle(task.category);
          const priority = inferPriority(task);
          const dur = getDuration(task.startTime, task.endTime);
          return (
            <div
              key={task.id}
              className={cn(
                "absolute inset-x-2 rounded-lg border px-2.5 py-1.5 overflow-hidden",
                "transition-shadow hover:shadow-md cursor-default",
                cat.bg, cat.border,
                task.completed && "opacity-50",
              )}
              style={{ top: `${top}px`, height: `${height}px` }}
            >
              <div className={cn("absolute left-0 inset-y-0 w-1 rounded-l-lg", PRIORITY_CONFIG[priority].dot)} />
              <p className={cn("text-xs font-medium truncate pl-1.5", cat.text)}>{task.name}</p>
              {height >= 36 && (
                <p className="text-[10px] text-muted-foreground pl-1.5 truncate">{fmt12(task.startTime)} · {fmtDuration(dur)}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Grid View ────────────────────────────────────────────────────────────────

function GridView({ tasks, groupBy }: { tasks: Task[]; groupBy: GroupBy }) {
  const groups = useMemo(() => {
    if (groupBy === "time-of-day") {
      return TIME_BLOCKS.map((block) => ({
        id: block.id,
        label: block.label,
        icon: block.icon,
        color: block.color,
        tasks: tasks.filter((t) => {
          const h = parseInt(t.startTime.split(":")[0], 10);
          return h >= block.start && h < block.end;
        }),
      })).filter((g) => g.tasks.length > 0);
    }

    if (groupBy === "category") {
      const cats = [...new Set(tasks.map((t) => t.category))];
      return cats.map((cat) => {
        const style = getCategoryStyle(cat);
        return { id: cat, label: cat, icon: <Tag className="w-3.5 h-3.5" />, color: style.text, tasks: tasks.filter((t) => t.category === cat) };
      });
    }

    if (groupBy === "priority") {
      return (["high", "medium", "low"] as PriorityLevel[]).map((p) => ({
        id: p,
        label: PRIORITY_CONFIG[p].label,
        icon: PRIORITY_CONFIG[p].icon,
        color: PRIORITY_CONFIG[p].color,
        tasks: tasks.filter((t) => inferPriority(t) === p),
      })).filter((g) => g.tasks.length > 0);
    }

    // status
    return [
      { id: "pending",   label: "Pending",   icon: <Circle className="w-3.5 h-3.5" />,        color: "text-muted-foreground", tasks: tasks.filter((t) => !t.completed) },
      { id: "completed", label: "Completed", icon: <CheckCircle2 className="w-3.5 h-3.5" />,  color: "text-success",          tasks: tasks.filter((t) => t.completed) },
    ].filter((g) => g.tasks.length > 0);
  }, [tasks, groupBy]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {groups.map((group) => (
        <div key={group.id} className="bg-muted/40 rounded-xl border border-border p-4 space-y-2">
          <div className={cn("flex items-center gap-2 text-sm font-medium mb-3", group.color)}>
            {group.icon}
            <span>{group.label}</span>
            <span className="ml-auto text-xs text-muted-foreground bg-card border border-border rounded-full px-2 py-0.5">
              {group.tasks.length}
            </span>
          </div>
          {group.tasks.length === 0
            ? <p className="text-xs text-muted-foreground">No tasks</p>
            : group.tasks.map((t) => <TaskPill key={t.id} task={t} />)
          }
        </div>
      ))}
    </div>
  );
}

// ─── Kanban View ──────────────────────────────────────────────────────────────

function KanbanView({ tasks }: { tasks: Task[] }) {
  const columns = [
    { id: "todo",       label: "To Do",       color: "text-muted-foreground", tasks: tasks.filter((t) => !t.completed && !t.timerRunning) },
    { id: "in-progress",label: "In Progress", color: "text-primary",          tasks: tasks.filter((t) => t.timerRunning) },
    { id: "done",       label: "Done",        color: "text-success",          tasks: tasks.filter((t) => t.completed) },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 min-h-[320px]">
      {columns.map((col) => (
        <div key={col.id} className="flex flex-col gap-2 bg-muted/30 rounded-xl border border-border p-3">
          <div className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide mb-1", col.color)}>
            <span>{col.label}</span>
            <span className="ml-auto bg-card border border-border rounded-full px-1.5 py-0.5 text-muted-foreground font-normal">
              {col.tasks.length}
            </span>
          </div>
          {col.tasks.map((t) => <TaskPill key={t.id} task={t} compact />)}
          {col.tasks.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-muted-foreground/50">Empty</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ tasks }: { tasks: Task[] }) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const totalMins = tasks.reduce((a, t) => a + getDuration(t.startTime, t.endTime), 0);
  const trackedSecs = tasks.reduce((a, t) => a + (t.totalTime ?? 0), 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const highPriority = tasks.filter((t) => inferPriority(t) === "high" && !t.completed).length;

  const stats = [
    { label: "Tasks", value: `${done}/${total}`, icon: <CheckCircle2 className="w-4 h-4" />, color: "text-primary" },
    { label: "Planned", value: fmtDuration(totalMins), icon: <Clock className="w-4 h-4" />, color: "text-amber-500" },
    { label: "Tracked", value: fmtDuration(Math.floor(trackedSecs / 60)), icon: <BarChart2 className="w-4 h-4" />, color: "text-emerald-500" },
    { label: "Urgent", value: String(highPriority), icon: <AlertTriangle className="w-4 h-4" />, color: "text-destructive" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-muted/50 rounded-xl border border-border px-3 py-2.5 flex items-center gap-2.5">
            <span className={s.color}>{s.icon}</span>
            <div>
              <p className="text-sm font-semibold tabular-nums text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Day completion</span>
          <span className="font-medium text-foreground">{pct}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-primary to-primary/70"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Category Breakdown ───────────────────────────────────────────────────────

function CategoryBreakdown({ tasks }: { tasks: Task[] }) {
  const cats = useMemo(() => {
    const map = new Map<string, { total: number; done: number; mins: number }>();
    tasks.forEach((t) => {
      const prev = map.get(t.category) ?? { total: 0, done: 0, mins: 0 };
      map.set(t.category, {
        total: prev.total + 1,
        done: prev.done + (t.completed ? 1 : 0),
        mins: prev.mins + getDuration(t.startTime, t.endTime),
      });
    });
    return Array.from(map.entries()).map(([cat, v]) => ({ cat, ...v }));
  }, [tasks]);

  if (!cats.length) return null;

  return (
    <div className="space-y-2">
      {cats.map(({ cat, total, done, mins }) => {
        const style = getCategoryStyle(cat);
        const pct = Math.round((done / total) * 100);
        return (
          <div key={cat} className="flex items-center gap-3">
            <span className={cn("text-xs font-medium w-20 shrink-0", style.text)}>{cat}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", style.text.replace("text-", "bg-").replace("/10", ""))} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-muted-foreground w-12 text-right shrink-0">{fmtDuration(mins)}</span>
            <span className="text-xs text-muted-foreground w-10 text-right shrink-0">{done}/{total}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PlanningView({ tasks, selectedDate }: PlanningViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [groupBy, setGroupBy] = useState<GroupBy>("time-of-day");
  const [sortBy, setSortBy] = useState<SortBy>("time");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "done">("all");
  const [showBreakdown, setShowBreakdown] = useState(false);

  const categories = useMemo(() => ["all", ...new Set(tasks.map((t) => t.category))], [tasks]);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    if (filterCategory !== "all") result = result.filter((t) => t.category === filterCategory);
    if (filterStatus === "pending") result = result.filter((t) => !t.completed);
    if (filterStatus === "done") result = result.filter((t) => t.completed);

    if (sortBy === "time")     result.sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (sortBy === "priority") {
      const order: Record<PriorityLevel, number> = { high: 0, medium: 1, low: 2 };
      result.sort((a, b) => order[inferPriority(a)] - order[inferPriority(b)]);
    }
    if (sortBy === "name")     result.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "duration") result.sort((a, b) => getDuration(b.startTime, b.endTime) - getDuration(a.startTime, a.endTime));

    return result;
  }, [tasks, search, filterCategory, filterStatus, sortBy]);

  return (
    <div className="space-y-4">

      {/* Stats */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Day Overview
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBreakdown((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              {showBreakdown ? "Hide" : "Breakdown"}
            </button>
            <button
              onClick={() => exportCSV(filteredTasks)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>
        <StatsBar tasks={filteredTasks} />
        {showBreakdown && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">By category</p>
            <CategoryBreakdown tasks={filteredTasks} />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* View mode + filters row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode tabs */}
          <div className="flex gap-1 p-1 rounded-lg bg-muted">
            {([
              { mode: "timeline" as ViewMode, icon: <List className="w-3.5 h-3.5" />,        label: "Timeline" },
              { mode: "grid"     as ViewMode, icon: <LayoutGrid className="w-3.5 h-3.5" />,  label: "Grid" },
              { mode: "kanban"   as ViewMode, icon: <StickyNote className="w-3.5 h-3.5" />,  label: "Kanban" },
            ]).map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                  viewMode === mode
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-1 p-1 rounded-lg bg-muted">
            {(["all", "pending", "done"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-all",
                  filterStatus === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1 ml-auto">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs border border-input bg-background text-foreground rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort + Group row (context-sensitive) */}
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span>Sort:</span>
            {(["time", "priority", "name", "duration"] as SortBy[]).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={cn(
                  "px-2 py-0.5 rounded-md capitalize transition-colors",
                  sortBy === s ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted",
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {viewMode === "grid" && (
            <div className="flex items-center gap-1.5 ml-auto">
              <span>Group:</span>
              {(["time-of-day", "category", "priority", "status"] as GroupBy[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupBy(g)}
                  className={cn(
                    "px-2 py-0.5 rounded-md capitalize transition-colors",
                    groupBy === g ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted",
                  )}
                >
                  {g === "time-of-day" ? "time" : g}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main view */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            {viewMode === "timeline" ? "Daily Timeline" : viewMode === "grid" ? "Task Grid" : "Kanban Board"}
          </h3>
          <span className="text-xs text-muted-foreground">{filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}</span>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarDays className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No tasks match your filters.</p>
          </div>
        ) : viewMode === "timeline" ? (
          <div className="overflow-y-auto max-h-[600px] pr-1">
            <TimelineView tasks={filteredTasks} />
          </div>
        ) : viewMode === "grid" ? (
          <GridView tasks={filteredTasks} groupBy={groupBy} />
        ) : (
          <KanbanView tasks={filteredTasks} />
        )}
      </div>
    </div>
  );
}