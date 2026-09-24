import { useEffect, useState, type AnimationEvent, type ComponentProps, type CSSProperties, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

const DONE_CHECK_SIZES = {
  sm: "size-4 border-[1.5px] after:-inset-1 pointer-coarse:after:-inset-3.5 [&>svg]:size-3",
  default: "size-5 border-[1.5px] after:-inset-1.5 pointer-coarse:after:-inset-3 [&>svg]:size-3.5",
  lg: "size-6 border-2 after:-inset-2 pointer-coarse:after:-inset-2.5 [&>svg]:size-4",
} as const;

/**
 * The one completion control. It shows the new state straight away (local optimistic state; the
 * query cache is never touched), reverts within 4s if the data never follows, and plays the pop
 * only after a click, so rows loaded as done never animate. `color` is the role colour; the
 * owning row sets `data-done` too so its title strikes through.
 */
export function DoneCheck({
  done,
  onToggle,
  color,
  size = "default",
  celebrate = false,
  className,
  style,
  onAnimationEnd,
  "aria-label": ariaLabel,
  ...props
}: {
  done: boolean;
  onToggle: (e: MouseEvent<HTMLButtonElement>) => void;
  color?: string | null;
  size?: "sm" | "default" | "lg";
  /** Quadrant II big rock: one soft bloom instead of the plain pop. */
  celebrate?: boolean;
} & Omit<ComponentProps<"button">, "onClick" | "onToggle" | "children" | "color">) {
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [justDone, setJustDone] = useState(false);
  // The real value landed (or changed): drop the local guess. Kept as DESIGN.md §6.2 specifies it.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => setOptimistic(null), [done]);
  useEffect(() => {
    if (optimistic === null) return;
    const t = setTimeout(() => setOptimistic(null), 4000);
    return () => clearTimeout(t);
  }, [optimistic]);
  // Fallback for onAnimationEnd, which never fires under reduced motion (the animation is removed):
  // clear the flag after the longest animation (bloom, 480ms) so it never outlives it.
  useEffect(() => {
    if (!justDone) return;
    const t = setTimeout(() => setJustDone(false), 600);
    return () => clearTimeout(t);
  }, [justDone]);
  const shown = optimistic ?? done;

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    const next = !shown;
    setOptimistic(next);
    setJustDone(next);
    onToggle(e);
  };

  const handleAnimationEnd = (e: AnimationEvent<HTMLButtonElement>) => {
    onAnimationEnd?.(e);
    // With `celebrate` two animations run (pop 240ms, bloom 480ms); wait for the longer one.
    if (celebrate && e.animationName === "check-pop") return;
    setJustDone(false);
  };

  return (
    <button
      type="button"
      data-slot="done-check"
      data-done={shown || undefined}
      data-just-done={justDone || undefined}
      aria-label={ariaLabel ?? (shown ? "Mark as not done" : "Mark as done")}
      style={{ ...style, "--role": color ?? undefined } as CSSProperties}
      className={cn(
        "role-scope group/check relative grid shrink-0 place-items-center rounded-full border-(--role-ink) bg-field text-(--role-on) transition-[background-color,border-color,scale] duration-120 ease-out hover:not-data-[done]:bg-(--role-wash) active:scale-90 motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-45 after:absolute data-[done]:bg-(--role-ink)",
        celebrate ? "data-[just-done]:animate-check-bloom" : "data-[just-done]:animate-check-pop",
        DONE_CHECK_SIZES[size],
        className,
      )}
      onClick={onClick}
      onAnimationEnd={handleAnimationEnd}
      {...props}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          pathLength={1}
          className="stroke-current [stroke-width:3] [stroke-linecap:round] [stroke-linejoin:round] [stroke-dasharray:1] [stroke-dashoffset:1] transition-[stroke-dashoffset] duration-120 ease-out group-data-[done]/check:[stroke-dashoffset:0] group-data-[done]/check:duration-180 group-data-[just-done]/check:delay-40"
        />
      </svg>
    </button>
  );
}
