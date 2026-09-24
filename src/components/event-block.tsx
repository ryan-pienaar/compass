import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Calendar-block visuals shared by the Week grid (`layout: "grid"`) and the Today timeline
 * (`layout: "row"`). Set `style={{ "--role": color }}` for the role bar and tint, and the state
 * attributes on the root: `data-done`, `data-skipped`, `data-past`, `data-current`.
 */
// oxlint-disable-next-line react/only-export-components -- DESIGN.md §6.2 fixes this import path; a class recipe
export const eventBlockVariants = cva(
  [
    "role-scope relative overflow-hidden text-foreground before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-0.75 before:bg-(--role-ink)",
    // done: a lighter tint (the title strikes through via EventTitle)
    "data-[done]:[--event-mix:7%] dark:data-[done]:[--event-mix:12%]",
    // skipped: neutral hatching, muted title, no strike
    "data-[skipped]:[background-image:repeating-linear-gradient(135deg,transparent_0_6px,var(--selected)_6px_7px)]",
    // now. Hairlines use inset-ring, not `ring-1 ring-inset`: the theme's `inset` colour token
    // makes `ring-inset` also set --tw-ring-color, which overrides ring-edge and ring-[…].
    "data-[current]:inset-ring-2 data-[current]:inset-ring-ring",
  ],
  {
    variants: {
      kind: {
        focus: "bg-(--role-tint) inset-ring inset-ring-[color-mix(in_oklab,var(--role,var(--muted-foreground))_22%,transparent)]",
        appointment: "bg-card shadow-xs inset-ring inset-ring-edge",
      },
      layout: {
        grid: "rounded-sm pr-1.5 pl-2.5",
        row: "rounded-lg px-3 py-2.5 pl-3.5",
      },
    },
    defaultVariants: { kind: "focus", layout: "grid" },
  },
);

export type EventBlockVariantProps = VariantProps<typeof eventBlockVariants>;

export type EventTier = "xs" | "sm" | "md";

/**
 * How much a block of this length can show. `xs` (≤20 min): one line, title only, `text-2xs
 * font-medium py-0`. `sm` (≤40): "Title · 9:30", `text-xs py-0.5`. `md`: title `text-xs
 * font-medium line-clamp-2`, then the time `text-2xs` on its own line, `py-1`.
 */
// oxlint-disable-next-line react/only-export-components -- DESIGN.md §6.2 fixes this import path; a pure helper
export function tierFor(minutes: number): EventTier {
  if (minutes <= 20) return "xs";
  if (minutes <= 40) return "sm";
  return "md";
}

/** A block title. Muted when the block is past or skipped; the inner span carries the done strike. */
export function EventTitle({ as = "span", className, children, ...props }: { as?: "span" | "div" } & ComponentProps<"span">) {
  const Comp = as as "span";
  return (
    <Comp
      data-slot="event-title"
      className={cn("font-medium text-foreground in-data-[past]:text-muted-foreground in-data-[skipped]:text-muted-foreground", className)}
      {...props}
    >
      <span className="strike">{children}</span>
    </Comp>
  );
}

/** A block time: muted and tabular. */
export function EventTime({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="event-time" className={cn("text-muted-foreground tabular-nums", className)} {...props} />;
}
