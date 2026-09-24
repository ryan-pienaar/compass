import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

const METER_TONES = { primary: "bg-primary", warning: "bg-warning", q2: "bg-q2" } as const;

/**
 * A thin progress bar. `value` and `target` are fractions (0..1); the target tick sits outside
 * the clipped track. Over capacity is `tone="warning"`, never red.
 */
export function Meter({
  value,
  target,
  tone = "primary",
  size = "default",
  label,
  className,
  ...props
}: {
  value: number;
  /** Where the target tick sits, as a fraction (0..1) like `value`. */
  target?: number;
  tone?: "primary" | "warning" | "q2";
  size?: "sm" | "default";
  label: string;
} & ComponentProps<"div">) {
  const v = clamp01(value);
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      aria-label={label}
      data-slot="meter"
      className={cn("relative", className)}
      {...props}
    >
      <div className={cn("h-1.5 overflow-hidden rounded-full bg-muted", size === "sm" && "h-1")}>
        <div
          className={cn("h-full w-full rounded-full transition-[translate] duration-320 ease-out", METER_TONES[tone])}
          style={{ translate: `${(v - 1) * 100}% 0` }}
        />
      </div>
      {target != null && (
        <div aria-hidden className="pointer-events-none absolute -top-0.5 h-2.5 w-px bg-foreground" style={{ left: `${clamp01(target) * 100}%` }} />
      )}
    </div>
  );
}

/**
 * A row of pips (Sharpen the saw, weeks planned). `segmentClassName` lets a caller add a level
 * per pip (for example a lighter fill) without leaving the recipe.
 */
export function MeterSegments({
  total,
  filled,
  tone = "q2",
  label,
  segmentClassName,
  className,
  ...props
}: {
  total: number;
  filled: number;
  tone?: "q2" | "primary";
  label: string;
  segmentClassName?: (index: number, isFilled: boolean) => string | false | null | undefined;
} & ComponentProps<"div">) {
  const count = Math.max(0, Math.floor(total));
  const on = Math.min(count, Math.max(0, filled));
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={count}
      aria-valuenow={on}
      aria-valuetext={`${on} of ${count}`}
      aria-label={label}
      data-slot="meter-segments"
      className={cn("flex gap-1", className)}
      {...props}
    >
      {Array.from({ length: count }, (_, i) => {
        const isFilled = i < on;
        return (
          <span
            key={i}
            aria-hidden
            className={cn("h-1.5 flex-1 rounded-full", isFilled ? (tone === "q2" ? "bg-q2" : "bg-primary") : "bg-muted", segmentClassName?.(i, isFilled))}
          />
        );
      })}
    </div>
  );
}

/**
 * A circular meter (Focus mode). Children sit in the centre. `size` is the diameter in px.
 * The meter role sits on the ring's svg, not the wrapper: a meter's children are presentational,
 * so the centre content (the timer) must stay outside it. `valueText` reads instead of the percentage.
 */
export function MeterRing({
  value,
  size = 200,
  stroke = 3,
  label,
  valueText,
  className,
  style,
  children,
  ...props
}: { value: number; size?: number; stroke?: number; label: string; valueText?: string; children?: ReactNode } & ComponentProps<"div">) {
  const v = clamp01(value);
  const r = (size - stroke) / 2;
  return (
    <div
      data-slot="meter-ring"
      className={cn("relative grid size-(--meter-ring-size) shrink-0 place-items-center", className)}
      style={{ "--meter-ring-size": `${size}px`, ...style } as CSSProperties}
      {...props}
    >
      <svg
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(v * 100)}
        aria-valuetext={valueText}
        aria-label={label}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        className="absolute inset-0 size-full -rotate-90"
      >
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-(--border-subtle)" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - v}
          className={cn("stroke-primary transition-[stroke-dashoffset] duration-320 ease-out [stroke-linecap:round]", v === 0 && "opacity-0")}
        />
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}
