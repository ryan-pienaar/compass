import { SAW_DIMENSIONS } from "@shared/content.ts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { WeekBoard } from "@/lib/api";
import { hoursLabel, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

export function WeekStats({ board, className }: { board: WeekBoard; className?: string }) {
  const s = board.stats;
  const target = board.settings.capacityTarget;
  const ratio = s.capacityRatio;
  const level = ratio > 0.8 ? "over" : ratio > target ? "full" : "ok";
  const nonSawRoles = board.roles.filter((r) => !r.isSaw && board.weekRoleIds.includes(r.id));
  const covered = new Set(s.rolesWithGoals);

  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4", className)}>
      <Tooltip>
        <TooltipTrigger render={<div className="rounded-xl border bg-card px-3 py-2" />}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-muted-foreground">Planned time</span>
            <span className={cn("text-xs font-medium", level === "over" ? "text-destructive" : level === "full" ? "text-warning" : "text-muted-foreground")}>
              {pct(ratio)}
            </span>
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{hoursLabel(s.plannedMinutes)}</div>
          <div className="relative mt-1.5 h-1.5 rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", level === "over" ? "bg-destructive" : level === "full" ? "bg-warning" : "bg-primary")}
              style={{ width: `${Math.min(100, ratio * 100)}%` }}
            />
            <div className="absolute -top-0.5 h-2.5 w-0.5 rounded bg-foreground/40" style={{ left: `${target * 100}%` }} />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">
          {hoursLabel(s.plannedMinutes)} of {hoursLabel(s.availableMinutes)} waking hours. Aim for about {pct(target)} or less. The white
          space is for people, rest and the unexpected.
        </TooltipContent>
      </Tooltip>

      <div className="rounded-xl border bg-card px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden className="size-2 rounded-full bg-q2" /> Quadrant II time
        </div>
        <div className="mt-1 text-lg font-semibold">{hoursLabel(s.q2Minutes)}</div>
        <div className="text-[11px] text-muted-foreground">
          {s.plannedMinutes ? `${pct(s.q2Minutes / s.plannedMinutes)} of planned time` : "Nothing scheduled yet"}
        </div>
      </div>

      <div className="rounded-xl border bg-card px-3 py-2">
        <div className="text-xs text-muted-foreground">Roles with a rock</div>
        <div className="mt-1 text-lg font-semibold tabular-nums">
          {covered.size}
          <span className="text-sm font-normal text-muted-foreground">/{nonSawRoles.length}</span>
        </div>
        <div className="flex flex-wrap gap-1 pt-0.5">
          {nonSawRoles.map((r) => (
            <span
              key={r.id}
              title={`${r.name}${covered.has(r.id) ? "" : " (no rock)"}`}
              className={cn("size-2 rounded-full", !covered.has(r.id) && "opacity-25")}
              style={{ backgroundColor: r.color }}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card px-3 py-2">
        <div className="text-xs text-muted-foreground">Sharpen the saw</div>
        <div className="mt-1 text-lg font-semibold tabular-nums">
          {s.sawCovered.length}
          <span className="text-sm font-normal text-muted-foreground">/4</span>
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            · rocks {s.goalsDone}/{s.goalsTotal}
          </span>
        </div>
        <div className="flex gap-1 pt-0.5">
          {SAW_DIMENSIONS.map((d) => (
            <span
              key={d.key}
              title={d.label}
              className={cn("h-1.5 flex-1 rounded-full", s.sawCovered.includes(d.key) ? "bg-primary" : "bg-muted")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
