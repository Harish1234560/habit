import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";
import { Task } from "@/lib/store";

interface AnalyticsDashboardProps {
  tasks: Task[];
  dayScore: number;
  momentumScore: number;
}

export function AnalyticsDashboard({ tasks, dayScore, momentumScore }: AnalyticsDashboardProps) {
  const weeklyScores = [
    { day: "Mon", score: 72, time: 6.5, momentum: 15 },
    { day: "Tue", score: 85, time: 7.2, momentum: 18 },
    { day: "Wed", score: 65, time: 5.8, momentum: 12 },
    { day: "Thu", score: 90, time: 8.0, momentum: 22 },
    { day: "Fri", score: 78, time: 6.8, momentum: 16 },
    { day: "Sat", score: 45, time: 3.2, momentum: 8 },
    { day: "Sun", score: dayScore, time: 4.5, momentum: momentumScore },
  ];

  const categoryData = tasks.reduce((acc, t) => {
    const existing = acc.find((a) => a.category === t.category);
    if (existing) {
      existing.total += 1;
      if (t.completed) existing.completed += 1;
    } else {
      acc.push({ category: t.category, completed: t.completed ? 1 : 0, total: 1 });
    }
    return acc;
  }, [] as { category: string; completed: number; total: number }[]);

  const distractionData = tasks.map((t) => ({
    name: t.name.slice(0, 12),
    interruptions: t.interruptions,
    focus: Math.max(0, 10 - t.interruptions),
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Weekly Score</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyScores}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Time Spent</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyScores}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="time" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">By Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="completed" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="total" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Focus vs Distractions</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distractionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={80} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="focus" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
              <Bar dataKey="interruptions" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
