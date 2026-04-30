import { Task } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  Play, Pause, Plus, Clock, Check, ChevronDown, ChevronRight,
  ChevronLeft, Pencil, Trash2, GripVertical, X, Save, CalendarDays,
  RotateCcw, Search, Filter, SortAsc, Tag, Zap, AlertTriangle,
  Circle, CheckCircle2, BarChart2, Flame, Star, Copy, Archive,
  MoreHorizontal, Bell, Hash,
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PriorityLevel = "high" | "medium" | "low";
type SortKey = "time" | "priority" | "name" | "streak" | "duration";
type FilterStatus = "all" | "pending" | "done" | "recurring" | "running";

interface TaskListViewProps {
  tasks: Task[];
  selectedDate: string;
  onPickDate: (date: string) => void;
  onGoToPrev: () => void;
  onGoToNext: () => void;
  onGoToToday: () => void;
  onToggleComplete: (taskId: string) => void;
  onToggleSubTask: (taskId: string) => void;
  onToggleTimer: (taskId: string) => void;
  onAddTask: (
    name: string, category: string, startTime: string, endTime: string,
    subTaskName?: string, recurring?: boolean, taskDate?: string,
    priority?: PriorityLevel, notes?: string, tags?: string[],
  ) => void;
  onEditTask: (
    taskId: string,
    updates: Partial<Pick<Task, "name" | "category" | "startTime" | "endTime" | "recurring">>,
    subTaskName?: string,
    priority?: PriorityLevel,
    notes?: string,
    tags?: string[],
  ) => void;
  onDeleteTask: (taskId: string) => void;
  onDuplicateTask?: (taskId: string) => void;
  onArchiveTask?: (taskId: string) => void;
  onReorderTasks: (fromIndex: number, toIndex: number) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["General", "Work", "Health", "Growth", "Planning"] as const;

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Work:     { bg: "bg-blue-500/8",    text: "text-blue-600 dark:text-blue-400",    border: "border-blue-500/20",    dot: "bg-blue-500" },
  Health:   { bg: "bg-emerald-500/8", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20", dot: "bg-emerald-500" },
  Growth:   { bg: "bg-amber-500/8",   text: "text-amber-600 dark:text-amber-400",   border: "border-amber-500/20",   dot: "bg-amber-500" },
  Planning: { bg: "bg-purple-500/8",  text: "text-purple-600 dark:text-purple-400",  border: "border-purple-500/20",  dot: "bg-purple-500" },
  General:  { bg: "bg-slate-500/8",   text: "text-slate-600 dark:text-slate-400",   border: "border-slate-500/20",   dot: "bg-slate-500" },
};

const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; color: string; bg: string; stripe: string; icon: React.ReactNode }> = {
  high:   { label: "High",   color: "text-destructive", bg: "bg-destructive/10",  stripe: "bg-destructive",        icon: <AlertTriangle className="w-3 h-3" /> },
  medium: { label: "Medium", color: "text-amber-500",   bg: "bg-amber-500/10",    stripe: "bg-amber-500",          icon: <Zap className="w-3 h-3" /> },
  low:    { label: "Low",    color: "text-slate-400",   bg: "bg-slate-500/10",    stripe: "bg-slate-400",          icon: <Circle className="w-3 h-3" /> },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return {
    day: d.getDate(),
    month: d.toLocaleDateString("en-US", { month: "short" }),
    monthLong: d.toLocaleDateString("en-US", { month: "long" }),
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
    weekdayLong: d.toLocaleDateString("en-US", { weekday: "long" }),
    year: d.getFullYear(),
  };
}

