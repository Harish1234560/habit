import { TrendingUp, Clock, Zap, AlertTriangle } from "lucide-react";

interface StatsBarProps {
  dayScore: number;
  completedSlots: number;
  momentumScore: number;
  wastedSlots: number;
}

export function StatsBar({ dayScore, completedSlots, momentumScore, wastedSlots }: StatsBarProps) {
  const stats = [
    
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
