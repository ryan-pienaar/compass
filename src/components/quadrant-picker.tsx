import { QUADRANTS, type Quadrant } from "@shared/quadrant.ts";
import { cn } from "@/lib/utils";
import { QuadrantDot } from "./badges";

/** The pressed ring and tint per quadrant (literal strings so Tailwind generates them). Q3 tints a little stronger to read on paper. In dark the tint mixes into the lifted tile (bg-muted), so the pressed tile never sinks. */
const PRESSED: Record<Quadrant, string> = {
  1: "aria-pressed:bg-q1/12 aria-pressed:ring-q1 dark:aria-pressed:bg-[color-mix(in_oklab,var(--q1)_12%,var(--muted))]",
  2: "aria-pressed:bg-q2/12 aria-pressed:ring-q2 dark:aria-pressed:bg-[color-mix(in_oklab,var(--q2)_12%,var(--muted))]",
  3: "aria-pressed:bg-q3/16 aria-pressed:ring-q3 dark:aria-pressed:bg-[color-mix(in_oklab,var(--q3)_16%,var(--muted))]",
  4: "aria-pressed:bg-q4/12 aria-pressed:ring-q4 dark:aria-pressed:bg-[color-mix(in_oklab,var(--q4)_12%,var(--muted))]",
};

const axis = "text-2xs font-medium text-muted-foreground";

/**
 * 2x2 picker laid out like the matrix: urgent on the left, important on top. The axis labels
 * show from `sm` up; below that each option's own label carries the meaning.
 */
export function QuadrantPicker({
  value,
  onChange,
  size = "default",
  className,
}: {
  value: Quadrant | null;
  onChange: (q: Quadrant) => void;
  size?: "default" | "sm";
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]", size === "default" && "sm:gap-x-3", className)}>
      <span aria-hidden className="hidden sm:block" />
      <span className={cn(axis, "hidden px-3 sm:block")}>
        Urgent
      </span>
      <span className={cn(axis, "hidden px-3 sm:block")}>
        Not urgent
      </span>
      {([
        ["Important", [1, 2]],
        ["Not important", [3, 4]],
      ] as const).map(([rowLabel, qs]) => (
        <div key={rowLabel} className="contents">
          <span className={cn(axis, "hidden self-center pr-1 sm:block")}>
            {rowLabel}
          </span>
          {qs.map((q) => {
            const info = QUADRANTS[q];
            return (
              <button
                key={q}
                type="button"
                onClick={() => onChange(q)}
                aria-pressed={value === q}
                className={cn(
                  "flex min-h-14 min-w-0 flex-col items-start justify-center gap-0.5 rounded-lg bg-card px-3 py-2 text-left ring-1 ring-edge dark:bg-muted transition-[box-shadow,background-color] duration-120 ease-out not-aria-pressed:hover:ring-border-strong aria-pressed:ring-2",
                  PRESSED[q],
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <QuadrantDot q={q} />Q{info.numeral} · {info.verb}
                </span>
                <span className="text-xs text-muted-foreground">{info.label}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
