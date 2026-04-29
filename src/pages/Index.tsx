import { AppSidebar } from "@/components/AppSidebar";
import { StatsBar } from "@/components/StatsBar";
import { TaskListView } from "@/components/TaskListView";
import { FocusTimer } from "@/components/FocusTimer";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { MomentumView } from "@/components/MomentumView";
import { PlanningView } from "@/components/PlanningView";
import { PerfectDayView } from "@/components/PerfectDayView";
import { DiaryView } from "@/components/DiaryView";
import { CalendarOverview } from "@/components/CalendarOverview";
import { useProductivityStore } from "@/lib/store";

export default function Index() {
  const store = useProductivityStore();

  const renderView = () => {
    switch (store.activeView) {
      case "tasks":
        return (
          <TaskListView
            tasks={store.tasksForDate}
            selectedDate={store.selectedDate}
            onPickDate={store.setSelectedDate}
            onGoToPrev={store.goToPrevDay}
            onGoToNext={store.goToNextDay}
            onGoToToday={store.goToToday}
            onToggleComplete={store.toggleTaskComplete}
            onToggleSubTask={store.toggleSubTaskComplete}
            onToggleTimer={store.toggleTimer}
            onAddTask={store.addTask}
            onEditTask={store.editTask}
            onDeleteTask={store.deleteTask}
            onReorderTasks={store.reorderTasks}
          />
        );
      case "calendar":
        return (
          <CalendarOverview
            allTasks={store.allTasks}
            onSelectDate={store.setSelectedDate}
            onNavigateToTasks={() => store.setActiveView("tasks")}
          />
        );
      case "timer":
        return <FocusTimer tasks={store.tasksForDate} onToggleTimer={store.toggleTimer} onAddInterruption={store.addInterruption} />;
      case "analytics":
        return <AnalyticsDashboard tasks={store.tasks} dayScore={store.dayScore} momentumScore={store.momentumScore} />;
      case "momentum":
        return <MomentumView tasks={store.tasks} momentumScore={store.momentumScore} />;
      case "planning":
        return <PlanningView tasks={store.tasksForDate} />;
      case "compare":
        return <PerfectDayView tasks={store.tasks} dayScore={store.dayScore} />;
      case "diary":
        return (
          <DiaryView
            notes={store.notes}
            todos={store.todos}
            reflections={store.reflections}
            onAddNote={store.addNote}
            onEditNote={store.editNote}
            onDeleteNote={store.deleteNote}
            onAddTodo={store.addTodoItem}
            onEditTodo={store.editTodoItem}
            onToggleTodo={store.toggleTodoItem}
            onRemoveTodo={store.removeTodoItem}
            onAddReflection={store.addReflection}
            onEditReflection={store.editReflection}
            onDeleteReflection={store.deleteReflection}
          />
        );
      default:
        return null;
    }
  };

  const viewLabels: Record<string, string> = {
    tasks: "Tasks", calendar: "Calendar", timer: "Focus Timer", analytics: "Analytics",
    momentum: "Momentum", planning: "Planning", compare: "Perfect Day", diary: "Diary",
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <AppSidebar activeView={store.activeView} onViewChange={store.setActiveView} />
      <main className="flex-1 p-3 md:p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-heading font-bold text-foreground">{viewLabels[store.activeView] || ""}</h2>
            <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          </div>
          <StatsBar dayScore={store.dayScore} completedSlots={store.completedSlots} momentumScore={store.momentumScore} wastedSlots={store.wastedSlots} />
          {renderView()}
        </div>
      </main>
    </div>
  );
}
