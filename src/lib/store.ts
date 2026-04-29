import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type SubTask = { id: string; name: string; completed: boolean };

export type Task = {
  id: string;
  name: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  completed: boolean;
  subTask?: SubTask;
  timerRunning: boolean;
  timerStart?: number;
  totalTime: number;
  interruptions: number;
  streak: number;
  recurring?: boolean;
};

export type NoteEntry = { id: string; date: string; time: string; content: string };
export type TodoItem = { id: string; text: string; completed: boolean; date: string; time: string };
export type ReflectionEntry = {
  id: string; date: string; time: string;
  whatIDid: string; whatIFailed: string; planForTomorrow: string;
};
export type DiaryEntry = {
  id: string; date: string; notes: string;
  whatIDid: string; whatIFailed: string; planForTomorrow: string;
  todoItems: TodoItem[];
};

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const getToday = () => formatLocalDate(new Date());
const nowTime = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

// DB row → app type mappers
function rowToTask(r: any): Task {
  return {
    id: r.id, name: r.name, category: r.category, date: r.date,
    startTime: r.start_time, endTime: r.end_time, completed: r.completed,
    subTask: r.sub_task_name ? { id: `s-${r.id}`, name: r.sub_task_name, completed: r.sub_task_completed } : undefined,
    timerRunning: r.timer_running, timerStart: r.timer_start ?? undefined,
    totalTime: r.total_time, interruptions: r.interruptions, streak: r.streak,
    recurring: r.recurring,
  };
}

