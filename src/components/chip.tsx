import { Check, Plus } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChipTone = "neutral" | "outline" | "primary" | "success" | "warning" | "info" | "danger";

const CHIP_TONES: Record<ChipTone, string> = {
  neutral: "bg-muted text-foreground",
  // inset-ring, not `ring-1 ring-inset`: the `inset` colour token makes `ring-inset` also set the ring colour.
  outline: "inset-ring inset-ring-border-strong text-muted-foreground",
  primary: "bg-primary-soft text-primary-soft-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  danger: "bg-destructive-soft text-destructive",
};

const CHIP_SIZES = {
  default: "h-6 px-2.5 text-xs [&>svg]:size-3.5",
  sm: "h-5 px-2 text-2xs [&>svg]:size-3",
} as const;

/**
 * A small pill for status, category and meta. A status chip always carries an icon and a
 * word, never colour alone.
 */
export function Chip({
  tone = "neutral",
  size = "default",
  icon,
  className,
  children,
  ...props
}: { tone?: ChipTone; size?: "sm" | "default"; icon?: ReactNode } & ComponentProps<"span">) {
  return (
    <span
      data-slot="chip"
      data-tone={tone}
      className={cn(
        "inline-flex max-w-full min-w-0 shrink-0 items-center gap-1.5 rounded-full font-medium whitespace-nowrap [&>svg]:shrink-0",
        CHIP_SIZES[size],
        CHIP_TONES[tone],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}

/** A numeric count pill (tabs, sidebar, group headers). `attention` is the teal invitation state. */
export function CountBadge({ count, attention = false, className, ...props }: { count: number; attention?: boolean } & ComponentProps<"span">) {
  return (
    <span
      data-slot="count-badge"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-2xs font-semibold text-muted-foreground tabular-nums",
        attention && "bg-primary-soft text-primary-soft-foreground",
        className,
      )}
      {...props}
    >
      {count}
    </span>
  );
}

const choiceChipBase =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-medium text-muted-foreground shadow-xs transition-[background-color,color,border-color,box-shadow,scale] duration-120 ease-out hover:border-border-strong hover:text-foreground active:scale-(--motion-scale-press) disabled:pointer-events-none disabled:opacity-45 pointer-coarse:h-10 dark:bg-muted [&_svg]:size-3.5";

/**
 * A pressable pill (`aria-pressed`). `single` is for one-of-many filter rows, `multi` (default)
 * for independent toggles. Put a group of them in `role="group"` with an `aria-label`.
 */
export function ChoiceChip({
  pressed,
  selection = "multi",
  icon,
  className,
  children,
  type = "button",
  ...props
}: { pressed: boolean; selection?: "single" | "multi"; icon?: ReactNode } & ComponentProps<"button">) {
  return (
    <button
      type={type}
      data-slot="choice-chip"
      aria-pressed={pressed}
      className={cn(
        choiceChipBase,
        // The `dark:` repeats keep the pressed fill above the base `dark:bg-muted`.
        selection === "single"
          ? "aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background aria-pressed:shadow-none dark:aria-pressed:bg-foreground"
          : "aria-pressed:border-foreground/40 aria-pressed:bg-selected aria-pressed:text-foreground dark:aria-pressed:bg-selected",
        className,
      )}
      {...props}
    >
      {selection === "multi" && pressed ? <Check aria-hidden /> : icon}
      {children}
    </button>
  );
}

/** A suggestion that adds something when clicked. Not a toggle, so it has no `aria-pressed`. */
export function AddChip({ className, children, type = "button", ...props }: ComponentProps<"button">) {
  return (
    <button type={type} data-slot="add-chip" className={cn(choiceChipBase, className)} {...props}>
      <Plus aria-hidden />
      {children}
    </button>
  );
}