function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${String(m).padStart(2, "0")} ${ap}`;
}

function fmtDuration(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
}

function fmtSeconds(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function inferPriority(task: Task): PriorityLevel {
  const p = (task as any).priority as PriorityLevel | undefined;
  if (p && PRIORITY_CONFIG[p]) return p;
  return "medium";
}

function getCatStyle(cat: string) {
  return CATEGORY_STYLES[cat] ?? CATEGORY_STYLES.General;
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function DayStatsBar({ tasks }: { tasks: Task[] }) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const tracked = tasks.reduce((a, t) => a + (t.totalTime ?? 0), 0);
  const running = tasks.filter((t) => t.timerRunning).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const bestStreak = tasks.reduce((a, t) => Math.max(a, t.streak), 0);

  return (
    <div className="space-y-2 pt-3 border-t border-border/50">
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Tasks", value: `${done}/${total}`, icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-primary" },
          { label: "Tracked", value: tracked > 0 ? fmtSeconds(tracked) : "—", icon: <Clock className="w-3.5 h-3.5" />, color: "text-emerald-500" },
          { label: "Active", value: running > 0 ? `${running}` : "—", icon: <Play className="w-3.5 h-3.5" />, color: "text-amber-500" },
          { label: "Best streak", value: `${bestStreak}🔥`, icon: <Flame className="w-3.5 h-3.5" />, color: "text-orange-500" },
        ].map((s) => (
          <div key={s.label} className="bg-muted/60 rounded-lg px-2.5 py-2 flex items-center gap-1.5">
            <span className={s.color}>{s.icon}</span>
            <div>
              <p className="text-xs font-semibold tabular-nums text-foreground leading-none">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-0.5">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Day progress</span><span className="font-medium text-foreground">{pct}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full", cfg.bg, cfg.color)}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ─── Tag Chips ────────────────────────────────────────────────────────────────

function TagList({ tags }: { tags: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/20">
          <Hash className="w-2.5 h-2.5" />{tag}
        </span>
      ))}
    </div>
  );
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

function TaskContextMenu({
  task, onEdit, onDelete, onDuplicate, onArchive, onClose,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onArchive?: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 top-8 z-50 w-44 bg-card border border-border rounded-xl shadow-lg py-1 overflow-hidden">
      {[
        { icon: <Pencil className="w-3.5 h-3.5" />, label: "Edit task", action: () => { onEdit(); onClose(); } },
        ...(onDuplicate ? [{ icon: <Copy className="w-3.5 h-3.5" />, label: "Duplicate", action: () => { onDuplicate(); onClose(); } }] : []),
        ...(onArchive ? [{ icon: <Archive className="w-3.5 h-3.5" />, label: "Archive", action: () => { onArchive(); onClose(); } }] : []),
        { icon: <Trash2 className="w-3.5 h-3.5" />, label: "Delete", action: () => { onDelete(); onClose(); }, danger: true },
      ].map((item) => (
        <button
          key={item.label}
          onClick={item.action}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors",
            (item as any).danger
              ? "text-destructive hover:bg-destructive/10"
              : "text-foreground hover:bg-muted",
          )}
        >
          {item.icon}{item.label}
        </button>
      ))}
    </div>
  );
}

// ─── Add / Edit Form ──────────────────────────────────────────────────────────

interface TaskFormProps {
  mode: "add" | "edit";
  initialValues?: {
    name: string; category: string; startTime: string; endTime: string;
    subTask: string; recurring: boolean; taskDate: string;
    priority: PriorityLevel; notes: string; tags: string;
  };
  selectedDate: string;
  onSubmit: (values: {
    name: string; category: string; startTime: string; endTime: string;
    subTask: string; recurring: boolean; taskDate: string;
    priority: PriorityLevel; notes: string; tags: string[];
  }) => void;
  onCancel: () => void;
}

function TaskForm({ mode, initialValues, selectedDate, onSubmit, onCancel }: TaskFormProps) {
  const tomorrowDate = addDays(selectedDate, 1);
  const [name, setName] = useState(initialValues?.name ?? "");
  const [category, setCategory] = useState(initialValues?.category ?? "General");
  const [startTime, setStartTime] = useState(initialValues?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(initialValues?.endTime ?? "10:00");
  const [subTask, setSubTask] = useState(initialValues?.subTask ?? "");
  const [recurring, setRecurring] = useState(initialValues?.recurring ?? false);
  const [taskDate, setTaskDate] = useState(initialValues?.taskDate ?? selectedDate);
  const [priority, setPriority] = useState<PriorityLevel>(initialValues?.priority ?? "medium");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [tags, setTags] = useState(initialValues?.tags ?? "");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(), category, startTime, endTime,
      subTask: subTask.trim(), recurring, taskDate, priority,
      notes: notes.trim(),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
  };

  const inputCls = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-3">
      {/* Row 1: Name + Category */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
        <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} placeholder="Task name..." className={inputCls} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={cn(inputCls, "sm:w-36")}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Row 2: Times + Priority */}
      <div className="grid grid-cols-3 gap-3">
        <div><label className="text-xs text-muted-foreground mb-1 block">Start time</label><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} /></div>
        <div><label className="text-xs text-muted-foreground mb-1 block">End time</label><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} /></div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as PriorityLevel)} className={inputCls}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Row 3: Date shortcuts */}
      {mode === "add" && (
        <div className="flex items-center gap-2">
          <input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} className={cn(inputCls, "flex-1")} />
          <button type="button" onClick={() => setTaskDate(selectedDate)} className="px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors whitespace-nowrap">Today</button>
          <button type="button" onClick={() => setTaskDate(tomorrowDate)} className="px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors whitespace-nowrap">Tomorrow</button>
        </div>
      )}

      {/* Advanced toggle */}
      <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        {showAdvanced ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        Advanced options
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground mb-1 block">Sub-task</label><input value={subTask} onChange={(e) => setSubTask(e.target.value)} placeholder="Add a sub-task..." className={inputCls} /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Tags (comma-separated)</label><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="focus, important..." className={inputCls} /></div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes..." rows={2} className={cn(inputCls, "resize-none")} /></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="w-4 h-4 rounded border-input accent-primary" />
          <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" /> Repeat daily
        </label>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <button onClick={handleSubmit} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1">
            <Save className="w-3.5 h-3.5" /> {mode === "add" ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task, index, isExpanded, isEditing, selectedDate,
  onToggleComplete, onToggleSubTask, onToggleTimer,
  onEdit, onSaveEdit, onCancelEdit, onDelete, onDuplicate, onArchive,
  onToggleExpand,
}: {
  task: Task; index: number; isExpanded: boolean; isEditing: boolean; selectedDate: string;
  onToggleComplete: () => void; onToggleSubTask: () => void; onToggleTimer: () => void;
  onEdit: () => void; onSaveEdit: (values: any) => void; onCancelEdit: () => void;
  onDelete: () => void; onDuplicate?: () => void; onArchive?: () => void;
  onToggleExpand: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const catStyle = getCatStyle(task.category);
  const priority = inferPriority(task);
  const { day: tDay, month: tMonth } = formatDateFull(task.date);
  const tags = (task as any).tags as string[] | undefined;
  const notes = (task as any).notes as string | undefined;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className={cn(
        "relative bg-card border rounded-xl overflow-hidden transition-colors",
        task.completed ? "border-success/20 bg-success/3" : "border-border hover:border-border/80",
        task.timerRunning && "ring-2 ring-primary/30 border-primary/40",
        isEditing && "ring-2 ring-ring",
      )}
    >
      {/* Priority stripe */}
      <div className={cn("absolute left-0 inset-y-0 w-0.5", PRIORITY_CONFIG[priority].stripe, task.completed && "opacity-30")} />

      {isEditing ? (
        <div className="p-4">
          <TaskForm
            mode="edit"
            initialValues={{
              name: task.name,
              category: task.category,
              startTime: task.startTime,
              endTime: task.endTime,
              subTask: task.subTask?.name ?? "",
              recurring: task.recurring ?? false,
              taskDate: task.date,
              priority: inferPriority(task),
              notes: (task as any).notes ?? "",
              tags: ((task as any).tags as string[] | undefined)?.join(", ") ?? "",
            }}
            selectedDate={selectedDate}
            onSubmit={onSaveEdit}
            onCancel={onCancelEdit}
          />
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 pl-4">
            {/* Drag handle */}
            <GripVertical className="hidden sm:block w-4 h-4 text-muted-foreground/30 shrink-0 mt-1 cursor-grab" />

            {/* Date badge */}
            <div className="text-center min-w-[36px] shrink-0">
              <span className="text-[10px] font-medium text-muted-foreground block leading-none">{tMonth}</span>
              <span className="text-base font-bold text-foreground leading-tight">{tDay}</span>
            </div>

            <div className="w-px self-stretch bg-border/50 shrink-0 mx-0.5" />

            {/* Checkbox */}
            <button
              onClick={onToggleComplete}
              className={cn(
                "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                task.completed ? "bg-success border-success text-success-foreground" : "border-muted-foreground/30 hover:border-primary",
              )}
            >
              {task.completed && <Check className="w-3 h-3" />}
            </button>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={cn("text-sm font-medium", task.completed ? "line-through text-muted-foreground" : "text-foreground")}>
                  {task.name}
                </span>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md font-medium", catStyle.bg, catStyle.text)}>
                  {task.category}
                </span>
                {task.recurring && <RotateCcw className="w-3 h-3 text-primary/60" title="Recurring" />}
                {(task as any).reminder && <Bell className="w-3 h-3 text-amber-500/70" title="Reminder set" />}
                <PriorityBadge priority={priority} />
              </div>

              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />{fmt12(task.startTime)} – {fmt12(task.endTime)}
                </span>
                {fmtDuration(task.startTime, task.endTime) && (
                  <span className="text-xs text-primary font-medium">{fmtDuration(task.startTime, task.endTime)}</span>
                )}
                {task.totalTime > 0 && (
                  <span className="text-xs text-success font-medium flex items-center gap-0.5">
                    <BarChart2 className="w-3 h-3" />{fmtSeconds(task.totalTime)} tracked
                  </span>
                )}
                {task.timerRunning && (
                  <span className="text-xs text-primary font-medium flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />running
                  </span>
                )}
              </div>

              {tags && tags.length > 0 && <TagList tags={tags} />}

              {notes && (
                <p className="text-xs text-muted-foreground mt-1 italic truncate max-w-xs">"{notes}"</p>
              )}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              {/* Timer */}
              <button
                onClick={onToggleTimer}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  task.timerRunning
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
                title={task.timerRunning ? "Pause timer" : "Start timer"}
              >
                {task.timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              {/* Streak */}
              <span className={cn(
                "text-xs font-bold px-1.5 py-0.5 rounded-md",
                task.streak >= 7 ? "text-orange-500 bg-orange-500/10" :
                task.streak >= 3 ? "text-amber-500 bg-amber-500/10" :
                "text-muted-foreground",
              )}>
                {task.streak >= 3 ? `${task.streak}🔥` : task.streak > 0 ? `${task.streak}` : ""}
              </span>

              {/* Sub-task expander */}
              {(task.subTask || notes) && (
                <button onClick={onToggleExpand} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              )}

              {/* More menu */}
              <div className="relative">
                <button onClick={() => setShowMenu((v) => !v)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.1 }}>
                      <TaskContextMenu
                        task={task}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onDuplicate={onDuplicate}
                        onArchive={onArchive}
                        onClose={() => setShowMenu(false)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Expanded: sub-task + notes */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 space-y-2 border-t border-border/40 pt-2.5 ml-12">
                  {task.subTask && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/40">
                      <button
                        onClick={onToggleSubTask}
                        className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                          task.subTask.completed ? "bg-success border-success text-success-foreground" : "border-muted-foreground/30 hover:border-primary",
                        )}
                      >
                        {task.subTask.completed && <Check className="w-2.5 h-2.5" />}
                      </button>
                      <span className={cn("text-xs", task.subTask.completed ? "line-through text-muted-foreground" : "text-foreground")}>
                        {task.subTask.name}
                      </span>
                    </div>
                  )}
                  {notes && (
                    <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 border border-border/40 italic">
                      {notes}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TaskListView({
  tasks, selectedDate, onPickDate, onGoToPrev, onGoToNext, onGoToToday,
  onToggleComplete, onToggleSubTask, onToggleTimer,
  onAddTask, onEditTask, onDeleteTask, onDuplicateTask, onArchiveTask, onReorderTasks,
}: TaskListViewProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(true);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const dateInfo = formatDateFull(selectedDate);
  const isTodaySelected = selectedDate === todayStr();
  const categories = useMemo(() => ["all", ...new Set(tasks.map((t) => t.category))], [tasks]);

  // ── Filter + sort
  const visibleTasks = useMemo(() => {
    let result = [...tasks];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        ((t as any).tags as string[] | undefined)?.some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    if (filterCategory !== "all") result = result.filter((t) => t.category === filterCategory);
    if (filterStatus === "pending")   result = result.filter((t) => !t.completed);
    if (filterStatus === "done")      result = result.filter((t) => t.completed);
    if (filterStatus === "recurring") result = result.filter((t) => t.recurring);
    if (filterStatus === "running")   result = result.filter((t) => t.timerRunning);

    const prioOrder: Record<PriorityLevel, number> = { high: 0, medium: 1, low: 2 };
    if (sortKey === "time")     result.sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (sortKey === "priority") result.sort((a, b) => prioOrder[inferPriority(a)] - prioOrder[inferPriority(b)]);
    if (sortKey === "name")     result.sort((a, b) => a.name.localeCompare(b.name));
    if (sortKey === "streak")   result.sort((a, b) => b.streak - a.streak);
    if (sortKey === "duration") {
      result.sort((a, b) => {
        const dur = (t: Task) => {
          const [sh, sm] = t.startTime.split(":").map(Number);
          const [eh, em] = t.endTime.split(":").map(Number);
          return (eh * 60 + em) - (sh * 60 + sm);
        };
        return dur(b) - dur(a);
      });
    }
    return result;
  }, [tasks, search, filterCategory, filterStatus, sortKey]);

  const handleDragStart = (i: number) => { dragItem.current = i; };
  const handleDragEnter = (i: number) => { dragOverItem.current = i; };
  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      onReorderTasks(dragItem.current, dragOverItem.current);
    }
    dragItem.current = null; dragOverItem.current = null;
  };

  const handleAddSubmit = useCallback((values: any) => {
    onAddTask(values.name, values.category, values.startTime, values.endTime,
      values.subTask || undefined, values.recurring, values.taskDate,
      values.priority, values.notes, values.tags);
    setShowAdd(false);
  }, [onAddTask]);

  const handleEditSubmit = useCallback((taskId: string) => (values: any) => {
    onEditTask(taskId, {
      name: values.name, category: values.category,
      startTime: values.startTime, endTime: values.endTime,
      recurring: values.recurring,
    }, values.subTask || undefined, values.priority, values.notes, values.tags);
    setEditingTask(null);
  }, [onEditTask]);

  return (
    <div className="space-y-3">

      {/* ── Header ── */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          {/* Date nav */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={onGoToPrev} className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-primary/10 rounded-xl p-2.5 text-center min-w-[52px] shrink-0">
                <span className="text-xl font-bold text-primary block leading-none">{dateInfo.day}</span>
                <span className="text-[10px] font-medium text-primary/70 mt-0.5 block">{dateInfo.month}</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-base sm:text-lg leading-snug truncate">
                  {isTodaySelected ? "Today's Tasks" : `${dateInfo.weekdayLong}'s Tasks`}
                </h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {dateInfo.weekdayLong}, {dateInfo.monthLong} {dateInfo.day} · {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button onClick={onGoToNext} className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors cursor-pointer">
              <CalendarDays className="w-3.5 h-3.5" /> Pick date
              <input type="date" value={selectedDate} onChange={(e) => e.target.value && onPickDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
            </label>
            {!isTodaySelected && (
              <button onClick={onGoToToday} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors">
                <CalendarDays className="w-3.5 h-3.5" /> Today
              </button>
            )}
            <button
              onClick={() => setShowStats((v) => !v)}
              className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors", showStats ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground")}
            >
              <BarChart2 className="w-3.5 h-3.5" /> Stats
            </button>
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" /> Add Task
            </button>
          </div>
        </div>

        {/* Stats */}
        <AnimatePresence>
          {showStats && tasks.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <DayStatsBar tasks={tasks} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Add Task Form ── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> New Task
              </h4>
              <TaskForm
                mode="add"
                selectedDate={selectedDate}
                onSubmit={handleAddSubmit}
                onCancel={() => setShowAdd(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Search + Filters ── */}
      <div className="bg-card border border-border rounded-xl p-3 space-y-2.5">
        {/* Search row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks, categories, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all", showFilters ? "border-primary bg-primary/10 text-primary" : "border-input bg-background text-muted-foreground hover:text-foreground")}
          >
            <Filter className="w-3.5 h-3.5" /> Filters
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="space-y-2 pt-1">
                {/* Status tabs */}
                <div className="flex gap-1 flex-wrap">
                  {(["all", "pending", "done", "recurring", "running"] as FilterStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all",
                        filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Category + Sort */}
                <div className="flex gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-muted-foreground" />
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="text-xs border border-input bg-background text-foreground rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring">
                      {categories.map((c) => <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <SortAsc className="w-3 h-3 text-muted-foreground" />
                    <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="text-xs border border-input bg-background text-foreground rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="time">Sort: Time</option>
                      <option value="priority">Sort: Priority</option>
                      <option value="name">Sort: Name</option>
                      <option value="streak">Sort: Streak</option>
                      <option value="duration">Sort: Duration</option>
                    </select>
                  </div>
                  {(filterStatus !== "all" || filterCategory !== "all" || search) && (
                    <button
                      onClick={() => { setFilterStatus("all"); setFilterCategory("all"); setSearch(""); }}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results count */}
        {(search || filterStatus !== "all" || filterCategory !== "all") && (
          <p className="text-[10px] text-muted-foreground">
            Showing {visibleTasks.length} of {tasks.length} tasks
          </p>
        )}
      </div>

      {/* ── Task List ── */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {visibleTasks.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-xl p-10 text-center">
              <CalendarDays className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                {tasks.length === 0 ? "No tasks yet — click Add Task to get started." : "No tasks match your filters."}
              </p>
              {tasks.length > 0 && (
                <button onClick={() => { setFilterStatus("all"); setFilterCategory("all"); setSearch(""); }} className="mt-2 text-xs text-primary hover:underline">
                  Clear filters
                </button>
              )}
            </motion.div>
          ) : (
            visibleTasks.map((task, i) => (
              <div
                key={task.id}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragEnter={() => handleDragEnter(i)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
              >
                <TaskCard
                  task={task}
                  index={i}
                  isExpanded={expandedTask === task.id}
                  isEditing={editingTask === task.id}
                  selectedDate={selectedDate}
                  onToggleComplete={() => onToggleComplete(task.id)}
                  onToggleSubTask={() => onToggleSubTask(task.id)}
                  onToggleTimer={() => onToggleTimer(task.id)}
                  onEdit={() => setEditingTask(task.id)}
                  onSaveEdit={handleEditSubmit(task.id)}
                  onCancelEdit={() => setEditingTask(null)}
                  onDelete={() => onDeleteTask(task.id)}
                  onDuplicate={onDuplicateTask ? () => onDuplicateTask(task.id) : undefined}
                  onArchive={onArchiveTask ? () => onArchiveTask(task.id) : undefined}
                  onToggleExpand={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                />
              </div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}