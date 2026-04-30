import { NoteEntry, TodoItem, ReflectionEntry } from "@/lib/store";
import {
  BookOpen, Check, Plus, Trash2, ListTodo, FileText, Target,
  Calendar, Clock, Pencil, X, Save, Search, Tag, Star, Hash,
  Pin, Archive, Filter, BarChart2, Flame, TrendingUp, ChevronDown,
  ChevronRight, Smile, Meh, Frown, Zap, Moon, Sun, ArrowUpDown,
  CheckCircle2, Circle, MoreHorizontal, Copy, StickyNote,
} from "lucide-react";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type DiaryTab = "notes" | "todo" | "reflection" | "insights";
type NoteCategory = "general" | "idea" | "important" | "work" | "personal";
type TodoPriority = "high" | "medium" | "low";
type MoodType = "great" | "good" | "okay" | "bad" | "awful";
type EnergyLevel = "high" | "medium" | "low";
type TodoFilter = "all" | "pending" | "done" | "starred";
type NoteFilter = "all" | "pinned" | "starred" | "idea" | "important";
type SortOrder = "newest" | "oldest" | "alpha";

interface DiaryViewProps {
  notes: NoteEntry[];
  todos: TodoItem[];
  reflections: ReflectionEntry[];
  onAddNote: (content: string, category?: NoteCategory, tags?: string[], pinned?: boolean) => void;
  onEditNote: (id: string, content: string, category?: NoteCategory, tags?: string[]) => void;
  onDeleteNote: (id: string) => void;
  onAddTodo: (text: string, priority?: TodoPriority, dueDate?: string, tags?: string[]) => void;
  onEditTodo: (id: string, text: string, priority?: TodoPriority, dueDate?: string) => void;
  onToggleTodo: (id: string) => void;
  onRemoveTodo: (id: string) => void;
  onAddReflection: (
    whatIDid: string, whatIFailed: string, planForTomorrow: string,
    mood?: MoodType, energy?: EnergyLevel, gratitude?: string, highlights?: string,
  ) => void;
  onEditReflection: (
    id: string,
    updates: Partial<Pick<ReflectionEntry, "whatIDid" | "whatIFailed" | "planForTomorrow">>,
  ) => void;
  onDeleteReflection: (id: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTE_CATEGORIES: Record<NoteCategory, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  general:   { label: "General",   color: "text-slate-500",   bg: "bg-slate-500/10",   icon: <StickyNote className="w-3 h-3" /> },
  idea:      { label: "Idea",      color: "text-amber-500",   bg: "bg-amber-500/10",   icon: <Zap className="w-3 h-3" /> },
  important: { label: "Important", color: "text-destructive", bg: "bg-destructive/10", icon: <Star className="w-3 h-3" /> },
  work:      { label: "Work",      color: "text-blue-500",    bg: "bg-blue-500/10",    icon: <Target className="w-3 h-3" /> },
  personal:  { label: "Personal",  color: "text-purple-500",  bg: "bg-purple-500/10",  icon: <Moon className="w-3 h-3" /> },
};

const TODO_PRIORITY_CONFIG: Record<TodoPriority, { label: string; color: string; bg: string; dot: string }> = {
  high:   { label: "High",   color: "text-destructive", bg: "bg-destructive/10", dot: "bg-destructive" },
  medium: { label: "Medium", color: "text-amber-500",   bg: "bg-amber-500/10",   dot: "bg-amber-500" },
  low:    { label: "Low",    color: "text-slate-400",   bg: "bg-slate-500/10",   dot: "bg-slate-400" },
};

const MOOD_CONFIG: Record<MoodType, { emoji: string; label: string; color: string }> = {
  great: { emoji: "😄", label: "Great",  color: "text-emerald-500" },
  good:  { emoji: "🙂", label: "Good",   color: "text-blue-500" },
  okay:  { emoji: "😐", label: "Okay",   color: "text-amber-500" },
  bad:   { emoji: "😔", label: "Bad",    color: "text-orange-500" },
  awful: { emoji: "😞", label: "Awful",  color: "text-destructive" },
};

const ENERGY_CONFIG: Record<EnergyLevel, { label: string; icon: React.ReactNode; color: string }> = {
  high:   { label: "High energy",   icon: <Flame className="w-3.5 h-3.5" />,  color: "text-orange-500" },
  medium: { label: "Medium energy", icon: <Zap className="w-3.5 h-3.5" />,    color: "text-amber-500" },
  low:    { label: "Low energy",    icon: <Moon className="w-3.5 h-3.5" />,   color: "text-slate-400" },
};

const WRITING_PROMPTS = [
  "What's one thing you learned today?",
  "What are you most proud of right now?",
  "What would make tomorrow even better?",
  "Describe a challenge you overcame recently.",
  "What are you grateful for today?",
  "What's been on your mind lately?",
  "What's a small win worth celebrating?",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(date: string, time: string) {
  const d = new Date(date + "T00:00:00");
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${time}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function randomPrompt() {
  return WRITING_PROMPTS[Math.floor(Math.random() * WRITING_PROMPTS.length)];
}

// ─── Shared Components ────────────────────────────────────────────────────────

function TabBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary min-w-[18px] text-center">
      {count}
    </span>
  );
}

function SectionHeader({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-primary">{icon}</span>
      <h3 className="font-semibold text-foreground text-base">{title}</h3>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

function TagChip({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/20">
      <Hash className="w-2.5 h-2.5" />{tag}
      {onRemove && <button onClick={onRemove} className="ml-0.5 hover:text-destructive"><X className="w-2.5 h-2.5" /></button>}
    </span>
  );
}

function TagInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">Tags (comma-separated)</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="focus, important, idea..."
        className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const textareaCls = cn(inputCls, "resize-y leading-relaxed");

// ─── Notes Tab ────────────────────────────────────────────────────────────────

function NotesTab({
  notes, onAddNote, onEditNote, onDeleteNote,
}: Pick<DiaryViewProps, "notes" | "onAddNote" | "onEditNote" | "onDeleteNote">) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<NoteCategory>("general");
  const [tagsInput, setTagsInput] = useState("");
  const [pinned, setPinned] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [prompt, setPrompt] = useState(randomPrompt);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<NoteFilter>("all");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [editId, setEditId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState<NoteCategory>("general");
  const [editTagsInput, setEditTagsInput] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAdd = () => {
    if (!content.trim()) return;
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    onAddNote(content.trim(), category, tags, pinned);
    setContent(""); setTagsInput(""); setPinned(false); setShowForm(false);
  };

  const handleSaveEdit = () => {
    if (!editId) return;
    const tags = editTagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    onEditNote(editId, editContent, editCategory, tags);
    setEditId(null);
  };

  const startEdit = (note: NoteEntry) => {
    setEditId(note.id);
    setEditContent(note.content);
    setEditCategory((note as any).category ?? "general");
    setEditTagsInput(((note as any).tags as string[] | undefined)?.join(", ") ?? "");
  };

  const toggleStar = (id: string) => setStarred((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const togglePin = (id: string) => setPinnedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const filtered = useMemo(() => {
    let result = [...notes];
    if (search.trim()) result = result.filter((n) => n.content.toLowerCase().includes(search.toLowerCase()));
    if (filter === "pinned")    result = result.filter((n) => pinnedIds.has(n.id));
    if (filter === "starred")   result = result.filter((n) => starred.has(n.id));
    if (filter === "idea")      result = result.filter((n) => ((n as any).category as NoteCategory) === "idea");
    if (filter === "important") result = result.filter((n) => ((n as any).category as NoteCategory) === "important");
    if (sort === "newest")  result.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
    if (sort === "oldest")  result.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    if (sort === "alpha")   result.sort((a, b) => a.content.localeCompare(b.content));
    // pinned always on top
    result.sort((a, b) => (pinnedIds.has(b.id) ? 1 : 0) - (pinnedIds.has(a.id) ? 1 : 0));
    return result;
  }, [notes, search, filter, sort, pinnedIds, starred]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Add form toggle */}
      <div className="bg-card border border-border rounded-xl p-5">
        <SectionHeader
          icon={<FileText className="w-5 h-5" />}
          title="Notes & Diary"
          action={
            <button onClick={() => { setShowForm((v) => !v); setTimeout(() => textareaRef.current?.focus(), 50); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
              <Plus className="w-3.5 h-3.5" /> New note
            </button>
          }
        />

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="space-y-3 pb-1">
                {/* Writing prompt */}
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/15">
                  <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                  <p className="text-xs text-primary italic flex-1">{prompt}</p>
                  <button onClick={() => setPrompt(randomPrompt())} className="text-primary/60 hover:text-primary transition-colors"><ArrowUpDown className="w-3 h-3" /></button>
                </div>

                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your thoughts..."
                  className={cn(textareaCls, "min-h-[120px]")}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value as NoteCategory)} className={inputCls}>
                      {Object.entries(NOTE_CATEGORIES).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                  <TagInput value={tagsInput} onChange={setTagsInput} />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                    <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="w-3.5 h-3.5 accent-primary rounded" />
                    <Pin className="w-3.5 h-3.5 text-muted-foreground" /> Pin this note
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1"><X className="w-3 h-3" /> Cancel</button>
                    <button onClick={handleAdd} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 flex items-center gap-1"><Save className="w-3 h-3" /> Save note</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search + filter bar */}
      {notes.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..." className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(["all", "pinned", "starred", "idea", "important"] as NoteFilter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn("px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all", filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
                {f}
              </button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortOrder)} className="text-xs border border-input bg-background text-foreground rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="alpha">A–Z</option>
          </select>
        </div>
      )}

      {/* Notes list */}
      {filtered.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <FileText className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{notes.length === 0 ? "No notes yet. Start writing above!" : "No notes match your filters."}</p>
        </div>
      )}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map((note) => {
            const cat = NOTE_CATEGORIES[(note as any).category as NoteCategory ?? "general"];
            const tags = (note as any).tags as string[] | undefined;
            const isPin = pinnedIds.has(note.id);
            const isStar = starred.has(note.id);
            const isExpanded = expandedId === note.id;
            const isEditing = editId === note.id;
            const isLong = note.content.length > 200;

            return (
              <motion.div key={note.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className={cn("bg-card border border-border rounded-xl overflow-hidden group transition-colors hover:border-border/80", isPin && "border-primary/30 bg-primary/3")}>
                {isEditing ? (
                  <div className="p-4 space-y-3">
                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className={cn(textareaCls, "min-h-[80px]")} />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                        <select value={editCategory} onChange={(e) => setEditCategory(e.target.value as NoteCategory)} className={inputCls}>
                          {Object.entries(NOTE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                      <TagInput value={editTagsInput} onChange={setEditTagsInput} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditId(null)} className="px-3 py-1 rounded-lg text-xs text-muted-foreground hover:bg-muted flex items-center gap-1"><X className="w-3 h-3" /> Cancel</button>
                      <button onClick={handleSaveEdit} className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1"><Save className="w-3 h-3" /> Save</button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
                        {isPin && <Pin className="w-3 h-3 text-primary shrink-0" />}
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full", cat.bg, cat.color)}>
                          {cat.icon}{cat.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{fmtDate(note.date, note.time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => toggleStar(note.id)} className={cn("p-1 rounded transition-colors", isStar ? "text-amber-400" : "text-muted-foreground/0 group-hover:text-muted-foreground hover:text-amber-400")}>
                          <Star className="w-3.5 h-3.5" fill={isStar ? "currentColor" : "none"} />
                        </button>
                        <button onClick={() => togglePin(note.id)} className={cn("p-1 rounded transition-colors", isPin ? "text-primary" : "text-muted-foreground/0 group-hover:text-muted-foreground hover:text-primary")}>
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => startEdit(note)} className="p-1 rounded text-muted-foreground/0 group-hover:text-muted-foreground hover:text-primary transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDeleteNote(note.id)} className="p-1 rounded text-muted-foreground/0 group-hover:text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className={cn("text-sm text-foreground whitespace-pre-wrap leading-relaxed", !isExpanded && isLong && "line-clamp-3")}>
                      {note.content}
                    </p>
                    {isLong && (
                      <button onClick={() => setExpandedId(isExpanded ? null : note.id)} className="mt-1 text-xs text-primary hover:underline flex items-center gap-0.5">
                        {isExpanded ? <><ChevronDown className="w-3 h-3" /> Show less</> : <><ChevronRight className="w-3 h-3" /> Read more</>}
                      </button>
                    )}
                    {tags && tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tags.map((t) => <TagChip key={t} tag={t} />)}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Todo Tab ─────────────────────────────────────────────────────────────────

function TodoTab({
  todos, onAddTodo, onEditTodo, onToggleTodo, onRemoveTodo,
}: Pick<DiaryViewProps, "todos" | "onAddTodo" | "onEditTodo" | "onToggleTodo" | "onRemoveTodo">) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filter, setFilter] = useState<TodoFilter>("all");
  const [sort, setSort] = useState<"priority" | "date" | "alpha">("priority");
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editPriority, setEditPriority] = useState<TodoPriority>("medium");
  const [editDue, setEditDue] = useState("");

  const done = todos.filter((t) => t.completed).length;
  const pct = todos.length > 0 ? Math.round((done / todos.length) * 100) : 0;

  const handleAdd = () => {
    if (!text.trim()) return;
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    onAddTodo(text.trim(), priority, dueDate || undefined, tags.length ? tags : undefined);
    setText(""); setTagsInput(""); setDueDate(""); setPriority("medium"); setShowAdvanced(false);
  };

  const saveEdit = () => {
    if (!editId) return;
    onEditTodo(editId, editText, editPriority, editDue || undefined);
    setEditId(null);
  };

  const toggleStar = (id: string) => setStarred((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const filtered = useMemo(() => {
    let result = [...todos];
    if (filter === "pending") result = result.filter((t) => !t.completed);
    if (filter === "done")    result = result.filter((t) => t.completed);
    if (filter === "starred") result = result.filter((t) => starred.has(t.id));
    const pOrder: Record<TodoPriority, number> = { high: 0, medium: 1, low: 2 };
    if (sort === "priority") result.sort((a, b) => pOrder[(a as any).priority ?? "medium"] - pOrder[(b as any).priority ?? "medium"]);
    if (sort === "date")     result.sort((a, b) => b.date.localeCompare(a.date));
    if (sort === "alpha")    result.sort((a, b) => a.text.localeCompare(b.text));
    // starred on top
    result.sort((a, b) => (starred.has(b.id) ? 1 : 0) - (starred.has(a.id) ? 1 : 0));
    // completed at bottom
    result.sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0));
    return result;
  }, [todos, filter, sort, starred]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <SectionHeader
          icon={<ListTodo className="w-5 h-5" />}
          title="Todo List"
          action={<span className="text-xs text-muted-foreground">{done}/{todos.length} done</span>}
        />

        {/* Progress */}
        {todos.length > 0 && (
          <div className="mb-4 space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Progress</span><span className="font-medium text-foreground">{pct}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
            </div>
          </div>
        )}

        {/* Add input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAdd()}
              placeholder="Add a todo item..."
              className={cn(inputCls, "flex-1")}
            />
            <button onClick={() => setShowAdvanced((v) => !v)} className={cn("p-2 rounded-lg border text-xs transition-all", showAdvanced ? "border-primary bg-primary/10 text-primary" : "border-input bg-background text-muted-foreground hover:text-foreground")}>
              <Filter className="w-4 h-4" />
            </button>
            <button onClick={handleAdd} className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"><Plus className="w-4 h-4" /></button>
          </div>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value as TodoPriority)} className={inputCls}>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Due date</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
                  </div>
                  <TagInput value={tagsInput} onChange={setTagsInput} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Filter + sort */}
      {todos.length > 0 && (
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex gap-1">
            {(["all", "pending", "done", "starred"] as TodoFilter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn("px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all", filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
                {f}
              </button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="ml-auto text-xs border border-input bg-background text-foreground rounded-lg px-2 py-1.5 focus:outline-none">
            <option value="priority">Sort: Priority</option>
            <option value="date">Sort: Date</option>
            <option value="alpha">Sort: A–Z</option>
          </select>
        </div>
      )}

      {/* List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{todos.length === 0 ? "No todos yet — add one above!" : "No todos match your filter."}</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((item, i) => {
              const pConfig = TODO_PRIORITY_CONFIG[(item as any).priority as TodoPriority ?? "medium"];
              const isStar = starred.has(item.id);
              const tags = (item as any).tags as string[] | undefined;
              const dueDate = (item as any).dueDate as string | undefined;
              const isOverdue = dueDate && dueDate < todayStr() && !item.completed;

              return (
                <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ delay: i * 0.02 }}
                  className={cn("group border-b border-border/40 last:border-0 transition-colors hover:bg-muted/30", item.completed && "bg-muted/20")}>
                  {editId === item.id ? (
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <input value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit()} className={cn(inputCls, "flex-1 text-xs")} />
                      <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as TodoPriority)} className="text-xs border border-input bg-background text-foreground rounded-lg px-2 py-1.5">
                        <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                      </select>
                      <input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} className="text-xs border border-input bg-background text-foreground rounded-lg px-2 py-1.5" />
                      <button onClick={() => setEditId(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                      <button onClick={saveEdit} className="p-1 text-primary hover:text-primary/80"><Save className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 px-3 py-2.5">
                      {/* Priority dot */}
                      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-2", pConfig.dot)} />

                      <button onClick={() => onToggleTodo(item.id)} className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all", item.completed ? "bg-success border-success text-success-foreground" : "border-muted-foreground/30 hover:border-primary")}>
                        {item.completed && <Check className="w-3 h-3" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <span className={cn("text-sm block", item.completed ? "line-through text-muted-foreground" : "text-foreground")}>{item.text}</span>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{fmtDate(item.date, item.time)}
                          </span>
                          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", pConfig.bg, pConfig.color)}>
                            {pConfig.label}
                          </span>
                          {dueDate && (
                            <span className={cn("text-[10px] flex items-center gap-1", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                              <Clock className="w-3 h-3" /> Due {dueDate}
                            </span>
                          )}
                          {tags?.map((t) => <TagChip key={t} tag={t} />)}
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => toggleStar(item.id)} className={cn("p-1 rounded transition-colors", isStar ? "text-amber-400" : "text-muted-foreground/0 group-hover:text-muted-foreground hover:text-amber-400")}>
                          <Star className="w-3.5 h-3.5" fill={isStar ? "currentColor" : "none"} />
                        </button>
                        <button onClick={() => { setEditId(item.id); setEditText(item.text); setEditPriority((item as any).priority ?? "medium"); setEditDue((item as any).dueDate ?? ""); }} className="p-1 rounded text-muted-foreground/0 group-hover:text-muted-foreground hover:text-primary transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onRemoveTodo(item.id)} className="p-1 rounded text-muted-foreground/0 group-hover:text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

// ─── Reflection Tab ───────────────────────────────────────────────────────────

const REFLECTION_SECTIONS = [
  { key: "whatIDid"        as const, label: "What I accomplished",   placeholder: "List your wins and completed tasks...", color: "bg-emerald-500", dot: "bg-emerald-500" },
  { key: "whatIFailed"     as const, label: "What I didn't finish",  placeholder: "What got skipped or blocked?",          color: "bg-destructive",  dot: "bg-destructive" },
  { key: "planForTomorrow" as const, label: "Plan for tomorrow",     placeholder: "Top priorities and intentions...",       color: "bg-primary",      dot: "bg-primary" },
];

function ReflectionTab({
  reflections, onAddReflection, onEditReflection, onDeleteReflection,
}: Pick<DiaryViewProps, "reflections" | "onAddReflection" | "onEditReflection" | "onDeleteReflection">) {
  const [showForm, setShowForm] = useState(false);
  const [fields, setFields] = useState({ whatIDid: "", whatIFailed: "", planForTomorrow: "", gratitude: "", highlights: "" });
  const [mood, setMood] = useState<MoodType | null>(null);
  const [energy, setEnergy] = useState<EnergyLevel | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ whatIDid: "", whatIFailed: "", planForTomorrow: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const setField = (k: keyof typeof fields, v: string) => setFields((p) => ({ ...p, [k]: v }));

  const handleAdd = () => {
    const hasContent = Object.values(fields).some((v) => v.trim()) || mood || energy;
    if (!hasContent) return;
    onAddReflection(
      fields.whatIDid.trim(), fields.whatIFailed.trim(), fields.planForTomorrow.trim(),
      mood ?? undefined, energy ?? undefined, fields.gratitude.trim(), fields.highlights.trim(),
    );
    setFields({ whatIDid: "", whatIFailed: "", planForTomorrow: "", gratitude: "", highlights: "" });
    setMood(null); setEnergy(null); setShowForm(false);
  };

  const startEdit = (ref: ReflectionEntry) => {
    setEditId(ref.id);
    setEditFields({ whatIDid: ref.whatIDid, whatIFailed: ref.whatIFailed, planForTomorrow: ref.planForTomorrow });
  };

  const saveEdit = () => {
    if (!editId) return;
    onEditReflection(editId, editFields);
    setEditId(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <SectionHeader
          icon={<Target className="w-5 h-5" />}
          title="Daily Reflection"
          action={!showForm && (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
              <Plus className="w-3.5 h-3.5" /> Add reflection
            </button>
          )}
        />

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="space-y-4">
                {/* Mood + Energy */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block font-medium">Today's mood</label>
                    <div className="flex gap-1">
                      {(Object.entries(MOOD_CONFIG) as [MoodType, typeof MOOD_CONFIG[MoodType]][]).map(([k, v]) => (
                        <button key={k} onClick={() => setMood(mood === k ? null : k)} title={v.label}
                          className={cn("flex-1 text-center py-1.5 rounded-lg text-base transition-all border", mood === k ? "border-primary bg-primary/10 scale-105" : "border-border hover:border-primary/40 hover:bg-muted")}>
                          {v.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block font-medium">Energy level</label>
                    <div className="flex gap-1">
                      {(Object.entries(ENERGY_CONFIG) as [EnergyLevel, typeof ENERGY_CONFIG[EnergyLevel]][]).map(([k, v]) => (
                        <button key={k} onClick={() => setEnergy(energy === k ? null : k)}
                          className={cn("flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all border", energy === k ? cn("border-primary bg-primary/10", v.color) : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted")}>
                          <span className={energy === k ? v.color : ""}>{v.icon}</span>
                          <span className="hidden sm:inline">{k}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Main sections */}
                {REFLECTION_SECTIONS.map((section) => (
                  <div key={section.key}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={cn("w-2 h-2 rounded-full shrink-0", section.dot)} />
                      <label className="text-xs font-semibold text-foreground">{section.label}</label>
                    </div>
                    <textarea
                      value={fields[section.key]}
                      onChange={(e) => setField(section.key, e.target.value)}
                      placeholder={section.placeholder}
                      className={cn(textareaCls, "min-h-[80px]")}
                    />
                  </div>
                ))}

                {/* Extra fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5"><div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" /><label className="text-xs font-semibold text-foreground">Gratitude</label></div>
                    <textarea value={fields.gratitude} onChange={(e) => setField("gratitude", e.target.value)} placeholder="I'm grateful for..." className={cn(textareaCls, "min-h-[60px]")} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5"><div className="w-2 h-2 rounded-full bg-purple-400 shrink-0" /><label className="text-xs font-semibold text-foreground">Highlight</label></div>
                    <textarea value={fields.highlights} onChange={(e) => setField("highlights", e.target.value)} placeholder="Best moment today..." className={cn(textareaCls, "min-h-[60px]")} />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted flex items-center gap-1"><X className="w-3 h-3" /> Cancel</button>
                  <button onClick={handleAdd} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 flex items-center gap-1"><Save className="w-3 h-3" /> Save reflection</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {reflections.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Previous reflections</h4>
          {reflections.map((ref) => {
            const refMood = (ref as any).mood as MoodType | undefined;
            const refEnergy = (ref as any).energy as EnergyLevel | undefined;
            const gratitude = (ref as any).gratitude as string | undefined;
            const highlights = (ref as any).highlights as string | undefined;
            const isExpanded = expandedId === ref.id;

            return (
              <div key={ref.id} className="bg-card border border-border rounded-xl overflow-hidden group">
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 flex-1">
                    <Calendar className="w-3 h-3" />{fmtDate(ref.date, ref.time)}
                  </span>
                  {refMood && <span title={MOOD_CONFIG[refMood].label} className="text-base">{MOOD_CONFIG[refMood].emoji}</span>}
                  {refEnergy && (
                    <span className={cn("text-xs flex items-center gap-1", ENERGY_CONFIG[refEnergy].color)}>
                      {ENERGY_CONFIG[refEnergy].icon}
                    </span>
                  )}
                  <button onClick={() => setExpandedId(isExpanded ? null : ref.id)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => startEdit(ref)} className="p-1 rounded text-muted-foreground/0 group-hover:text-muted-foreground hover:text-primary transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => onDeleteReflection(ref.id)} className="p-1 rounded text-muted-foreground/0 group-hover:text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>

                {editId === ref.id ? (
                  <div className="p-4 space-y-3">
                    {REFLECTION_SECTIONS.map((section) => (
                      <div key={section.key}>
                        <div className="flex items-center gap-2 mb-1"><div className={cn("w-2 h-2 rounded-full", section.dot)} /><span className="text-xs font-semibold text-foreground">{section.label}</span></div>
                        <textarea value={editFields[section.key]} onChange={(e) => setEditFields((p) => ({ ...p, [section.key]: e.target.value }))} className={cn(textareaCls, "min-h-[60px]")} />
                      </div>
                    ))}
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditId(null)} className="px-3 py-1 rounded-lg text-xs text-muted-foreground hover:bg-muted flex items-center gap-1"><X className="w-3 h-3" /> Cancel</button>
                      <button onClick={saveEdit} className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1"><Save className="w-3 h-3" /> Save</button>
                    </div>
                  </div>
                ) : (
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="p-4 space-y-3">
                          {REFLECTION_SECTIONS.map((section) => ref[section.key] && (
                            <div key={section.key}>
                              <div className="flex items-center gap-2 mb-1"><div className={cn("w-2 h-2 rounded-full", section.dot)} /><span className="text-xs font-semibold text-foreground">{section.label}</span></div>
                              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed pl-4">{ref[section.key]}</p>
                            </div>
                          ))}
                          {gratitude && (
                            <div><div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-xs font-semibold text-foreground">Gratitude</span></div><p className="text-sm text-foreground/80 pl-4">{gratitude}</p></div>
                          )}
                          {highlights && (
                            <div><div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-purple-400" /><span className="text-xs font-semibold text-foreground">Highlight</span></div><p className="text-sm text-foreground/80 pl-4">{highlights}</p></div>
                          )}
                        </div>
                      </motion.div>
                    )}
                    {!isExpanded && (
                      <div className="px-4 py-2.5">
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {ref.whatIDid || ref.planForTomorrow || ref.whatIFailed || "—"}
                        </p>
                      </div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ─── Insights Tab ─────────────────────────────────────────────────────────────

function InsightsTab({ notes, todos, reflections }: Pick<DiaryViewProps, "notes" | "todos" | "reflections">) {
  const doneTodos = todos.filter((t) => t.completed).length;
  const totalTodos = todos.length;
  const completionRate = totalTodos > 0 ? Math.round((doneTodos / totalTodos) * 100) : 0;
  const totalNotes = notes.length;
  const totalReflections = reflections.length;
  const notesByCategory = useMemo(() => {
    const map = new Map<NoteCategory, number>();
    notes.forEach((n) => {
      const cat = ((n as any).category as NoteCategory) ?? "general";
      map.set(cat, (map.get(cat) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [notes]);

  const todosByPriority = useMemo(() => {
    const map = new Map<TodoPriority, { total: number; done: number }>();
    todos.forEach((t) => {
      const p = ((t as any).priority as TodoPriority) ?? "medium";
      const prev = map.get(p) ?? { total: 0, done: 0 };
      map.set(p, { total: prev.total + 1, done: prev.done + (t.completed ? 1 : 0) });
    });
    return Array.from(map.entries());
  }, [todos]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Notes written",  value: totalNotes,       icon: <FileText className="w-4 h-4" />,  color: "text-blue-500" },
          { label: "Todos completed",value: `${doneTodos}/${totalTodos}`, icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-500" },
          { label: "Reflections",    value: totalReflections, icon: <Target className="w-4 h-4" />,    color: "text-purple-500" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <span className={s.color}>{s.icon}</span>
            <p className="text-xl font-bold text-foreground mt-2">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Todo completion rate */}
      {totalTodos > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Todo completion</h4>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Overall rate</span><span className="font-medium text-foreground">{completionRate}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" initial={{ width: 0 }} animate={{ width: `${completionRate}%` }} transition={{ duration: 0.8 }} />
            </div>
          </div>
          {todosByPriority.map(([p, stats]) => {
            const cfg = TODO_PRIORITY_CONFIG[p];
            const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
            return (
              <div key={p} className="flex items-center gap-3 text-xs">
                <span className={cn("w-14 shrink-0", cfg.color)}>{cfg.label}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", cfg.dot)} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-muted-foreground w-10 text-right shrink-0">{stats.done}/{stats.total}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Notes by category */}
      {notesByCategory.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><BarChart2 className="w-4 h-4 text-primary" /> Notes by category</h4>
          {notesByCategory.map(([cat, count]) => {
            const cfg = NOTE_CATEGORIES[cat];
            const pct = Math.round((count / totalNotes) * 100);
            return (
              <div key={cat} className="flex items-center gap-3 text-xs">
                <span className={cn("w-20 shrink-0 flex items-center gap-1", cfg.color)}>{cfg.icon}{cfg.label}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div className={cn("h-full rounded-full", cfg.color.replace("text-", "bg-"))} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                </div>
                <span className="text-muted-foreground w-8 text-right shrink-0">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Writing streak */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><Flame className="w-4 h-4 text-orange-500" /> Writing activity</h4>
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: 28 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (27 - i));
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const hasNote = notes.some((n) => n.date === dateStr);
            const hasTodo = todos.some((t) => t.date === dateStr);
            const hasRef = reflections.some((r) => r.date === dateStr);
            const activity = (hasNote ? 1 : 0) + (hasTodo ? 1 : 0) + (hasRef ? 1 : 0);
            return (
              <div key={dateStr} title={dateStr} className={cn("w-5 h-5 rounded-sm transition-colors", activity === 0 ? "bg-muted" : activity === 1 ? "bg-primary/30" : activity === 2 ? "bg-primary/60" : "bg-primary")} />
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Last 28 days — darker = more activity</p>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DiaryView({
  notes, todos, reflections,
  onAddNote, onEditNote, onDeleteNote,
  onAddTodo, onEditTodo, onToggleTodo, onRemoveTodo,
  onAddReflection, onEditReflection, onDeleteReflection,
}: DiaryViewProps) {
  const [activeTab, setActiveTab] = useState<DiaryTab>("notes");

  const pendingTodos = todos.filter((t) => !t.completed).length;

  const tabs: { id: DiaryTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "notes",      label: "Notes",      icon: <BookOpen className="w-4 h-4" />,   badge: notes.length },
    { id: "todo",       label: "Todo",        icon: <ListTodo className="w-4 h-4" />,   badge: pendingTodos },
    { id: "reflection", label: "Reflect",     icon: <Target className="w-4 h-4" />,     badge: reflections.length },
    { id: "insights",   label: "Insights",    icon: <BarChart2 className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="bg-card border border-border rounded-xl p-1.5 flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && <TabBadge count={tab.badge} />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "notes" && (
          <NotesTab key="notes" notes={notes} onAddNote={onAddNote} onEditNote={onEditNote} onDeleteNote={onDeleteNote} />
        )}
        {activeTab === "todo" && (
          <TodoTab key="todo" todos={todos} onAddTodo={onAddTodo} onEditTodo={onEditTodo} onToggleTodo={onToggleTodo} onRemoveTodo={onRemoveTodo} />
        )}
        {activeTab === "reflection" && (
          <ReflectionTab key="reflection" reflections={reflections} onAddReflection={onAddReflection} onEditReflection={onEditReflection} onDeleteReflection={onDeleteReflection} />
        )}
        {activeTab === "insights" && (
          <InsightsTab key="insights" notes={notes} todos={todos} reflections={reflections} />
        )}
      </AnimatePresence>
    </div>
  );
}