import { Task } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Play, Pause, Plus, Clock, Check, ChevronDown, ChevronRight, ChevronLeft, Pencil, Trash2, GripVertical, X, Save, CalendarDays, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";

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
  onAddTask: (name: string, category: string, startTime: string, endTime: string, subTaskName?: string, recurring?: boolean, taskDate?: string) => void;
  onEditTask: (taskId: string, updates: Partial<Pick<Task, "name" | "category" | "startTime" | "endTime" | "recurring">>, subTaskName?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onReorderTasks: (fromIndex: number, toIndex: number) => void;
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

function formatDuration(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m > 0 ? m + "m" : ""}` : `${m}m`;
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatSeconds(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function isToday(dateStr: string) {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return dateStr === `${year}-${month}-${day}`;
}

function addDaysToDate(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function TaskListView({ tasks, selectedDate, onPickDate, onGoToPrev, onGoToNext, onGoToToday, onToggleComplete, onToggleSubTask, onToggleTimer, onAddTask, onEditTask, onDeleteTask, onReorderTasks }: TaskListViewProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [newSubTask, setNewSubTask] = useState("");
  const [newRecurring, setNewRecurring] = useState(false);
  const [newTaskDate, setNewTaskDate] = useState(selectedDate);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editSubTask, setEditSubTask] = useState("");
  const [editRecurring, setEditRecurring] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const tomorrowDate = addDaysToDate(selectedDate, 1);

  useEffect(() => {
    if (!showAdd) {
      setNewTaskDate(selectedDate);
    }
  }, [selectedDate, showAdd]);

  const handleAdd = () => {
    if (newName.trim()) {
      onAddTask(newName.trim(), newCategory, newStart, newEnd, newSubTask.trim() || undefined, newRecurring, newTaskDate);
      setNewName(""); setNewSubTask(""); setShowAdd(false); setNewRecurring(false); setNewTaskDate(selectedDate);
    }
  };

  const startEdit = (task: Task) => {
    setEditingTask(task.id);
    setEditName(task.name);
    setEditCategory(task.category);
    setEditStart(task.startTime);
    setEditEnd(task.endTime);
    setEditSubTask(task.subTask?.name || "");
    setEditRecurring(task.recurring || false);
  };

  const saveEdit = (taskId: string) => {
    onEditTask(taskId, { name: editName, category: editCategory, startTime: editStart, endTime: editEnd, recurring: editRecurring }, editSubTask || undefined);
    setEditingTask(null);
  };

  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; };
  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      onReorderTasks(dragItem.current, dragOverItem.current);
    }
    dragItem.current = null; dragOverItem.current = null;
  };

  const dateInfo = formatDateFull(selectedDate);
  const isTodaySelected = isToday(selectedDate);

  return (
    <div className="space-y-4">
      {/* Date Navigation Header */}
      <div className="bg-card border border-border rounded-xl p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={onGoToPrev} className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="bg-primary/10 rounded-xl p-2 sm:p-3 text-center min-w-[56px] sm:min-w-[64px]">
                <span className="text-2xl font-heading font-bold text-primary block">{dateInfo.day}</span>
                <span className="text-xs font-medium text-primary/70">{dateInfo.month}</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-heading font-semibold text-foreground text-base sm:text-lg truncate">
                  {isTodaySelected ? "Today's Tasks" : `${dateInfo.weekdayLong}'s Tasks`}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {dateInfo.weekdayLong}, {dateInfo.monthLong} {dateInfo.day}, {dateInfo.year} • {tasks.length} tasks
                </p>
              </div>
            </div>
            <button onClick={onGoToNext} className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-sm w-full sm:w-auto">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">Pick date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) onPickDate(e.target.value);
                }}
                className="rounded-md border border-input bg-background px-2 py-1 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring min-w-0 flex-1 sm:flex-none"
              />
            </div>
            {!isTodaySelected && (
              <button onClick={onGoToToday} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
                <CalendarDays className="w-4 h-4" /> Today
              </button>
            )}
            <button onClick={() => setShowAdd(!showAdd)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto">
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Add Task Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-card border border-border rounded-xl p-4 md:p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Task name..." className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option>General</option><option>Work</option><option>Health</option><option>Growth</option><option>Planning</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><label className="text-xs text-muted-foreground mb-1 block">Start Time</label><input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">End Time</label><input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Sub-task (optional)</label><input value={newSubTask} onChange={(e) => setNewSubTask(e.target.value)} placeholder="Sub-task..." className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Task Date</label>
                  <input
                    type="date"
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex gap-2 pb-0.5">
                  <button
                    type="button"
                    onClick={() => setNewTaskDate(selectedDate)}
                    className="px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTaskDate(tomorrowDate)}
                    className="px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                  >
                    Tomorrow
                  </button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="checkbox" checked={newRecurring} onChange={(e) => setNewRecurring(e.target.checked)} className="w-4 h-4 rounded border-input accent-primary" />
                  <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                  Repeat every day
                </label>
                <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity w-full sm:w-auto">Create Task</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task List */}
      <div className="space-y-2">
        {tasks.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <CalendarDays className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No tasks for this day. Click "Add Task" to create one.</p>
          </div>
        )}
        {tasks.map((task, i) => {
          const isExpanded = expandedTask === task.id;
          const isEditing = editingTask === task.id;
          const { day: tDay, month: tMonth } = formatDateFull(task.date);

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragEnter={() => handleDragEnter(i)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={cn(
                "bg-card border rounded-xl overflow-hidden transition-all cursor-grab active:cursor-grabbing",
                task.completed ? "border-success/30 bg-success/5" : "border-border"
              )}
            >
              {isEditing ? (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option>General</option><option>Work</option><option>Health</option><option>Growth</option><option>Planning</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className="text-xs text-muted-foreground mb-1 block">Start</label><input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">End</label><input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Sub-task</label><input value={editSubTask} onChange={(e) => setEditSubTask(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input type="checkbox" checked={editRecurring} onChange={(e) => setEditRecurring(e.target.checked)} className="w-4 h-4 rounded border-input accent-primary" />
                      <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" /> Repeat every day
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingTask(null)} className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
                      <button onClick={() => saveEdit(task.id)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Save</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 sm:p-4">
                  <GripVertical className="hidden sm:block w-4 h-4 text-muted-foreground/40 shrink-0" />
                  <div className="text-center min-w-[40px] shrink-0">
                    <span className="text-xs font-medium text-muted-foreground block">{tMonth}</span>
                    <span className="text-lg font-heading font-bold text-foreground">{tDay}</span>
                  </div>
                  <div className="hidden sm:block w-px h-10 bg-border shrink-0" />
                  <button onClick={() => onToggleComplete(task.id)} className={cn("w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all", task.completed ? "bg-success border-success text-success-foreground" : "border-muted-foreground/30 hover:border-primary")}>
                    {task.completed && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <div className="basis-full sm:flex-1 min-w-0 order-last sm:order-none">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-medium", task.completed ? "line-through text-muted-foreground" : "text-foreground")}>{task.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{task.category}</span>
                      {task.recurring && <span title="Recurring daily"><RotateCcw className="w-3 h-3 text-primary/60" /></span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(task.startTime)} – {formatTime(task.endTime)}</span>
                      <span className="text-xs text-primary font-medium">{formatDuration(task.startTime, task.endTime)}</span>
                      {task.totalTime > 0 && <span className="text-xs text-success font-medium">⏱ {formatSeconds(task.totalTime)} tracked</span>}
                    </div>
                  </div>
                  <button onClick={() => onToggleTimer(task.id)} className={cn("p-2 rounded-lg transition-colors shrink-0", task.timerRunning ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground hover:text-foreground")}>
                    {task.timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <span className={cn("text-sm font-heading font-bold shrink-0", task.streak >= 5 ? "text-success" : task.streak >= 3 ? "text-warning" : "text-muted-foreground")}>{task.streak}🔥</span>
                  <button onClick={() => startEdit(task)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => onDeleteTask(task.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  {task.subTask && (
                    <button onClick={() => setExpandedTask(isExpanded ? null : task.id)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              )}

              <AnimatePresence>
                {isExpanded && task.subTask && !isEditing && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-3 pl-[100px]">
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/50">
                        <button onClick={() => onToggleSubTask(task.id)} className={cn("w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all", task.subTask.completed ? "bg-success border-success text-success-foreground" : "border-muted-foreground/30 hover:border-primary")}>
                          {task.subTask.completed && <Check className="w-3 h-3" />}
                        </button>
                        <span className={cn("text-xs", task.subTask.completed ? "line-through text-muted-foreground" : "text-foreground")}>{task.subTask.name}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
