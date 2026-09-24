import type { Quadrant } from "@shared/quadrant.ts";
import type { ComponentProps, ReactNode, Ref } from "react";
import { QuadrantDot } from "@/components/badges";
import { cn } from "@/lib/utils";

/** A sunken well (board column, week tray). It may hold board cards and an inline QuickAdd, nothing boxed. */
export function Well({
  as = "div",
  className,
  ...props
}: { as?: "div" | "section" | "aside"; ref?: Ref<HTMLElement> } & Omit<ComponentProps<"div">, "ref">) {
  const Comp = as as "div";
  return (
    <Comp
      data-slot="well"
      className={cn("min-w-0 rounded-xl bg-inset p-2", className)}
      {...(props as Omit<ComponentProps<"div">, "ref"> & { ref?: Ref<HTMLDivElement> })}
    />
  );
}

export type DropState = "idle" | "available" | "over";

/**
 * Drop-target classes. `available`: a compatible drag is active anywhere (read it with
 * `useDragOperation()` from `@dnd-kit/react`). `over`: the drag is over this target; the `danger`
 * tone is for a drop that removes something. The `over` tint is a background-image layer, so the
 * target keeps its own surface underneath (a well stays a well while you drag over it).
 */
// oxlint-disable-next-line react/only-export-components -- DESIGN.md §6.2 fixes this import path; a pure class helper
export function dropZone(state: DropState | null | undefined, tone: "primary" | "danger" = "primary"): string {
  if (state === "available") return "outline-1 outline-dashed outline-border-strong -outline-offset-1";
  if (state === "over") {
    return tone === "danger"
      ? "outline-2 outline-solid outline-destructive -outline-offset-2 [background-image:linear-gradient(color-mix(in_oklab,var(--destructive-solid)_10%,transparent),color-mix(in_oklab,var(--destructive-solid)_10%,transparent))]"
      : "outline-2 outline-solid outline-primary -outline-offset-2 [background-image:linear-gradient(color-mix(in_oklab,var(--primary)_8%,transparent),color-mix(in_oklab,var(--primary)_8%,transparent))]";
  }
  return "";
}

/** A raised card inside a well. Draggable cards add `cursor-grab active:cursor-grabbing`. */
export const boardCard = "rounded-lg bg-card px-3 py-2.5 text-sm shadow-xs ring-1 ring-edge transition-shadow duration-120 hover:shadow-sm";

/** The element left in place during an overlay-mode drag (Matrix, Week). */
export const dragSource = "animate-none opacity-40 outline-1 outline-dashed outline-border-strong -outline-offset-1 shadow-none";

const BOARD_BARS: Record<Quadrant, string> = {
  1: "before:bg-q1",
  2: "before:bg-q2",
  3: "before:bg-q3",
  4: "before:bg-q4",
};

/**
 * A board column: a well with a header (icon or quadrant dot, title, label, count), a body of
 * board cards and an optional footer. `bar` draws the quadrant's top rule; `lit` is for Q2 only.
 * Pass the droppable `ref` straight through.
 */
export function BoardColumn({
  title,
  icon,
  dot,
  bar,
  label,
  count,
  lit = false,
  drop = "idle",
  overTone = "primary",
  empty,
  footer,
  className,
  children,
  ...props
}: {
  title: ReactNode;
  icon?: ReactNode;
  /** `true` shows the dot of the `bar` quadrant; any other node renders as is. */
  dot?: ReactNode;
  bar?: Quadrant;
  label?: ReactNode;
  count?: ReactNode;
  lit?: boolean;
  drop?: DropState;
  overTone?: "primary" | "danger";
  /** Shown in the body, under any children (pass it only when there is nothing to list). */
  empty?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
} & Omit<ComponentProps<"section">, "title" | "children">) {
  const dotNode = dot === true ? bar != null ? <QuadrantDot q={bar} /> : null : dot;
  return (
    <section
      data-slot="board-column"
      className={cn(
        "relative flex min-h-60 min-w-0 flex-col rounded-xl bg-inset p-2 transition-[background-color,outline-color] duration-180 ease-out",
        bar != null && cn("before:absolute before:inset-x-3 before:top-0 before:h-0.75 before:rounded-b-full", BOARD_BARS[bar]),
        lit && "bg-[color-mix(in_oklab,var(--q2)_12%,var(--inset))]",
        dropZone(drop, overTone),
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2 px-2 pt-2 pb-2">
        {icon && (
          <span aria-hidden className="flex shrink-0 text-muted-foreground [&_svg]:size-4">
            {icon}
          </span>
        )}
        {dotNode}
        <h2 className="min-w-0 truncate text-sm font-semibold">{title}</h2>
        {label && <span className="min-w-0 truncate text-xs text-muted-foreground">{label}</span>}
        {count != null && <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">{count}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        {children}
        {empty && <div className="px-2 py-3 text-sm text-muted-foreground">{empty}</div>}
      </div>
      {footer && <div className="mt-1.5">{footer}</div>}
    </section>
  );
}

type CalloutTone = "primary" | "neutral" | "warning" | "info" | "danger";

const CALLOUT_TONES: Record<CalloutTone, string> = {
  primary: "bg-primary-soft text-primary-soft-foreground",
  neutral: "bg-muted text-foreground",
  warning: "bg-warning-soft text-foreground [&>svg]:text-warning",
  info: "bg-info-soft text-foreground [&>svg]:text-info",
  danger: "bg-destructive-soft text-foreground [&>svg]:text-destructive",
};

/** One tinted note per page at most. The icon is a direct child so the tone can colour it. */
export function Callout({
  tone = "primary",
  icon,
  title,
  action,
  className,
  children,
  ...props
}: { tone?: CalloutTone; icon?: ReactNode; title?: ReactNode; action?: ReactNode; children?: ReactNode } & Omit<ComponentProps<"div">, "title">) {
  return (
    <div
      data-slot="callout"
      data-tone={tone}
      className={cn(
        "flex flex-wrap items-start gap-3 rounded-xl px-4 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
        CALLOUT_TONES[tone],
        className,
      )}
      {...props}
    >
      {icon}
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children}
      </div>
      {action && <div className="ml-auto flex items-center gap-2 self-center">{action}</div>}
    </div>
  );
}
