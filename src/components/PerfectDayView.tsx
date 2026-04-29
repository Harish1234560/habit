import { Task } from "@/lib/store";
import { CheckCircle2, XCircle } from "lucide-react";

interface PerfectDayViewProps {
  tasks: Task[];
  dayScore: number;
}

export function PerfectDayView({ tasks, dayScore }: PerfectDayViewProps) {
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <p className="text-5xl font-heading font-bold text-foreground">{dayScore}%</p>
        <p className="text-muted-foreground mt-1">Actual vs Ideal Match</p>
        <div className="mt-4 w-full h-3 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${dayScore}%` }} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-heading font-semibold text-foreground mb-4">Task Completion Status</h3>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {task.completed ? (
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">{task.name}</span>
                  <span className="text-xs text-muted-foreground">{task.startTime} – {task.endTime}</span>
                </div>
                <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: task.completed ? "100%" : "0%" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
