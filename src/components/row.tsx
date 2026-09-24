import type { ComponentProps, Ref } from "react";
import { cn } from "@/lib/utils";

type RowOwnProps = {
  /** A hairline above the row, starting at the text column (not above the first row). */
  divided?: boolean;
  /** The current row: a selected plate and a teal marker on the left. */
  selected?: boolean;
  /** Sets `data-done`, so a `strike` title inside sweeps through. */
  done?: boolean;
  ref?: Ref<HTMLElement>;
};

export type RowProps =
  | (RowOwnProps & { as?: "div" } & Omit<ComponentProps<"div">, "ref">)
  | (RowOwnProps & { as: "li" } & Omit<ComponentProps<"li">, "ref">)
  | (RowOwnProps & { as: "button" } & Omit<ComponentProps<"button">, "ref">);

/**
 * A list row on paper. Rows don't scale on press; hover and keyboard focus show a plate. Name the
 * group (`group/row`) so row actions reveal per row, never per card.
 */
export function Row(props: RowProps) {
  const { as = "div", divided = false, selected = false, done = false, className, ...rest } = props;
  const Comp = as as "div";
  return (
    <Comp
      data-slot="row"
      data-done={done || undefined}
      {...(as === "button" ? { type: "button" } : null)}
      className={cn(
        "group/row relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-120 hover:bg-subtle has-focus-visible:bg-subtle pointer-coarse:min-h-12",
        divided &&
          "before:pointer-events-none before:absolute before:top-0 before:right-3 before:left-11 before:h-px before:bg-border-subtle first:before:hidden hover:before:opacity-0 [&:hover+*]:before:opacity-0",
        // Repeat the plate under hover and focus: the base hover:/has-focus-visible: plates would win otherwise.
        selected && "bg-selected hover:bg-selected has-focus-visible:bg-selected after:absolute after:inset-y-2 after:left-0 after:w-0.5 after:rounded-full after:bg-primary",
        as === "button" && "w-full cursor-pointer text-left focus-ring-inset",
        className,
      )}
      {...(rest as Omit<ComponentProps<"div">, "ref"> & { ref?: Ref<HTMLDivElement> })}
    />
  );
}

type RowTitleProps =
  | ({ as?: "span" } & ComponentProps<"span">)
  | ({ as: "button" } & ComponentProps<"button">);

/** The row title. The text sits in an inline `strike` span, so truncation and the done strike both work. */
export function RowTitle(props: RowTitleProps) {
  const { as = "span", className, children, ...rest } = props;
  const Comp = as as "span";
  return (
    <Comp
      data-slot="row-title"
      {...(as === "button" ? { type: "button" } : null)}
      className={cn(
        "block min-w-0 flex-1 truncate text-left text-sm text-foreground",
        as === "button" && "cursor-pointer rounded-xs focus-ring-inset",
        className,
      )}
      {...(rest as ComponentProps<"span">)}
    >
      <span className="strike">{children}</span>
    </Comp>
  );
}

/**
 * Row metadata: 13px muted, tabular, with 14px icons. Show only properties that have a value.
 * Use `as="span"` inside a button (a button may hold phrasing content only).
 */
export function RowMeta({ as: Comp = "div", className, ...props }: ComponentProps<"div"> & { as?: "div" | "span" }) {
  return (
    <Comp
      data-slot="row-meta"
      className={cn(
        "mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground tabular-nums [&_svg]:size-3.5 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

/** The `·` between meta items. */
export function MetaSep({ className, ...props }: ComponentProps<"span">) {
  return (
    <span aria-hidden className={cn("text-faint-foreground", className)} {...props}>
      ·
    </span>
  );
}

const META_SLOT_WIDTHS = { day: "w-14", due: "w-20", estimate: "w-10" } as const;

/** A right-aligned meta column (day, due, estimate) shown from `sm` up; below it the value joins RowMeta. */
export function MetaSlot({ slot, className, ...props }: { slot: "day" | "due" | "estimate" } & ComponentProps<"span">) {
  return (
    <span
      data-slot="meta-slot"
      className={cn("hidden shrink-0 text-right text-xs text-muted-foreground tabular-nums sm:block", META_SLOT_WIDTHS[slot], className)}
      {...props}
    />
  );
}

/**
 * Row actions: hidden until the row is hovered or holds keyboard focus, always visible on touch.
 * Uses the named `group/row`, so hovering a whole card never reveals every row's actions.
 */
export function RowActions({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="row-actions"
      className={cn(
        "flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-120 group-focus-within/row:opacity-100 group-hover/row:opacity-100 pointer-coarse:opacity-100",
        className,
      )}
      {...props}
    />
  );
}
