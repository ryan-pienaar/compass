import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageWidth = "narrow" | "medium" | "default" | "wide" | "full";

const PAGE_WIDTHS: Record<PageWidth, string> = {
  narrow: "max-w-3xl",
  medium: "max-w-4xl",
  default: "max-w-6xl",
  wide: "max-w-8xl",
  full: "max-w-none",
};

/** The page column: gutters, top and bottom space, and one of five widths (DESIGN.md §8). */
export function Page({ children, className, width = "default", ...props }: { width?: PageWidth } & ComponentProps<"div">) {
  return (
    <div
      data-slot="page"
      className={cn("mx-auto w-full px-4 pt-6 pb-24 sm:px-6 sm:pt-8 lg:px-10", PAGE_WIDTHS[width], className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * The page title block. `habit` prepends the habit numeral to the eyebrow; the eyebrow text is
 * the habit name. `eyebrow` may be any node (Today puts its date nav there).
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  habit,
  actions,
  size = "default",
  className,
  ...props
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  habit?: 1 | 2 | 3;
  actions?: ReactNode;
  size?: "default" | "hero";
  className?: string;
} & Omit<ComponentProps<"header">, "title">) {
  const hasEyebrow = habit != null || !!eyebrow;
  return (
    <header data-slot="page-header" className={cn("mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)} {...props}>
      <div className="min-w-0">
        {hasEyebrow && (
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-muted-foreground">
            {habit != null && (
              <>
                <span aria-hidden className="font-serif text-sm leading-none text-faint-foreground tabular-nums">
                  {habit}
                </span>
                <span className="sr-only">Habit {habit}: </span>
                {!!eyebrow && (
                  <span aria-hidden className="text-faint-foreground">
                    ·
                  </span>
                )}
              </>
            )}
            {eyebrow}
          </p>
        )}
        <h1 className={cn("voice-display text-2xl text-foreground sm:text-3xl", hasEyebrow && "mt-1", size === "hero" && "text-3xl sm:text-4xl")}>
          {title}
        </h1>
        {description && <p className="mt-2 max-w-[60ch] text-md text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** The opening of a plan step: a serif title and a lede. */
export function StepHeader({
  title,
  lede,
  actions,
  className,
  ...props
}: { title: ReactNode; lede?: ReactNode; actions?: ReactNode } & Omit<ComponentProps<"header">, "title">) {
  return (
    <header
      data-slot="step-header"
      className={cn("mb-8", actions && "flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}
      {...props}
    >
      <div className="min-w-0">
        <h2 className="voice-display text-3xl sm:text-4xl">{title}</h2>
        {lede && <p className="mt-2 max-w-[60ch] text-md text-muted-foreground">{lede}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/**
 * A section heading on the page: title, optional icon, count, description and one action.
 * `size="sm"` sets the title at 14px (a sub-section inside a card, such as a role's goals).
 */
export function SectionHeader({
  title,
  count,
  icon,
  description,
  action,
  as: Heading = "h2",
  size = "default",
  className,
  ...props
}: {
  title: ReactNode;
  count?: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h2" | "h3";
  size?: "default" | "sm";
  className?: string;
} & Omit<ComponentProps<"div">, "title">) {
  return (
    <div
      data-slot="section-header"
      // With a description the header is two lines: keep the icon (and action) on the title line.
      className={cn("mb-3 flex min-h-8 gap-2", description ? "items-start" : "items-center", className)}
      {...props}
    >
      {icon && (
        <span
          aria-hidden
          className={cn(
            "flex shrink-0 items-center text-muted-foreground [&_svg]:size-4",
            description && (size === "sm" ? "h-5" : "h-6"),
          )}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <Heading className={cn("font-semibold text-foreground", size === "sm" ? "text-sm" : "text-base")}>
          {title}
          {count != null && <span className="ml-1.5 text-xs font-normal text-muted-foreground tabular-nums">{count}</span>}
        </Heading>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="ml-auto flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/** A group label inside a card or list ("A · Vital", a role, a dimension). */
export function GroupLabel({
  label,
  hint,
  count,
  action,
  as: Comp = "h3",
  className,
  ...props
}: {
  label: ReactNode;
  hint?: ReactNode;
  count?: ReactNode;
  action?: ReactNode;
  as?: "h3" | "h4" | "div";
} & ComponentProps<"div">) {
  return (
    <Comp
      data-slot="group-label"
      className={cn("flex items-baseline gap-2 pt-5 pb-1.5 text-xs font-semibold text-foreground first:pt-0", className)}
      {...props}
    >
      {label}
      {/* The hint stays on one line; a long label truncates first. */}
      {hint && <span className="shrink-0 font-normal whitespace-nowrap text-muted-foreground">{hint}</span>}
      {count != null && <span className="ml-auto font-normal text-muted-foreground tabular-nums">{count}</span>}
      {action}
    </Comp>
  );
}

/** A principle reminder set as a marginal note: serif italic beside a quiet rule, no box. */
export function PrincipleNote({ children, className, icon, ...props }: { children: ReactNode; className?: string; icon?: ReactNode } & ComponentProps<"div">) {
  return (
    <div
      data-slot="principle-note"
      className={cn(
        "relative flex max-w-[60ch] gap-2.5 pl-4 before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-border-strong",
        className,
      )}
      {...props}
    >
      {icon && (
        <div aria-hidden className="mt-1 shrink-0 text-faint-foreground [&_svg]:size-4">
          {icon}
        </div>
      )}
      <div className="voice-sm text-muted-foreground italic">{children}</div>
    </div>
  );
}

/** Main content with an 18rem guidance rail beside it at `lg` (below the content on smaller screens). */
export function WithRail({ rail, children, className, ...props }: { rail: ReactNode; children: ReactNode; className?: string } & ComponentProps<"div">) {
  return (
    <div data-slot="with-rail" className={cn("grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] xl:gap-12", className)} {...props}>
      <div className="min-w-0">{children}</div>
      <aside className="min-w-0 space-y-5 [&>*+*]:border-t [&>*+*]:border-border-subtle [&>*+*]:pt-5">{rail}</aside>
    </div>
  );
}

/** One section of a rail: a small heading (icon, title, action) over `text-sm` content. */
export function RailSection({
  title,
  icon,
  action,
  as: Heading = "h2",
  children,
  className,
  ...props
}: { title: ReactNode; icon?: ReactNode; action?: ReactNode; as?: "h2" | "h3"; children?: ReactNode } & Omit<ComponentProps<"section">, "title">) {
  return (
    <section data-slot="rail-section" className={className} {...props}>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {icon && (
          <span aria-hidden className="flex shrink-0 text-muted-foreground [&_svg]:size-4">
            {icon}
          </span>
        )}
        <Heading className="min-w-0">{title}</Heading>
        {action && <div className="ml-auto flex shrink-0 items-center">{action}</div>}
      </div>
      <div className="text-sm">{children}</div>
    </section>
  );
}
