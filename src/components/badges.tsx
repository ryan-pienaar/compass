import { QUADRANTS, type Quadrant } from "@shared/quadrant.ts";
import type { ComponentProps } from "react";
import { Chip } from "@/components/chip";
import type { Role } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Quadrant colors mark identity on fills, dots and borders only; text always stays in ink. */
// oxlint-disable-next-line react/only-export-components -- shared by many screens from this path (DESIGN.md §6.2); a plain data map
export const QUADRANT_CLASSES: Record<Quadrant, { bg: string; border: string; solid: string; ring: string }> = {
  1: { bg: "bg-q1/12", border: "border-q1/45", solid: "bg-q1", ring: "ring-q1/45" },
  2: { bg: "bg-q2/12", border: "border-q2/45", solid: "bg-q2", ring: "ring-q2/45" },
  3: { bg: "bg-q3/15", border: "border-q3/50", solid: "bg-q3", ring: "ring-q3/50" },
  4: { bg: "bg-q4/12", border: "border-q4/45", solid: "bg-q4", ring: "ring-q4/45" },
};

/** Badge tints: Q3 is a little stronger so it reads on paper. */
const BADGE_TINT: Record<Quadrant, string> = {
  1: "bg-q1/12",
  2: "bg-q2/12",
  3: "bg-q3/16",
  4: "bg-q4/12",
};

const dot = "inline-block size-2 shrink-0 rounded-full ring-1 ring-dot-ring";

/** A quadrant dot. Light Q2/Q3 are under 3:1, so it always sits next to a "Q" label or its column. */
export function QuadrantDot({ q, className, ...props }: { q: Quadrant } & ComponentProps<"span">) {
  return <span aria-hidden className={cn(dot, QUADRANT_CLASSES[q].solid, className)} {...props} />;
}

export function RoleDot({ color, className, style, ...props }: { color?: string | null } & Omit<ComponentProps<"span">, "color">) {
  return (
    <span
      aria-hidden
      className={cn(dot, !color && "bg-border-strong", className)}
      style={color ? { backgroundColor: color, ...style } : style}
      {...props}
    />
  );
}

export function RoleBadge({
  role,
  className,
  muted,
  ...props
}: { role: Pick<Role, "name" | "color"> | null | undefined; muted?: boolean } & Omit<ComponentProps<"span">, "role">) {
  if (!role) return null;
  return (
    <Chip tone="neutral" className={cn(muted && "bg-transparent px-0 text-muted-foreground", className)} {...props}>
      <RoleDot color={role.color} />
      <span className="max-w-44 min-w-0 truncate">{role.name}</span>
    </Chip>
  );
}

export function QuadrantBadge({
  q,
  className,
  withLabel = false,
  size = "sm",
  ...props
}: {
  q: Quadrant | null | undefined;
  withLabel?: boolean;
  size?: "xs" | "sm";
} & ComponentProps<"span">) {
  // Chip geometry: `xs` is Chip `sm`, `sm` is Chip `default`.
  const chipSize = size === "xs" ? "sm" : "default";
  if (!q) {
    return (
      <Chip tone="outline" size={chipSize} className={cn("px-2", className)} {...props}>
        <span aria-hidden className="size-2 shrink-0 rounded-full inset-ring inset-ring-control" />
        Untriaged
      </Chip>
    );
  }
  const info = QUADRANTS[q];
  return (
    <Tooltip>
      {/* Not focusable (no tab stop per row): the sr-only text carries the meaning; the tooltip is for mouse users. */}
      <TooltipTrigger render={<Chip size={chipSize} className={cn(BADGE_TINT[q], "text-foreground tabular-nums", className)} {...props} />}>
        <QuadrantDot q={q} />
        <span aria-hidden>Q{info.numeral}</span>
        <span className="sr-only">
          Quadrant {info.numeral}: {info.label}
        </span>
        {withLabel && <span className="font-normal">{info.verb}</span>}
      </TooltipTrigger>
      <TooltipContent>
        Quadrant {info.numeral}: {info.label}
      </TooltipContent>
    </Tooltip>
  );
}
