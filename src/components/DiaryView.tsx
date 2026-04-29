import { NoteEntry, TodoItem, ReflectionEntry } from "@/lib/store";
import { BookOpen, Check, Plus, Trash2, ListTodo, FileText, Target, Calendar, Clock, Pencil, X, Save } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface DiaryViewProps {
  notes: NoteEntry[];
  todos: TodoItem[];
  reflections: ReflectionEntry[];
  onAddNote: (content: string) => void;
  onEditNote: (id: string, content: string) => void;
  onDeleteNote: (id: string) => void;
  onAddTodo: (text: string) => void;
  onEditTodo: (id: string, text: string) => void;
  onToggleTodo: (id: string) => void;
  onRemoveTodo: (id: string) => void;
  onAddReflection: (whatIDid: string, whatIFailed: string, planForTomorrow: string) => void;
  onEditReflection: (id: string, updates: Partial<Pick<ReflectionEntry, "whatIDid" | "whatIFailed" | "planForTomorrow">>) => void;
  onDeleteReflection: (id: string) => void;
}

function formatEntryDate(date: string, time: string) {
  const d = new Date(date + "T00:00:00");
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${time}`;
}

export function DiaryView({ notes, todos, reflections, onAddNote, onEditNote, onDeleteNote, onAddTodo, onEditTodo, onToggleTodo, onRemoveTodo, onAddReflection, onEditReflection, onDeleteReflection }: DiaryViewProps) {
  const [newTodo, setNewTodo] = useState("");
  const [newNote, setNewNote] = useState("");
  const [activeTab, setActiveTab] = useState<"diary" | "todo" | "reflection">("diary");
  const [showReflectionForm, setShowReflectionForm] = useState(false);
  const [refDid, setRefDid] = useState("");
  const [refFailed, setRefFailed] = useState("");
  const [refPlan, setRefPlan] = useState("");
  // Edit states
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTodoText, setEditTodoText] = useState("");
  const [editingRefId, setEditingRefId] = useState<string | null>(null);
  const [editRefDid, setEditRefDid] = useState("");
  const [editRefFailed, setEditRefFailed] = useState("");
  const [editRefPlan, setEditRefPlan] = useState("");

  const handleAddTodo = () => { if (newTodo.trim()) { onAddTodo(newTodo.trim()); setNewTodo(""); } };
  const handleAddNote = () => { if (newNote.trim()) { onAddNote(newNote.trim()); setNewNote(""); } };
  const handleAddReflection = () => {
    if (refDid.trim() || refFailed.trim() || refPlan.trim()) {
      onAddReflection(refDid.trim(), refFailed.trim(), refPlan.trim());
      setRefDid(""); setRefFailed(""); setRefPlan(""); setShowReflectionForm(false);
    }
  };

  const startEditNote = (note: NoteEntry) => { setEditingNoteId(note.id); setEditNoteContent(note.content); };
  const saveEditNote = () => { if (editingNoteId) { onEditNote(editingNoteId, editNoteContent); setEditingNoteId(null); } };

  const startEditTodo = (todo: TodoItem) => { setEditingTodoId(todo.id); setEditTodoText(todo.text); };
  const saveEditTodo = () => { if (editingTodoId) { onEditTodo(editingTodoId, editTodoText); setEditingTodoId(null); } };

  const startEditRef = (ref: ReflectionEntry) => { setEditingRefId(ref.id); setEditRefDid(ref.whatIDid); setEditRefFailed(ref.whatIFailed); setEditRefPlan(ref.planForTomorrow); };
  const saveEditRef = () => { if (editingRefId) { onEditReflection(editingRefId, { whatIDid: editRefDid, whatIFailed: editRefFailed, planForTomorrow: editRefPlan }); setEditingRefId(null); } };

  const tabs = [
    { id: "diary" as const, label: "Notes & Diary", icon: BookOpen },
    { id: "todo" as const, label: "Todo List", icon: ListTodo },
    { id: "reflection" as const, label: "Daily Reflection", icon: Target },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-1.5 flex gap-1">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all", activeTab === tab.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Notes */}
      {activeTab === "diary" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold text-foreground">Add Note</h3>
            </div>
            <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Write your thoughts, ideas, observations..." className="w-full min-h-[120px] px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y leading-relaxed" />
            <div className="flex justify-end">
              <button onClick={handleAddNote} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"><Plus className="w-4 h-4" /> Add Note</button>
            </div>
          </div>
          {notes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground px-1">Previous Notes</h4>
              {notes.map((note) => (
                <div key={note.id} className="bg-card border border-border rounded-xl p-4 group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /><Clock className="w-3 h-3" /> {formatEntryDate(note.date, note.time)}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEditNote(note)} className="p-1 rounded text-muted-foreground/0 group-hover:text-muted-foreground hover:text-primary transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => onDeleteNote(note.id)} className="p-1 rounded text-muted-foreground/0 group-hover:text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  {editingNoteId === note.id ? (
                    <div className="space-y-2">
                      <textarea value={editNoteContent} onChange={(e) => setEditNoteContent(e.target.value)} className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y leading-relaxed" />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingNoteId(null)} className="px-3 py-1 rounded-lg text-xs text-muted-foreground hover:bg-muted flex items-center gap-1"><X className="w-3 h-3" /> Cancel</button>
                        <button onClick={saveEditNote} className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1"><Save className="w-3 h-3" /> Save</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{note.content}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Todo List */}
      {activeTab === "todo" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ListTodo className="w-5 h-5 text-primary" />
            <h3 className="font-heading font-semibold text-foreground">Todo List</h3>
            <span className="text-xs text-muted-foreground ml-auto">{todos.filter((t) => t.completed).length}/{todos.length} done</span>
          </div>
          <div className="flex gap-2">
            <input value={newTodo} onChange={(e) => setNewTodo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddTodo()} placeholder="Add a todo item..." className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={handleAddTodo} className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="space-y-1.5">
            {todos.length === 0 && <p className="text-sm text-muted-foreground/50 italic text-center py-6">No todos yet. Add one above!</p>}
            {todos.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
                <button onClick={() => onToggleTodo(item.id)} className={cn("w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all", item.completed ? "bg-success border-success text-success-foreground" : "border-muted-foreground/30 hover:border-primary")}>
                  {item.completed && <Check className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  {editingTodoId === item.id ? (
                    <div className="flex items-center gap-2">
                      <input value={editTodoText} onChange={(e) => setEditTodoText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEditTodo()} className="flex-1 px-2 py-1 rounded border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      <button onClick={() => setEditingTodoId(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
                      <button onClick={saveEditTodo} className="p-1 text-primary hover:text-primary/80"><Save className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <>
                      <span className={cn("text-sm block", item.completed ? "line-through text-muted-foreground" : "text-foreground")}>{item.text}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" /> {formatEntryDate(item.date, item.time)}</span>
                    </>
                  )}
                </div>
                {editingTodoId !== item.id && (
                  <>
                    <button onClick={() => startEditTodo(item)} className="p-1 rounded text-muted-foreground/0 group-hover:text-muted-foreground hover:text-primary transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onRemoveTodo(item.id)} className="p-1 rounded text-muted-foreground/0 group-hover:text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Daily Reflection */}
      {activeTab === "reflection" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-semibold text-foreground">Daily Reflection</h3>
              </div>
              {!showReflectionForm && (
                <button onClick={() => setShowReflectionForm(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"><Plus className="w-4 h-4" /> Add Reflection</button>
              )}
            </div>
            <AnimatePresence>
              {showReflectionForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-success" /><h4 className="font-heading font-semibold text-foreground text-sm">What I Did Today</h4></div>
                    <textarea value={refDid} onChange={(e) => setRefDid(e.target.value)} placeholder="List your accomplishments..." className="w-full min-h-[100px] px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y leading-relaxed" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-destructive" /><h4 className="font-heading font-semibold text-foreground text-sm">What I Failed To Do</h4></div>
                    <textarea value={refFailed} onChange={(e) => setRefFailed(e.target.value)} placeholder="What tasks did you skip?" className="w-full min-h-[100px] px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y leading-relaxed" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" /><h4 className="font-heading font-semibold text-foreground text-sm">Plan for Tomorrow</h4></div>
                    <textarea value={refPlan} onChange={(e) => setRefPlan(e.target.value)} placeholder="Priorities for tomorrow?" className="w-full min-h-[100px] px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y leading-relaxed" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowReflectionForm(false)} className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
                    <button onClick={handleAddReflection} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"><Plus className="w-4 h-4" /> Save Reflection</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {reflections.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground px-1">Previous Reflections</h4>
              {reflections.map((ref) => (
                <div key={ref.id} className="bg-card border border-border rounded-xl p-5 space-y-3 group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /><Clock className="w-3 h-3" /> {formatEntryDate(ref.date, ref.time)}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEditRef(ref)} className="p-1 rounded text-muted-foreground/0 group-hover:text-muted-foreground hover:text-primary transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => onDeleteReflection(ref.id)} className="p-1 rounded text-muted-foreground/0 group-hover:text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  {editingRefId === ref.id ? (
                    <div className="space-y-3">
                      <div><div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-success" /><span className="text-xs font-semibold text-foreground">What I Did</span></div>
                        <textarea value={editRefDid} onChange={(e) => setEditRefDid(e.target.value)} className="w-full min-h-[60px] px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y" /></div>
                      <div><div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-destructive" /><span className="text-xs font-semibold text-foreground">What I Failed</span></div>
                        <textarea value={editRefFailed} onChange={(e) => setEditRefFailed(e.target.value)} className="w-full min-h-[60px] px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y" /></div>
                      <div><div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-primary" /><span className="text-xs font-semibold text-foreground">Plan for Tomorrow</span></div>
                        <textarea value={editRefPlan} onChange={(e) => setEditRefPlan(e.target.value)} className="w-full min-h-[60px] px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y" /></div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingRefId(null)} className="px-3 py-1 rounded-lg text-xs text-muted-foreground hover:bg-muted flex items-center gap-1"><X className="w-3 h-3" /> Cancel</button>
                        <button onClick={saveEditRef} className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1"><Save className="w-3 h-3" /> Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {ref.whatIDid && <div><div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-success" /><span className="text-xs font-semibold text-foreground">What I Did</span></div><p className="text-sm text-foreground/80 whitespace-pre-wrap pl-4">{ref.whatIDid}</p></div>}
                      {ref.whatIFailed && <div><div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-destructive" /><span className="text-xs font-semibold text-foreground">What I Failed</span></div><p className="text-sm text-foreground/80 whitespace-pre-wrap pl-4">{ref.whatIFailed}</p></div>}
                      {ref.planForTomorrow && <div><div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-primary" /><span className="text-xs font-semibold text-foreground">Plan for Tomorrow</span></div><p className="text-sm text-foreground/80 whitespace-pre-wrap pl-4">{ref.planForTomorrow}</p></div>}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