export function useProductivityStore() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [activeView, setActiveView] = useState<string>("tasks");
  const [selectedDate, setSelectedDate] = useState<string>(getToday());
  const today = getToday();

  // Load data when user changes
  useEffect(() => {
    if (!user) {
      setTasks([]); setNotes([]); setTodos([]); setReflections([]);
      return;
    }
    (async () => {
      const [tRes, nRes, dRes, rRes] = await Promise.all([
        supabase.from("tasks").select("*").order("sort_order").order("created_at"),
        supabase.from("notes").select("*").order("created_at", { ascending: false }),
        supabase.from("todos").select("*").order("created_at", { ascending: false }),
        supabase.from("reflections").select("*").order("created_at", { ascending: false }),
      ]);
      if (tRes.data) setTasks(tRes.data.map(rowToTask));
      if (nRes.data) setNotes(nRes.data.map((r: any) => ({ id: r.id, date: r.date, time: r.time, content: r.content })));
      if (dRes.data) setTodos(dRes.data.map((r: any) => ({ id: r.id, text: r.text, completed: r.completed, date: r.date, time: r.time })));
      if (rRes.data) setReflections(rRes.data.map((r: any) => ({
        id: r.id, date: r.date, time: r.time,
        whatIDid: r.what_i_did, whatIFailed: r.what_i_failed, planForTomorrow: r.plan_for_tomorrow,
      })));
    })();
  }, [user]);

  // Tasks for the selected date, including virtualized recurring instances
  const tasksForDate = useMemo(() => {
    const dateTasks = tasks.filter((t) => t.date === selectedDate);
    const recurringTemplates = tasks.filter(
      (t) => t.recurring && !dateTasks.some((dt) => dt.name === t.name && dt.category === t.category)
    );
    if (selectedDate !== today) {
      const virtual = recurringTemplates.map((t) => ({
        ...t, id: `${t.id}-${selectedDate}`, date: selectedDate, completed: false,
        timerRunning: false, timerStart: undefined, totalTime: 0, interruptions: 0,
        subTask: t.subTask ? { ...t.subTask, completed: false } : undefined,
      }));
      return [...dateTasks, ...virtual];
    }
    return dateTasks;
  }, [tasks, selectedDate, today]);

  const goToPrevDay = useCallback(() => setSelectedDate((d) => addDays(d, -1)), []);
  const goToNextDay = useCallback(() => setSelectedDate((d) => addDays(d, 1)), []);
  const goToToday = useCallback(() => setSelectedDate(getToday()), []);

  // Materialize a virtual recurring task into DB
  const materializeVirtual = useCallback(async (taskId: string): Promise<string | null> => {
    if (!user) return null;
    const baseId = taskId.split("-")[0];
    const base = tasks.find((t) => t.id === baseId);
    if (!base) return null;
    const dateStr = taskId.substring(baseId.length + 1);
    const { data, error } = await supabase.from("tasks").insert({
      user_id: user.id, name: base.name, category: base.category, date: dateStr,
      start_time: base.startTime, end_time: base.endTime, completed: false,
      sub_task_name: base.subTask?.name ?? null, sub_task_completed: false,
      recurring: false, streak: base.streak,
    }).select().single();
    if (error || !data) { toast.error("Failed to add task"); return null; }
    setTasks((p) => [...p, rowToTask(data)]);
    return data.id;
  }, [user, tasks]);

  const toggleTaskComplete = useCallback(async (taskId: string) => {
    let realId = taskId;
    let task = tasks.find((t) => t.id === taskId);
    if (!task) {
      const newId = await materializeVirtual(taskId);
      if (!newId) return;
      realId = newId;
      task = tasks.find((t) => t.id === newId) || { ...tasks.find((t) => t.id === taskId.split("-")[0])!, completed: false };
    }
    const newCompleted = !task.completed;
    setTasks((p) => p.map((t) => (t.id === realId ? { ...t, completed: newCompleted } : t)));
    await supabase.from("tasks").update({ completed: newCompleted }).eq("id", realId);
  }, [tasks, materializeVirtual]);

  const toggleSubTaskComplete = useCallback(async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.subTask) return;
    const newVal = !task.subTask.completed;
    setTasks((p) => p.map((t) => (t.id === taskId && t.subTask ? { ...t, subTask: { ...t.subTask, completed: newVal } } : t)));
    await supabase.from("tasks").update({ sub_task_completed: newVal }).eq("id", taskId);
  }, [tasks]);

  const toggleTimer = useCallback(async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.timerRunning && task.timerStart) {
      const elapsed = Math.floor((Date.now() - task.timerStart) / 1000);
      const newTotal = task.totalTime + elapsed;
      setTasks((p) => p.map((t) => (t.id === taskId ? { ...t, timerRunning: false, timerStart: undefined, totalTime: newTotal } : t)));
      await supabase.from("tasks").update({ timer_running: false, timer_start: null, total_time: newTotal }).eq("id", taskId);
    } else {
      const start = Date.now();
      setTasks((p) => p.map((t) => (t.id === taskId ? { ...t, timerRunning: true, timerStart: start } : t)));
      await supabase.from("tasks").update({ timer_running: true, timer_start: start }).eq("id", taskId);
    }
  }, [tasks]);

  const addInterruption = useCallback(async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const next = task.interruptions + 1;
    setTasks((p) => p.map((t) => (t.id === taskId ? { ...t, interruptions: next } : t)));
    await supabase.from("tasks").update({ interruptions: next }).eq("id", taskId);
  }, [tasks]);

  const addTask = useCallback(async (name: string, category: string, startTime: string, endTime: string, subTaskName?: string, recurring?: boolean, taskDate?: string) => {
    if (!user) return;
    const { data, error } = await supabase.from("tasks").insert({
      user_id: user.id, name, category, date: taskDate || selectedDate,
      start_time: startTime, end_time: endTime,
      sub_task_name: subTaskName || null, recurring: recurring || false,
    }).select().single();
    if (error || !data) { toast.error("Failed to add task"); return; }
    setTasks((p) => [...p, rowToTask(data)]);
  }, [user, selectedDate]);

  const editTask = useCallback(async (taskId: string, updates: Partial<Pick<Task, "name" | "category" | "startTime" | "endTime" | "recurring">>, subTaskName?: string) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    if (updates.recurring !== undefined) dbUpdates.recurring = updates.recurring;
    if (subTaskName !== undefined) {
      dbUpdates.sub_task_name = subTaskName || null;
      if (!subTaskName) dbUpdates.sub_task_completed = false;
    }
    setTasks((p) => p.map((t) => {
      if (t.id !== taskId) return t;
      const u = { ...t, ...updates };
      if (subTaskName !== undefined) {
        u.subTask = subTaskName ? { id: t.subTask?.id || `s-${t.id}`, name: subTaskName, completed: t.subTask?.completed || false } : undefined;
      }
      return u;
    }));
    await supabase.from("tasks").update(dbUpdates).eq("id", taskId);
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    setTasks((p) => p.filter((t) => t.id !== taskId));
    await supabase.from("tasks").delete().eq("id", taskId);
  }, []);

  const reorderTasks = useCallback(async (fromIndex: number, toIndex: number) => {
    setTasks((prev) => {
      const updated = [...prev];
      const dateTaskIds = updated.filter((t) => t.date === selectedDate).map((t) => t.id);
      if (fromIndex >= dateTaskIds.length || toIndex >= dateTaskIds.length) return prev;
      const fromId = dateTaskIds[fromIndex];
      const toId = dateTaskIds[toIndex];
      const fromGlobal = updated.findIndex((t) => t.id === fromId);
      const toGlobal = updated.findIndex((t) => t.id === toId);
      const [moved] = updated.splice(fromGlobal, 1);
      updated.splice(toGlobal, 0, moved);
      return updated;
    });
    // Persist sort_order for tasks of the selected date
    setTimeout(async () => {
      const dateTasks = tasks.filter((t) => t.date === selectedDate);
      await Promise.all(
        dateTasks.map((t, i) => supabase.from("tasks").update({ sort_order: i }).eq("id", t.id))
      );
    }, 0);
  }, [selectedDate, tasks]);

  // Notes
  const addNote = useCallback(async (content: string) => {
    if (!user) return;
    const { data } = await supabase.from("notes").insert({
      user_id: user.id, date: getToday(), time: nowTime(), content,
    }).select().single();
    if (data) setNotes((p) => [{ id: data.id, date: data.date, time: data.time, content: data.content }, ...p]);
  }, [user]);

  const editNote = useCallback(async (id: string, content: string) => {
    setNotes((p) => p.map((n) => (n.id === id ? { ...n, content } : n)));
    await supabase.from("notes").update({ content }).eq("id", id);
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    setNotes((p) => p.filter((n) => n.id !== id));
    await supabase.from("notes").delete().eq("id", id);
  }, []);

  // Todos
  const addTodoItem = useCallback(async (text: string) => {
    if (!user) return;
    const { data } = await supabase.from("todos").insert({
      user_id: user.id, text, completed: false, date: getToday(), time: nowTime(),
    }).select().single();
    if (data) setTodos((p) => [{ id: data.id, text: data.text, completed: data.completed, date: data.date, time: data.time }, ...p]);
  }, [user]);

  const editTodoItem = useCallback(async (id: string, text: string) => {
    setTodos((p) => p.map((t) => (t.id === id ? { ...t, text } : t)));
    await supabase.from("todos").update({ text }).eq("id", id);
  }, []);

  const toggleTodoItem = useCallback(async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const newVal = !todo.completed;
    setTodos((p) => p.map((t) => (t.id === id ? { ...t, completed: newVal } : t)));
    await supabase.from("todos").update({ completed: newVal }).eq("id", id);
  }, [todos]);

  const removeTodoItem = useCallback(async (id: string) => {
    setTodos((p) => p.filter((t) => t.id !== id));
    await supabase.from("todos").delete().eq("id", id);
  }, []);

  // Reflections
  const addReflection = useCallback(async (whatIDid: string, whatIFailed: string, planForTomorrow: string) => {
    if (!user) return;
    const { data } = await supabase.from("reflections").insert({
      user_id: user.id, date: getToday(), time: nowTime(),
      what_i_did: whatIDid, what_i_failed: whatIFailed, plan_for_tomorrow: planForTomorrow,
    }).select().single();
    if (data) setReflections((p) => [{
      id: data.id, date: data.date, time: data.time,
      whatIDid: data.what_i_did, whatIFailed: data.what_i_failed, planForTomorrow: data.plan_for_tomorrow,
    }, ...p]);
  }, [user]);

  const editReflection = useCallback(async (id: string, updates: Partial<Pick<ReflectionEntry, "whatIDid" | "whatIFailed" | "planForTomorrow">>) => {
    const dbUpdates: any = {};
    if (updates.whatIDid !== undefined) dbUpdates.what_i_did = updates.whatIDid;
    if (updates.whatIFailed !== undefined) dbUpdates.what_i_failed = updates.whatIFailed;
    if (updates.planForTomorrow !== undefined) dbUpdates.plan_for_tomorrow = updates.planForTomorrow;
    setReflections((p) => p.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    await supabase.from("reflections").update(dbUpdates).eq("id", id);
  }, []);

  const deleteReflection = useCallback(async (id: string) => {
    setReflections((p) => p.filter((r) => r.id !== id));
    await supabase.from("reflections").delete().eq("id", id);
  }, []);

  const completedTasks = tasksForDate.filter((t) => t.completed).length;
  const dayScore = tasksForDate.length > 0 ? Math.round((completedTasks / tasksForDate.length) * 100) : 0;
  const momentumScore = tasks.reduce((sum, t) => sum + t.streak, 0);
  const wastedSlots = tasksForDate.filter((t) => !t.completed).length;
  const diary: DiaryEntry = { id: "d1", date: today, notes: "", whatIDid: "", whatIFailed: "", planForTomorrow: "", todoItems: [] };

  return {
    tasks, allTasks: tasks, tasksForDate, activeView, setActiveView,
    selectedDate, setSelectedDate, goToPrevDay, goToNextDay, goToToday,
    toggleTaskComplete, toggleSubTaskComplete, toggleTimer, addInterruption,
    addTask, editTask, deleteTask, reorderTasks,
    dayScore, momentumScore, completedSlots: completedTasks, wastedSlots,
    notes, addNote, editNote, deleteNote,
    todos, addTodoItem, editTodoItem, toggleTodoItem, removeTodoItem,
    reflections, addReflection, editReflection, deleteReflection,
    diary, updateDiary: () => {},
  };
}
