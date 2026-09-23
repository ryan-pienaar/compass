import { QUADRANTS, type Quadrant } from "@shared/quadrant.ts";
import { cn } from "@/lib/utils";
import { QUADRANT_CLASSES } from "./badges";

/** 2x2 picker laid out like the matrix: urgent on the left, important on top. */
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
    <div className={cn("inline-grid grid-cols-[auto_1fr_1fr] gap-1 text-xs", className)}>
      <span />
      <span className="px-1 text-center text-[10px] font-medium text-muted-foreground uppercase">Urgent</span>
      <span className="px-1 text-center text-[10px] font-medium text-muted-foreground uppercase">Not urgent</span>
      {([
        ["Important", [1, 2]],
        ["Not important", [3, 4]],
      ] as const).map(([rowLabel, qs]) => (
        <div key={rowLabel} className="contents">
          <span className="flex items-center pr-1 text-[10px] font-medium text-muted-foreground uppercase [writing-mode:vertical-rl] rotate-180 sm:[writing-mode:initial] sm:rotate-0">
            {rowLabel}
          </span>
          {qs.map((q) => {
            const info = QUADRANTS[q];
            const c = QUADRANT_CLASSES[q];
            const active = value === q;
            return (
              <button
                key={q}
                type="button"
                onClick={() => onChange(q)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col items-start rounded-lg border text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  size === "sm" ? "min-w-24 px-2 py-1.5" : "min-w-32 px-3 py-2",
                  active ? cn(c.bg, c.border, "ring-2", c.ring) : "border-border hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  <span aria-hidden className={cn("size-2 rounded-full", c.solid)} />
                  Q{info.numeral} · {info.verb}
                </span>
                {size === "default" && <span className="text-[11px] text-muted-foreground">{info.label}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
