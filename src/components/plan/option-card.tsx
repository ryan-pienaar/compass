import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A choice card with checkbox semantics: the `label` wraps a Checkbox, so the whole card toggles
 * it. Checked cards carry a 2px teal ring; unchecked ones keep full contrast. A disabled
 * checkbox inside (always-on choices) keeps the card from looking clickable.
 */
export function OptionCard({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      data-slot="option-card"
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl bg-card p-4 shadow-xs ring-1 ring-edge transition-shadow duration-120",
        // Hover only on unchecked cards, so the checked ring never flickers to the hover ring.
        "not-has-[[data-checked]]:hover:ring-border-strong has-[[data-checked]]:ring-2 has-[[data-checked]]:ring-primary has-[[data-disabled]]:cursor-default",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A one-of-many choice as a pressable card (`aria-pressed`) with a radio-style indicator: a
 * title, an optional trailing mark and a description. Put a set of them in `role="group"`.
 */
export function OptionButton({
  pressed,
  title,
  description,
  mark,
  className,
  type = "button",
  ...props
}: {
  pressed: boolean;
  title: ReactNode;
  description?: ReactNode;
  /** A small mark after the title (e.g. the "counts as kept" check). */
  mark?: ReactNode;
} & Omit<ComponentProps<"button">, "title">) {
  return (
    <button
      type={type}
      data-slot="option-button"
      aria-pressed={pressed}
      className={cn(
        "flex items-start gap-3 rounded-lg bg-card px-3 py-2.5 text-left text-sm shadow-xs ring-1 ring-edge transition-[background-color,box-shadow] duration-120 ease-out",
        "not-aria-pressed:hover:ring-border-strong aria-pressed:bg-selected aria-pressed:shadow-none aria-pressed:ring-2 aria-pressed:ring-foreground",
        className,
      )}
      {...props}
    >
      <span aria-hidden className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-[1.5px] border-control bg-field">
        {pressed && <span className="size-2 rounded-full bg-foreground" />}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          {title}
          {mark}
        </span>
        {description && <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>}
      </span>
    </button>
  );
}
