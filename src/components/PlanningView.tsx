import { Task } from "@/lib/store";
import { cn } from "@/lib/utils";

interface PlanningViewProps {
  tasks: Task[];
}

export function PlanningView({ tasks }: PlanningViewProps) {
  const sortedTasks = [...tasks].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-heading font-semibold text-foreground mb-4">Plan</h3>
        <div className="space-y-1">
          {sortedTasks.length === 0 && (
            <p className="text-sm text-muted-foreground">No tasks available for this date.</p>
          )}
          {sortedTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
              <span className="text-xs font-medium text-muted-foreground w-28 shrink-0">
                {task.startTime} - {task.endTime}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary font-medium">
                {task.name}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">{task.category}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
