import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Variants ─────────────────────────────────────────────────────────────────

type CardVariant = "default" | "elevated" | "outlined" | "ghost" | "glass" | "gradient";
type CardSize = "sm" | "md" | "lg";
type CardStatus = "default" | "success" | "warning" | "error" | "info";

interface CardContextValue {
  variant: CardVariant;
  size: CardSize;
  status: CardStatus;
  interactive: boolean;
  loading: boolean;
  collapsible: boolean;
  collapsed: boolean;
  toggleCollapse: () => void;
}

const CardContext = React.createContext<CardContextValue>({
  variant: "default",
  size: "md",
  status: "default",
  interactive: false,
  loading: false,
  collapsible: false,
  collapsed: false,
  toggleCollapse: () => {},
});

// ─── Variant Maps ─────────────────────────────────────────────────────────────

const variantClasses: Record<CardVariant, string> = {
  default:  "border bg-card text-card-foreground shadow-sm",
  elevated: "border-0 bg-card text-card-foreground shadow-lg ring-1 ring-border/40",
  outlined: "border-2 bg-transparent text-card-foreground shadow-none",
  ghost:    "border-0 bg-muted/40 text-card-foreground shadow-none",
  glass:    "border border-white/20 bg-card/60 text-card-foreground shadow-md backdrop-blur-md",
  gradient: "border-0 text-card-foreground shadow-md bg-gradient-to-br from-card via-card to-muted/60",
};

const statusClasses: Record<CardStatus, string> = {
  default: "",
  success: "border-success/40 bg-success/5 ring-1 ring-success/20",
  warning: "border-warning/40 bg-warning/5 ring-1 ring-warning/20",
  error:   "border-destructive/40 bg-destructive/5 ring-1 ring-destructive/20",
  info:    "border-primary/40 bg-primary/5 ring-1 ring-primary/20",
};

const statusAccentClasses: Record<CardStatus, string> = {
  default: "",
  success: "bg-success",
  warning: "bg-warning",
  error:   "bg-destructive",
  info:    "bg-primary",
};

const sizeClasses: Record<CardSize, string> = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
};

const paddingClasses: Record<CardSize, string> = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

// ─── Card ─────────────────────────────────────────────────────────────────────

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  size?: CardSize;
  status?: CardStatus;
  interactive?: boolean;
  loading?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  asChild?: boolean;
  href?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      status = "default",
      interactive = false,
      loading = false,
      collapsible = false,
      defaultCollapsed = false,
      href,
      onClick,
      children,
      ...props
    },
    ref,
  ) => {
    const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
    const toggleCollapse = React.useCallback(() => setCollapsed((v) => !v), []);
    const isInteractive = interactive || !!href || !!onClick;

    const Comp = href ? "a" : "div";

    return (
      <CardContext.Provider
        value={{ variant, size, status, interactive: isInteractive, loading, collapsible, collapsed, toggleCollapse }}
      >
        <Comp
          ref={ref as any}
          href={href}
          onClick={onClick}
          className={cn(
            "relative overflow-hidden transition-all duration-200",
            variantClasses[variant],
            sizeClasses[size],
            status !== "default" && statusClasses[status],
            isInteractive && [
              "cursor-pointer select-none",
              "hover:-translate-y-0.5 hover:shadow-md",
              "active:translate-y-0 active:shadow-sm active:scale-[0.995]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            ],
            loading && "pointer-events-none",
            className,
          )}
          tabIndex={isInteractive ? 0 : undefined}
          aria-busy={loading}
          {...props}
        >
          {/* Status accent bar */}
          {status !== "default" && (
            <div className={cn("absolute inset-x-0 top-0 h-0.5", statusAccentClasses[status])} />
          )}

          {/* Loading skeleton overlay */}
          {loading && (
            <div className="absolute inset-0 z-10 rounded-[inherit] overflow-hidden">
              <div className="absolute inset-0 bg-card/80 backdrop-blur-[1px]" />
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          )}

          {children}
        </Comp>
      </CardContext.Provider>
    );
  },
);
Card.displayName = "Card";

