import { QUADRANTS, type Quadrant } from "@shared/quadrant.ts";
import type { Role } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Quadrant colors mark identity on fills, dots and borders only; text always stays in ink. */
export const QUADRANT_CLASSES: Record<Quadrant, { bg: string; border: string; solid: string; ring: string }> = {
  1: { bg: "bg-q1/12", border: "border-q1/45", solid: "bg-q1", ring: "ring-q1/45" },
  2: { bg: "bg-q2/12", border: "border-q2/45", solid: "bg-q2", ring: "ring-q2/45" },
  3: { bg: "bg-q3/15", border: "border-q3/50", solid: "bg-q3", ring: "ring-q3/50" },
  4: { bg: "bg-q4/12", border: "border-q4/45", solid: "bg-q4", ring: "ring-q4/45" },
};

export function QuadrantDot({ q, className }: { q: Quadrant; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", QUADRANT_CLASSES[q].solid, className)} />;
}

export function RoleDot({ color, className }: { color?: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", !color && "bg-muted-foreground/40", className)}
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}

export function RoleBadge({ role, className, muted }: { role: Pick<Role, "name" | "color"> | null | undefined; className?: string; muted?: boolean }) {
  if (!role) return null;
  return (
    <span
      className={cn(
        "inline-flex max-w-40 min-w-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        muted ? "text-muted-foreground" : "bg-muted text-foreground/80",
        className,
      )}
    >
      <RoleDot color={role.color} />
      <span className="truncate">{role.name}</span>
    </span>
  );
}

export function QuadrantBadge({
  q,
  className,
  withLabel = false,
  size = "sm",
}: {
  q: Quadrant | null | undefined;
  className?: string;
  withLabel?: boolean;
  size?: "xs" | "sm";
}) {
  if (!q) {
    return (
      <span className={cn("inline-flex items-center rounded-full border border-dashed px-1.5 text-[11px] font-medium text-muted-foreground", className)}>
        Untriaged
      </span>
    );
  }
  const info = QUADRANTS[q];
  const c = QUADRANT_CLASSES[q];
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full font-semibold text-foreground/80 tabular-nums",
              size === "xs" ? "px-1.5 text-[10px] leading-4" : "px-2 py-0.5 text-[11px]",
              c.bg,
              className,
            )}
          />
        }
      >
        <span aria-hidden className={cn("size-1.5 rounded-full", c.solid)} />
        Q{info.numeral}
        {withLabel && <span className="font-medium">{info.verb}</span>}
      </TooltipTrigger>
      <TooltipContent>
        Quadrant {info.numeral}: {info.label}
      </TooltipContent>
    </Tooltip>
  );
}
