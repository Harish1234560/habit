import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, AlertCircle, Timer, Target } from "lucide-react";
import { Task } from "@/lib/store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionRecord {
  taskId: string;
  taskName: string;
  duration: number;       // seconds
  distractions: number;
  endedAt: number;        // Date.now()
}

interface FocusTimerProps {
  tasks: Task[];
  onToggleTimer: (taskId: string) => void;
  onAddInterruption: (taskId: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POMODORO_WORK_S = 25 * 60;
const POMODORO_BREAK_S = 5 * 60;
const MAX_SESSION_LOG = 5;

// ─── Helpers (pure, defined outside component) ───────────────────────────────

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Circumference of the SVG progress ring */
const RING_R = 54;
const RING_C = 2 * Math.PI * RING_R;

function ringOffset(elapsed: number, goal: number): number {
  if (goal <= 0) return RING_C;
  const progress = clamp(elapsed / goal, 0, 1);
  return RING_C * (1 - progress);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FocusTimer({ tasks, onToggleTimer, onAddInterruption }: FocusTimerProps) {
  const [selectedTask, setSelectedTask] = useState(tasks[0]?.id ?? "");
  const [elapsed, setElapsed] = useState(0);
  const [pomodoroMode, setPomodoroMode] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [goalMinutes, setGoalMinutes] = useState(25);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [sessionLog, setSessionLog] = useState<SessionRecord[]>([]);
  const [sessionDistractions, setSessionDistractions] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const sessionStartRef = useRef<number | null>(null);

  const task = tasks.find((t) => t.id === selectedTask);
  const goalSeconds = goalMinutes * 60;
  const pomodoroTarget = isBreak ? POMODORO_BREAK_S : POMODORO_WORK_S;
  const ringGoal = pomodoroMode ? pomodoroTarget : goalSeconds;

  // ── Sync selectedTask when tasks list changes ─────────────────────────────

  useEffect(() => {
    if (tasks.length === 0) { setSelectedTask(""); return; }
    if (!tasks.some((t) => t.id === selectedTask)) setSelectedTask(tasks[0].id);
  }, [tasks, selectedTask]);

  // ── Request notification permission once ──────────────────────────────────

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ── Elapsed ticker ────────────────────────────────────────────────────────

  useEffect(() => {
    clearInterval(intervalRef.current);

    if (task?.timerRunning && task.timerStart) {
      if (!sessionStartRef.current) sessionStartRef.current = task.timerStart;

      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const e = Math.floor((now - task.timerStart!) / 1000);
        setElapsed(e);

        // Pomodoro auto-advance
        if (pomodoroMode && e >= pomodoroTarget) {
          onToggleTimer(selectedTask);           // stop the task timer
          const nextIsBreak = !isBreak;
          setIsBreak(nextIsBreak);
          setElapsed(0);
          const msg = nextIsBreak
            ? "Work session done! Time for a 5-minute break 🎉"
            : "Break over! Back to focus 💪";
          if (Notification.permission === "granted") {
            new Notification("Focus Timer", { body: msg });
          }
        }
      }, 1000);
    } else {
      if (!task?.timerRunning) setElapsed(0);
    }

    return () => clearInterval(intervalRef.current);
  }, [task?.timerRunning, task?.timerStart, pomodoroMode, pomodoroTarget, isBreak, selectedTask, onToggleTimer]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleToggle = useCallback(() => {
    if (!selectedTask) return;

    // Log session when pausing
    if (task?.timerRunning && sessionStartRef.current && elapsed > 0) {
      setSessionLog((prev) => [
        {
          taskId: selectedTask,
          taskName: task?.name ?? "Unknown",
          duration: elapsed,
          distractions: sessionDistractions,
          endedAt: Date.now(),
        },
        ...prev,
      ].slice(0, MAX_SESSION_LOG));
      sessionStartRef.current = null;
      setSessionDistractions(0);
    }

    onToggleTimer(selectedTask);
  }, [selectedTask, task, elapsed, sessionDistractions, onToggleTimer]);

  const handleDistraction = useCallback(() => {
    if (!selectedTask) return;
    setSessionDistractions((n) => n + 1);
    onAddInterruption(selectedTask);
  }, [selectedTask, onAddInterruption]);

  const handleReset = useCallback(() => {
    if (task?.timerRunning) onToggleTimer(selectedTask);
    setElapsed(0);
    setIsBreak(false);
    setSessionDistractions(0);
    sessionStartRef.current = null;
  }, [task?.timerRunning, selectedTask, onToggleTimer]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === "Space") { e.preventDefault(); handleToggle(); }
      if (e.code === "KeyD") { e.preventDefault(); handleDistraction(); }
      if (e.code === "KeyR") { e.preventDefault(); handleReset(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleToggle, handleDistraction, handleReset]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const isRunning = task?.timerRunning ?? false;
  const offset = ringOffset(elapsed, ringGoal);
  const progressPct = ringGoal > 0 ? Math.min(100, Math.round((elapsed / ringGoal) * 100)) : 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-foreground">Focus Session</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGoalInput((v) => !v)}
            title="Set session goal"
            className={`p-1.5 rounded-lg transition-colors ${showGoalInput ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Target className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setPomodoroMode((v) => !v); setIsBreak(false); setElapsed(0); }}
            title="Toggle Pomodoro mode"
            className={`p-1.5 rounded-lg transition-colors ${pomodoroMode ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Timer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pomodoro badge */}
      {pomodoroMode && (
        <div className="flex justify-center">
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${isBreak ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-primary/10 text-primary"}`}>
            {isBreak ? "☕ Break — 5 min" : "🍅 Pomodoro — 25 min"}
          </span>
        </div>
      )}

      {/* Goal input */}
      {showGoalInput && !pomodoroMode && (
        <div className="flex items-center gap-2 px-1">
          <label className="text-sm text-muted-foreground whitespace-nowrap">Goal (min)</label>
          <input
            type="number"
            min={1}
            max={180}
            value={goalMinutes}
            onChange={(e) => setGoalMinutes(Math.max(1, Number(e.target.value)))}
            className="w-20 px-2 py-1 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">{progressPct}% complete</span>
        </div>
      )}

      <div className="flex flex-col items-center gap-6">
        {/* Task selector */}
        <select
          value={selectedTask}
          onChange={(e) => { setSelectedTask(e.target.value); setElapsed(0); }}
          className="w-full max-w-xs px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {tasks.length === 0 && <option value="">No tasks available</option>}
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        {/* Ring + timer */}
        <div className="relative flex items-center justify-center w-40 h-40">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
            {/* Track */}
            <circle cx="60" cy="60" r={RING_R} fill="none" stroke="currentColor"
              strokeWidth="6" className="text-muted/30" />
            {/* Progress */}
            <circle cx="60" cy="60" r={RING_R} fill="none"
              stroke={isBreak ? "#22c55e" : "hsl(var(--primary))"}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
          </svg>
          <span className="text-4xl font-heading font-bold text-foreground tabular-nums z-10">
            {formatTime(elapsed)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <button
            onClick={handleToggle}
            disabled={!selectedTask}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            {isRunning ? "Pause" : "Start"}
          </button>

          <button
            onClick={handleDistraction}
            disabled={!selectedTask || !isRunning}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 text-destructive font-medium hover:bg-destructive/20 transition-colors disabled:opacity-40"
          >
            <AlertCircle className="w-5 h-5" />
            Distraction
          </button>

          <button
            onClick={handleReset}
            disabled={!selectedTask}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors disabled:opacity-40"
            title="Reset (R)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Keyboard hint */}
        <p className="text-xs text-muted-foreground">
          <kbd className="px-1 py-0.5 rounded border border-border font-mono text-[10px]">Space</kbd> start/pause ·{" "}
          <kbd className="px-1 py-0.5 rounded border border-border font-mono text-[10px]">D</kbd> distraction ·{" "}
          <kbd className="px-1 py-0.5 rounded border border-border font-mono text-[10px]">R</kbd> reset
        </p>

        {/* Stats */}
        {task && (
          <div className="grid grid-cols-3 gap-4 w-full max-w-sm text-center">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-lg font-heading font-bold text-foreground">{formatTime(task.totalTime)}</p>
              <p className="text-xs text-muted-foreground">Total Time</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-lg font-heading font-bold text-foreground">{task.interruptions}</p>
              <p className="text-xs text-muted-foreground">Distractions</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-lg font-heading font-bold text-foreground">{task.streak}🔥</p>
              <p className="text-xs text-muted-foreground">Streak</p>
            </div>
          </div>
        )}

        {/* Session log */}
        {sessionLog.length > 0 && (
          <div className="w-full max-w-sm">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Recent sessions</p>
            <ul className="space-y-1.5">
              {sessionLog.map((s, i) => (
                <li key={i} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-muted/50">
                  <span className="text-foreground truncate max-w-[140px]">{s.taskName}</span>
                  <span className="text-muted-foreground tabular-nums shrink-0 ml-2">
                    {formatTime(s.duration)}
                    {s.distractions > 0 && (
                      <span className="ml-2 text-destructive text-xs">·{s.distractions}⚡</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}