// ─── CardHeader ───────────────────────────────────────────────────────────────

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  action?: React.ReactNode;
  avatar?: React.ReactNode;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, action, avatar, children, ...props }, ref) => {
    const { size, collapsible, collapsed, toggleCollapse } = React.useContext(CardContext);

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-start gap-3",
          paddingClasses[size],
          "pb-0",
          collapsible && "cursor-pointer select-none",
          className,
        )}
        onClick={collapsible ? toggleCollapse : undefined}
        {...props}
      >
        {avatar && (
          <div className="shrink-0 mt-0.5">{avatar}</div>
        )}

        <div className="flex-1 min-w-0 space-y-1">
          {children}
        </div>

        <div className="shrink-0 flex items-center gap-1 mt-0.5">
          {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
          {collapsible && (
            <button
              type="button"
              aria-label={collapsed ? "Expand" : "Collapse"}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <svg
                className={cn("w-4 h-4 transition-transform duration-200", collapsed ? "rotate-0" : "rotate-180")}
                viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  },
);
CardHeader.displayName = "CardHeader";

// ─── CardTitle ────────────────────────────────────────────────────────────────

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  badge?: React.ReactNode;
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Comp = "h3", badge, children, ...props }, ref) => (
    <div className="flex items-center gap-2 flex-wrap">
      <Comp
        ref={ref}
        className={cn("font-semibold leading-snug tracking-tight text-foreground", className)}
        {...props}
      >
        {children}
      </Comp>
      {badge && <span>{badge}</span>}
    </div>
  ),
);
CardTitle.displayName = "CardTitle";

// ─── CardDescription ──────────────────────────────────────────────────────────

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  ),
);
CardDescription.displayName = "CardDescription";

// ─── CardContent ──────────────────────────────────────────────────────────────

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { size, collapsible, collapsed } = React.useContext(CardContext);

    if (collapsible && collapsed) return null;

    return (
      <div
        ref={ref}
        className={cn(paddingClasses[size], "pt-4", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
CardContent.displayName = "CardContent";

// ─── CardFooter ───────────────────────────────────────────────────────────────

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  justify?: "start" | "end" | "between" | "center";
  divider?: boolean;
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, justify = "start", divider = false, children, ...props }, ref) => {
    const { size, collapsible, collapsed } = React.useContext(CardContext);

    if (collapsible && collapsed) return null;

    const justifyClasses = {
      start:   "justify-start",
      end:     "justify-end",
      between: "justify-between",
      center:  "justify-center",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-2 flex-wrap",
          paddingClasses[size],
          "pt-0",
          justifyClasses[justify],
          divider && "border-t mt-2 pt-4",
          className,
        )}
        {...props}
      />
    );
  },
);
CardFooter.displayName = "CardFooter";

// ─── CardDivider ──────────────────────────────────────────────────────────────

const CardDivider = React.forwardRef<HTMLHRElement, React.HTMLAttributes<HTMLHRElement>>(
  ({ className, ...props }, ref) => (
    <hr ref={ref} className={cn("border-t border-border mx-6", className)} {...props} />
  ),
);
CardDivider.displayName = "CardDivider";

// ─── CardImage ────────────────────────────────────────────────────────────────

export interface CardImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  position?: "top" | "bottom";
  aspectRatio?: "video" | "square" | "wide" | "auto";
}

const CardImage = React.forwardRef<HTMLImageElement, CardImageProps>(
  ({ className, position = "top", aspectRatio = "video", alt = "", ...props }, ref) => {
    const aspectClasses = {
      video:  "aspect-video",
      square: "aspect-square",
      wide:   "aspect-[21/9]",
      auto:   "",
    };

    return (
      <div
        className={cn(
          "overflow-hidden",
          position === "top" ? "rounded-t-[inherit]" : "rounded-b-[inherit]",
          aspectRatio !== "auto" && aspectClasses[aspectRatio],
        )}
      >
        <img
          ref={ref}
          alt={alt}
          className={cn("w-full h-full object-cover transition-transform duration-300 group-hover:scale-105", className)}
          {...props}
        />
      </div>
    );
  },
);
CardImage.displayName = "CardImage";

