import { CheckSquare, Timer, BarChart3, Zap, Target, Calendar, CalendarDays, BookOpen, LogOut, User, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const NAV_ITEMS = [
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "timer", label: "Focus Timer", icon: Timer },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "momentum", label: "Momentum", icon: Zap },
  { id: "planning", label: "Planning", icon: Calendar },
  { id: "compare", label: "Perfect Day", icon: Target },
  { id: "diary", label: "Diary", icon: BookOpen },
];

interface AppSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function AppSidebar({ activeView, onViewChange }: AppSidebarProps) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  return (
    <aside className="w-full md:w-64 border-b md:border-r border-border bg-card flex flex-col md:h-screen md:sticky md:top-0">
      <div className="p-4 md:p-6 border-b border-border">
        <h1 className="text-lg md:text-xl font-heading font-bold text-foreground tracking-tight">
          LifeOS <span className="text-primary">Ultra</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Time Intelligence System</p>
      </div>
      <nav className="md:flex-1 p-2 md:p-3 flex md:block gap-1 overflow-x-auto md:overflow-visible">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              "shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap",
              activeView === item.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-2 md:p-3 border-t border-border flex md:block gap-1 overflow-x-auto md:overflow-visible">
        {user && (
          <div className="hidden md:block px-3 py-2 text-xs text-muted-foreground truncate" title={user.email ?? ""}>
            {user.email}
          </div>
        )}
        <Link
          to="/profile"
          className="shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 py-2 rounded-lg text-xs md:text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors whitespace-nowrap"
        >
          <User className="w-4 h-4" />
          Profile
        </Link>
        {isAdmin && (
          <Link
            to="/admin"
            className="shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 py-2 rounded-lg text-xs md:text-sm text-primary hover:bg-muted transition-colors whitespace-nowrap"
          >
            <Shield className="w-4 h-4" />
            Admin
          </Link>
        )}
        <button
          onClick={signOut}
          className="shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 py-2 rounded-lg text-xs md:text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors whitespace-nowrap"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
