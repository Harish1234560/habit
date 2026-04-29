import { NavLink as RouterNavLink, NavLinkProps, useNavigate } from "react-router-dom";
import { forwardRef, useCallback, useRef, useState, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type NavLinkState = "active" | "pending" | "transitioning" | "default";

type ClassNameResolver =
  | string
  | ((state: { isActive: boolean; isPending: boolean; isTransitioning: boolean }) => string);

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  /** Static or dynamic className. Receives full state including `isTransitioning`. */
  className?: ClassNameResolver;

  /** Applied when the route is active. */
  activeClassName?: string;

  /** Applied while the route is loading (React Router pending state). */
  pendingClassName?: string;

  /** Applied during a View Transition (if `unstable_viewTransition` is enabled). */
  transitioningClassName?: string;

  // ── Visual extras ──────────────────────────────────────────────────────────

  /** Icon rendered to the left of children. */
  icon?: ReactNode;

  /**
   * Badge shown to the right.
   * Pass a number > 0 to show a numeric count (capped at 99+).
   * Pass `true` to show a dot badge.
   */
  badge?: number | boolean;

  /** Tooltip text shown on hover (via title attribute + custom tooltip). */
  tooltip?: string;

  // ── Behaviour ──────────────────────────────────────────────────────────────

  /**
   * Prefetch strategy:
   * - `"hover"` (default) — prefetch on mouseenter after `prefetchDelay` ms
   * - `"render"` — prefetch as soon as the link mounts
   * - `"none"` — no prefetching
   */
  prefetch?: "hover" | "render" | "none";

  /** Delay in ms before hover-prefetch fires. Default: 100 */
  prefetchDelay?: number;

  /**
   * Called when prefetch fires. Lets callers kick off data/code prefetching
   * (e.g. dynamic import, query-client prefetch).
   */
  onPrefetch?: (to: NavLinkProps["to"]) => void;

  /**
   * Disables the link: prevents navigation, applies `aria-disabled`,
   * and suppresses active/pending styles.
   */
  disabled?: boolean;

  /** Confirmation message shown before navigation (window.confirm). */
  confirmNavigation?: string;

  /** Replace current history entry instead of pushing. */
  replace?: boolean;

  /** Open in a new tab. Automatically adds rel="noopener noreferrer". */
  external?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBadge(badge: number): string {
  return badge > 99 ? "99+" : String(badge);
}

function resolveClassName(
  className: ClassNameResolver | undefined,
  state: { isActive: boolean; isPending: boolean; isTransitioning: boolean },
): string {
  if (!className) return "";
  if (typeof className === "function") return className(state);
  return className;
}

// ─── Component ────────────────────────────────────────────────────────────────

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  (
    {
      className,
      activeClassName,
      pendingClassName,
      transitioningClassName,
      to,
      icon,
      badge,
      tooltip,
      prefetch = "hover",
      prefetchDelay = 100,
      onPrefetch,
      disabled = false,
      confirmNavigation,
      replace,
      external = false,
      children,
      onClick,
      ...props
    },
    ref,
  ) => {
    const navigate = useNavigate();
    const prefetchTimer = useRef<ReturnType<typeof setTimeout>>();
    const hasPrefetched = useRef(false);

    // ── Render-time prefetch ─────────────────────────────────────────────────

    useEffect(() => {
      if (prefetch === "render" && !hasPrefetched.current && onPrefetch) {
        hasPrefetched.current = true;
        onPrefetch(to);
      }
    }, [prefetch, to, onPrefetch]);

    // ── Hover prefetch ───────────────────────────────────────────────────────

    const handleMouseEnter = useCallback(() => {
      if (prefetch !== "hover" || hasPrefetched.current || !onPrefetch) return;
      prefetchTimer.current = setTimeout(() => {
        hasPrefetched.current = true;
        onPrefetch(to);
      }, prefetchDelay);
    }, [prefetch, prefetchDelay, onPrefetch, to]);

    const handleMouseLeave = useCallback(() => {
      clearTimeout(prefetchTimer.current);
    }, []);

    useEffect(() => () => clearTimeout(prefetchTimer.current), []);

    // ── Click handler ────────────────────────────────────────────────────────

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (disabled) {
          e.preventDefault();
          return;
        }

        if (confirmNavigation && !window.confirm(confirmNavigation)) {
          e.preventDefault();
          return;
        }

        if (external) {
          // Let the browser open in a new tab; nothing else to do.
          return;
        }

        onClick?.(e);
      },
      [disabled, confirmNavigation, external, onClick],
    );

    // ── External link fast-path ──────────────────────────────────────────────

    if (external) {
      const href = typeof to === "string" ? to : "";
      return (
        <a
          ref={ref}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={tooltip}
          aria-disabled={disabled}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={cn(
            resolveClassName(className, { isActive: false, isPending: false, isTransitioning: false }),
            disabled && "pointer-events-none opacity-40 cursor-not-allowed",
          )}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          <NavLinkContent icon={icon} badge={badge}>
            {children}
          </NavLinkContent>
        </a>
      );
    }

    // ── Internal NavLink ──────────────────────────────────────────────────────

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        replace={replace}
        aria-disabled={disabled || undefined}
        title={tooltip}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={({ isActive, isPending }) => {
          // Suppress active/pending styling when disabled
          const effectiveActive = disabled ? false : isActive;
          const effectivePending = disabled ? false : isPending;

          // View Transitions API support (RR v6.4+)
          const isTransitioning =
            typeof document !== "undefined" &&
            // @ts-ignore — not in all TS DOM libs yet
            !!document.startViewTransition &&
            effectivePending;

          const state = {
            isActive: effectiveActive,
            isPending: effectivePending,
            isTransitioning,
          };

          return cn(
            resolveClassName(className, state),
            effectiveActive && activeClassName,
            effectivePending && pendingClassName,
            isTransitioning && transitioningClassName,
            disabled && "pointer-events-none opacity-40 cursor-not-allowed",
          );
        }}
        {...props}
      >
        {({ isActive, isPending }) => (
          <NavLinkContent icon={icon} badge={badge}>
            {typeof children === "function"
              ? (children as (state: { isActive: boolean; isPending: boolean }) => ReactNode)({
                  isActive,
                  isPending,
                })
              : children}
          </NavLinkContent>
        )}
      </RouterNavLink>
    );
  },
);

NavLink.displayName = "NavLink";

// ─── Sub-component: content wrapper ──────────────────────────────────────────

interface NavLinkContentProps {
  icon?: ReactNode;
  badge?: number | boolean;
  children?: ReactNode;
}

function NavLinkContent({ icon, badge, children }: NavLinkContentProps) {
  const showDot = badge === true;
  const showCount = typeof badge === "number" && badge > 0;

  return (
    <>
      {icon && (
        <span className="nav-link-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
      {(showDot || showCount) && (
        <span
          aria-label={showCount ? `${badge} notifications` : "new"}
          className={cn(
            "nav-link-badge",
            showDot
              ? "nav-link-badge--dot"
              : "nav-link-badge--count",
          )}
        >
          {showCount ? formatBadge(badge as number) : null}
        </span>
      )}
    </>
  );
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { NavLink };
export type { NavLinkCompatProps, NavLinkState };