// ─── CardBadge ────────────────────────────────────────────────────────────────

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "outline";

const badgeVariantClasses: Record<BadgeVariant, string> = {
  default: "bg-secondary text-secondary-foreground",
  success: "bg-success/15 text-success border border-success/30",
  warning: "bg-warning/15 text-warning border border-warning/30",
  error:   "bg-destructive/15 text-destructive border border-destructive/30",
  info:    "bg-primary/15 text-primary border border-primary/30",
  outline: "border border-border text-muted-foreground",
};

export interface CardBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const CardBadge = React.forwardRef<HTMLSpanElement, CardBadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        badgeVariantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);
CardBadge.displayName = "CardBadge";

// ─── CardStat ─────────────────────────────────────────────────────────────────

export interface CardStatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  delta?: number;
  icon?: React.ReactNode;
}

const CardStat = React.forwardRef<HTMLDivElement, CardStatProps>(
  ({ className, label, value, delta, icon, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-1", className)} {...props}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="flex items-end gap-2">
        {icon && <span className="text-muted-foreground mb-0.5">{icon}</span>}
        <span className="text-2xl font-bold tabular-nums text-foreground leading-none">{value}</span>
        {delta !== undefined && (
          <span className={cn("text-xs font-medium mb-0.5", delta >= 0 ? "text-success" : "text-destructive")}>
            {delta >= 0 ? "↑" : "↓"}{Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  ),
);
CardStat.displayName = "CardStat";

// ─── CardAvatar ───────────────────────────────────────────────────────────────

export interface CardAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  fallback: string;
  size?: "sm" | "md" | "lg";
  status?: "online" | "offline" | "busy" | "away";
}

const avatarSizeClasses = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base" };
const avatarStatusClasses = { online: "bg-success", offline: "bg-muted-foreground", busy: "bg-destructive", away: "bg-warning" };

const CardAvatar = React.forwardRef<HTMLDivElement, CardAvatarProps>(
  ({ className, src, fallback, size = "md", status, ...props }, ref) => (
    <div ref={ref} className={cn("relative shrink-0", className)} {...props}>
      <div className={cn("rounded-full overflow-hidden bg-muted flex items-center justify-center font-medium text-muted-foreground", avatarSizeClasses[size])}>
        {src
          ? <img src={src} alt={fallback} className="w-full h-full object-cover" />
          : <span>{fallback.slice(0, 2).toUpperCase()}</span>
        }
      </div>
      {status && (
        <span className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card", avatarStatusClasses[status])} />
      )}
    </div>
  ),
);
CardAvatar.displayName = "CardAvatar";

// ─── CardSkeleton ─────────────────────────────────────────────────────────────

export interface CardSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
  showAvatar?: boolean;
  showImage?: boolean;
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({ lines = 3, showAvatar = false, showImage = false, className }) => (
  <Card className={cn("animate-pulse pointer-events-none", className)}>
    {showImage && <div className="aspect-video bg-muted rounded-t-[inherit]" />}
    <CardHeader>
      <div className="flex items-center gap-3">
        {showAvatar && <div className="w-10 h-10 rounded-full bg-muted shrink-0" />}
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className={cn("h-3 bg-muted rounded", i === lines - 1 ? "w-4/5" : "w-full")} />
        ))}
      </div>
    </CardContent>
  </Card>
);
CardSkeleton.displayName = "CardSkeleton";

// ─── useCard hook ─────────────────────────────────────────────────────────────

export function useCard() {
  return React.useContext(CardContext);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardDivider,
  CardImage,
  CardBadge,
  CardStat,
  CardAvatar,
  CardSkeleton,
};