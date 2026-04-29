import { Task } from "@/lib/store";
import { Zap, TrendingUp, Award } from "lucide-react";
import { motion } from "framer-motion";

interface MomentumViewProps {
  tasks: Task[];
  momentumScore: number;
}

export function MomentumView({ tasks, momentumScore }: MomentumViewProps) {
  const sortedByStreak = [...tasks].sort((a, b) => b.streak - a.streak);
  const maxStreak = Math.max(...tasks.map((t) => t.streak), 1);

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <Zap className="w-12 h-12 text-warning mx-auto mb-3" />
        <p className="text-5xl font-heading font-bold text-foreground">{momentumScore}</p>
        <p className="text-muted-foreground mt-1">Momentum Score</p>
        <div className="mt-4 flex justify-center gap-6">
          <div>
            <p className="text-lg font-heading font-bold text-success">{sortedByStreak[0]?.streak || 0}</p>
            <p className="text-xs text-muted-foreground">Best Streak</p>
          </div>
          <div>
            <p className="text-lg font-heading font-bold text-foreground">{tasks.length}</p>
            <p className="text-xs text-muted-foreground">Active Habits</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" /> Streak Leaderboard
        </h3>
        <div className="space-y-3">
          {sortedByStreak.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3"
            >
              <span className="text-sm font-heading font-bold text-muted-foreground w-6">#{i + 1}</span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-foreground">{task.name}</span>
                  <span className="text-sm font-heading font-bold text-foreground">{task.streak}🔥</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(task.streak / maxStreak) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
