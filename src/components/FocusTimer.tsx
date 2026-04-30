import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, AlertCircle, Timer, Target, SkipForward, Volume2, VolumeX, ChevronDown, ChevronUp, Flame, Zap, Coffee, Brain } from "lucide-react";
import { Task } from "@/lib/store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionRecord {
  taskId: string;
  taskName: string;
  duration: number;
  distractions: number;
  endedAt: number;
  mood?: MoodType;
  focusScore: number;
}

type MoodType = "great" | "good" | "okay" | "poor";
type SoundType = "none" | "rain" | "white" | "forest" | "cafe";
type TimerMode = "countdown" | "stopwatch" | "pomodoro";

interface FocusTimerProps {
  tasks: Task[];
  onToggleTimer: (taskId: string) => void;
  onAddInterruption: (taskId: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POMODORO_WORK_S = 25 * 60;
const POMODORO_BREAK_S = 5 * 60;
const LONG_BREAK_S = 15 * 60;
const MAX_SESSION_LOG = 10;
const RING_R = 54;
const RING_C = 2 * Math.PI * RING_R;

const FOCUS_PRESETS = [
  { label: "Quick", minutes: 15, icon: "⚡" },
  { label: "Focus", minutes: 25, icon: "🎯" },
  { label: "Deep", minutes: 50, icon: "🧠" },
  { label: "Flow", minutes: 90, icon: "🌊" },
];

const MOOD_OPTIONS: { value: MoodType; emoji: string; label: string }[] = [
  { value: "great", emoji: "😄", label: "Great" },
  { value: "good", emoji: "🙂", label: "Good" },
  { value: "okay", emoji: "😐", label: "Okay" },
  { value: "poor", emoji: "😓", label: "Poor" },
];

const AMBIENT_SOUNDS: { value: SoundType; label: string; emoji: string }[] = [
  { value: "none", label: "Silent", emoji: "🔇" },
  { value: "rain", label: "Rain", emoji: "🌧️" },
  { value: "white", label: "White noise", emoji: "〰️" },
  { value: "forest", label: "Forest", emoji: "🌲" },
  { value: "cafe", label: "Café", emoji: "☕" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function formatTimeShort(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function ringOffset(elapsed: number, goal: number): number {
  if (goal <= 0) return 0;
  const progress = clamp(elapsed / goal, 0, 1);
  return RING_C * (1 - progress);
}

function calcFocusScore(duration: number, distractions: number): number {
  if (duration === 0) return 0;
  const base = Math.min(100, Math.round((duration / (25 * 60)) * 100));
  const penalty = distractions * 8;
  return Math.max(0, base - penalty);
}

function playBeep(freq = 440, duration = 0.3, type: OscillatorType = "sine") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function sendNotification(title: string, body: string) {
  if (typeof window === "undefined") return;
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MoodPicker({ onSelect }: { onSelect: (m: MoodType) => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <p className="text-sm text-muted-foreground font-medium">How was your focus?</p>
      <div className="flex gap-3">
        {MOOD_OPTIONS.map((m) => (
          <button
            key={m.value}
            onClick={() => onSelect(m.value)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-muted transition-colors"
          >
            <span className="text-2xl">{m.emoji}</span>
            <span className="text-xs text-muted-foreground">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FocusScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-success bg-success/10" :
    score >= 50 ? "text-warning bg-warning/10" :
    "text-destructive bg-destructive/10";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {score}pts
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FocusTimer({ tasks, onToggleTimer, onAddInterruption }: FocusTimerProps) {
  // ── Core state
  const [selectedTask, setSelectedTask] = useState(tasks[0]?.id ?? "");
  const [elapsed, setElapsed] = useState(0);
  const [timerMode, setTimerMode] = useState<TimerMode>("pomodoro");
  const [isBreak, setIsBreak] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [goalMinutes, setGoalMinutes] = useState(25);

  // ── UI state
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [showSessionLog, setShowSessionLog] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [pendingSession, setPendingSession] = useState<Omit<SessionRecord, "mood"> | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [ambientSound, setAmbientSound] = useState<SoundType>("none");

  // ── Session state
  const [sessionLog, setSessionLog] = useState<SessionRecord[]>([]);
  const [sessionDistractions, setSessionDistractions] = useState(0);
  const [dailyFocusSeconds, setDailyFocusSeconds] = useState(0);
  const [dailyGoalMinutes] = useState(120);

  // ── Refs
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const sessionStartRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // ── Derived
  const task = tasks.find((t) => t.id === selectedTask);
  const isRunning = task?.timerRunning ?? false;
  const pomodoroTarget = isBreak
    ? (pomodoroCount > 0 && pomodoroCount % 4 === 0 ? LONG_BREAK_S : POMODORO_BREAK_S)
    : POMODORO_WORK_S;
  const goalSeconds = goalMinutes * 60;
  const ringGoal =
    timerMode === "pomodoro" ? pomodoroTarget :
    timerMode === "countdown" ? goalSeconds : 0;
  const offset = timerMode === "stopwatch" ? 0 : ringOffset(elapsed, ringGoal);
  const progressPct = ringGoal > 0 ? Math.min(100, Math.round((elapsed / ringGoal) * 100)) : 0;
  const dailyProgressPct = Math.min(100, Math.round((dailyFocusSeconds / (dailyGoalMinutes * 60)) * 100));

  // ── Sync selected task
  useEffect(() => {
    if (!tasks.length) { setSelectedTask(""); return; }
    if (!tasks.some((t) => t.id === selectedTask)) setSelectedTask(tasks[0].id);
  }, [tasks, selectedTask]);

  // ── Notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ── Ticker
  useEffect(() => {
    clearInterval(intervalRef.current);

    if (isRunning && task?.timerStart) {
      if (!sessionStartRef.current) sessionStartRef.current = task.timerStart;

      intervalRef.current = setInterval(() => {
        const e = Math.floor((Date.now() - task.timerStart!) / 1000);
        setElapsed(e);
        setDailyFocusSeconds((p) => p + 1);

        if (timerMode === "pomodoro" && e >= pomodoroTarget) {
          handlePomodoroComplete();
        } else if (timerMode === "countdown" && e >= goalSeconds) {
          handleCountdownComplete();
        }
      }, 1000);
    } else if (!isRunning) {
      setElapsed(0);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, task?.timerStart, timerMode, pomodoroTarget, goalSeconds]);

  // ── Pomodoro complete
  const handlePomodoroComplete = useCallback(() => {
    onToggleTimer(selectedTask);
    if (soundEnabled) {
      playBeep(880, 0.5, "sine");
      setTimeout(() => playBeep(1100, 0.4, "sine"), 600);
    }
    const nextIsBreak = !isBreak;
    if (!isBreak) setPomodoroCount((c) => c + 1);
    setIsBreak(nextIsBreak);
    setElapsed(0);
    const msg = nextIsBreak
      ? pomodoroCount > 0 && (pomodoroCount + 1) % 4 === 0
        ? "4 pomodoros done! Take a 15-min long break 🎉"
        : "Work session done! Take a 5-min break ☕"
      : "Break over! Back to focus 💪";
    sendNotification("Focus Timer", msg);
  }, [isBreak, pomodoroCount, selectedTask, soundEnabled, onToggleTimer]);

  // ── Countdown complete
  const handleCountdownComplete = useCallback(() => {
    onToggleTimer(selectedTask);
    if (soundEnabled) playBeep(660, 1.0, "triangle");
    sendNotification("Focus Timer", `Goal of ${goalMinutes} minutes reached! 🎯`);
  }, [selectedTask, goalMinutes, soundEnabled, onToggleTimer]);

  // ── Toggle
  const handleToggle = useCallback(() => {
    if (!selectedTask) return;

    if (isRunning && sessionStartRef.current && elapsed > 0) {
      const score = calcFocusScore(elapsed, sessionDistractions);
      const record: Omit<SessionRecord, "mood"> = {
        taskId: selectedTask,
        taskName: task?.name ?? "Unknown",
        duration: elapsed,
        distractions: sessionDistractions,
        endedAt: Date.now(),
        focusScore: score,
      };
      setPendingSession(record);
      setShowMoodPicker(true);
      sessionStartRef.current = null;
      setSessionDistractions(0);
    }

    if (soundEnabled && !isRunning) playBeep(520, 0.15);
    onToggleTimer(selectedTask);
  }, [selectedTask, isRunning, elapsed, sessionDistractions, task, soundEnabled, onToggleTimer]);

  // ── Mood selected — finalize session log
  const handleMoodSelect = useCallback((mood: MoodType) => {
    if (!pendingSession) return;
    setSessionLog((prev) => [{ ...pendingSession, mood }, ...prev].slice(0, MAX_SESSION_LOG));
    setPendingSession(null);
    setShowMoodPicker(false);
  }, [pendingSession]);

  // ── Distraction
  const handleDistraction = useCallback(() => {
    if (!selectedTask || !isRunning) return;
    setSessionDistractions((n) => n + 1);
    if (soundEnabled) playBeep(220, 0.2, "sawtooth");
    onAddInterruption(selectedTask);
  }, [selectedTask, isRunning, soundEnabled, onAddInterruption]);

  // ── Reset
  const handleReset = useCallback(() => {
    if (isRunning) onToggleTimer(selectedTask);
    setElapsed(0);
    setIsBreak(false);
    setPomodoroCount(0);
    setSessionDistractions(0);
    setShowMoodPicker(false);
    setPendingSession(null);
    sessionStartRef.current = null;
  }, [isRunning, selectedTask, onToggleTimer]);

  // ── Skip (pomodoro only)
  const handleSkip = useCallback(() => {
    if (isRunning) onToggleTimer(selectedTask);
    setIsBreak((b) => !b);
    setElapsed(0);
  }, [isRunning, selectedTask, onToggleTimer]);

  // ── Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); handleToggle(); }
      if (e.code === "KeyD") { e.preventDefault(); handleDistraction(); }
      if (e.code === "KeyR") { e.preventDefault(); handleReset(); }
      if (e.code === "KeyS") { e.preventDefault(); setSoundEnabled((v) => !v); }
      if (e.code === "KeyN" && timerMode === "pomodoro") { e.preventDefault(); handleSkip(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleToggle, handleDistraction, handleReset, handleSkip, timerMode]);

  // ── Ring color
  const ringColor =
    timerMode === "pomodoro" && isBreak ? "#22c55e" :
    timerMode === "countdown" && elapsed >= goalSeconds * 0.9 ? "#ef4444" :
    "hsl(var(--primary))";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" /> Focus Session
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={() => setSoundEnabled((v) => !v)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Toggle sound (S)">
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button onClick={() => setShowGoalInput((v) => !v)} className={`p-1.5 rounded-lg transition-colors ${showGoalInput ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`} title="Set goal">
            <Target className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted">
        {(["pomodoro", "countdown", "stopwatch"] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setTimerMode(m); handleReset(); }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${timerMode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {m === "pomodoro" ? "🍅 Pomodoro" : m === "countdown" ? "⏳ Countdown" : "⏱ Stopwatch"}
          </button>
        ))}
      </div>

      {/* Pomodoro progress dots */}
      {timerMode === "pomodoro" && (
        <div className="flex items-center justify-center gap-3">
          <div className="flex gap-1.5">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${i < pomodoroCount % 4 ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isBreak ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-primary/10 text-primary"}`}>
            {isBreak
              ? pomodoroCount % 4 === 0 && pomodoroCount > 0 ? "☕ Long break — 15 min" : "☕ Break — 5 min"
              : `🍅 Round ${(pomodoroCount % 4) + 1} of 4`}
          </span>
          <span className="text-xs text-muted-foreground">{pomodoroCount} done</span>
        </div>
      )}

      {/* Goal input / presets */}
      {(showGoalInput || timerMode === "countdown") && timerMode !== "pomodoro" && timerMode !== "stopwatch" && (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            {FOCUS_PRESETS.map((p) => (
              <button
                key={p.minutes}
                onClick={() => setGoalMinutes(p.minutes)}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${goalMinutes === p.minutes ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                {p.icon} {p.label}<br />
                <span className="font-medium">{p.minutes}m</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-1">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Custom (min)</label>
            <input type="number" min={1} max={180} value={goalMinutes} onChange={(e) => setGoalMinutes(Math.max(1, Number(e.target.value)))} className="w-20 px-2 py-1 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-xs text-muted-foreground w-10 shrink-0">{progressPct}%</span>
          </div>
        </div>
      )}

      {/* Ambient sound */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {AMBIENT_SOUNDS.map((s) => (
          <button
            key={s.value}
            onClick={() => setAmbientSound(s.value)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs whitespace-nowrap border transition-all ${ambientSound === s.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-5">
        {/* Task selector */}
        <select
          value={selectedTask}
          onChange={(e) => { if (!isRunning) { setSelectedTask(e.target.value); setElapsed(0); } }}
          className="w-full max-w-xs px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          disabled={isRunning}
        >
          {!tasks.length && <option value="">No tasks available</option>}
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.completed ? "✓ " : ""}{t.name}
            </option>
          ))}
        </select>

        {/* Ring */}
        <div className="relative flex items-center justify-center w-44 h-44">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={RING_R} fill="none" stroke="currentColor" strokeWidth="7" className="text-muted/30" />
            <circle
              cx="60" cy="60" r={RING_R} fill="none"
              stroke={ringColor} strokeWidth="7" strokeLinecap="round"
              strokeDasharray={`${RING_C} ${RING_C}`}
              strokeDashoffset={timerMode === "stopwatch" ? 0 : offset}
              style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.3s" }}
            />
          </svg>
          <div className="flex flex-col items-center z-10">
            <span className="text-4xl font-heading font-bold text-foreground tabular-nums leading-none">
              {timerMode === "countdown" && ringGoal > 0
                ? formatTime(Math.max(0, ringGoal - elapsed))
                : formatTime(elapsed)}
            </span>
            {timerMode !== "stopwatch" && ringGoal > 0 && (
              <span className="text-xs text-muted-foreground mt-1">{progressPct}%</span>
            )}
            {isRunning && (
              <span className="mt-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </div>
        </div>

        {/* Session distractions live */}
        {isRunning && sessionDistractions > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-destructive">
            <Zap className="w-3.5 h-3.5" />
            <span>{sessionDistractions} distraction{sessionDistractions > 1 ? "s" : ""} this session</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={handleToggle}
            disabled={!selectedTask}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            {isRunning ? "Pause" : "Start"}
          </button>
          {timerMode === "pomodoro" && (
            <button onClick={handleSkip} disabled={!selectedTask} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors disabled:opacity-40" title="Skip (N)">
              <SkipForward className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleDistraction}
            disabled={!selectedTask || !isRunning}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-destructive/10 text-destructive font-medium hover:bg-destructive/20 transition-colors disabled:opacity-40"
            title="Log distraction (D)"
          >
            <AlertCircle className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            disabled={!selectedTask}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors disabled:opacity-40"
            title="Reset (R)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Keyboard hints */}
        <p className="text-xs text-muted-foreground flex gap-2 flex-wrap justify-center">
          {[["Space", "start/pause"], ["D", "distraction"], ["R", "reset"], ["S", "sound"], ...(timerMode === "pomodoro" ? [["N", "skip"]] : [])].map(([k, v]) => (
            <span key={k}>
              <kbd className="px-1 py-0.5 rounded border border-border font-mono text-[10px]">{k}</kbd> {v}
            </span>
          ))}
        </p>

        {/* Mood picker (post-session) */}
        {showMoodPicker && <MoodPicker onSelect={handleMoodSelect} />}

        {/* Daily goal bar */}
        <div className="w-full max-w-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> Daily goal</span>
            <span>{formatTimeShort(dailyFocusSeconds)} / {dailyGoalMinutes}m</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500" style={{ width: `${dailyProgressPct}%` }} />
          </div>
        </div>

        {/* Task stats */}
        {task && (
          <div className="grid grid-cols-3 gap-3 w-full max-w-sm text-center">
            <div className="p-3 rounded-xl bg-muted">
              <p className="text-base font-heading font-bold text-foreground tabular-nums">{formatTime(task.totalTime)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total time</p>
            </div>
            <div className="p-3 rounded-xl bg-muted">
              <p className="text-base font-heading font-bold text-destructive">{task.interruptions ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Distractions</p>
            </div>
            <div className="p-3 rounded-xl bg-muted">
              <p className="text-base font-heading font-bold text-foreground">{task.streak}🔥</p>
              <p className="text-xs text-muted-foreground mt-0.5">Streak</p>
            </div>
          </div>
        )}

        {/* Session log */}
        {sessionLog.length > 0 && (
          <div className="w-full max-w-sm">
            <button
              onClick={() => setShowSessionLog((v) => !v)}
              className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2"
            >
              <span>Session history ({sessionLog.length})</span>
              {showSessionLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showSessionLog && (
              <ul className="space-y-1.5">
                {sessionLog.map((s, i) => (
                  <li key={i} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-muted/50 gap-2">
                    <span className="truncate text-foreground max-w-[110px]">{s.taskName}</span>
                    <span className="text-xs text-muted-foreground">{s.mood ? MOOD_OPTIONS.find((m) => m.value === s.mood)?.emoji : ""}</span>
                    <FocusScoreBadge score={s.focusScore} />
                    <span className="text-muted-foreground tabular-nums shrink-0 text-xs">
                      {formatTime(s.duration)}
                      {s.distractions > 0 && <span className="ml-1.5 text-destructive">·{s.distractions}⚡</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}