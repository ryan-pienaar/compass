import type { CSSProperties } from "react";
import { SAW_DIMENSIONS } from "@shared/content.ts";
import { QuadrantDot, RoleDot } from "@/components/badges";
import { Meter, MeterSegments } from "@/components/meter";
import { StatCell, StatStrip } from "@/components/stat";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { WeekBoard } from "@/lib/api";
import { hoursLabel, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

/** "11.5h" → value "11.5" and unit "h", so the number sets in ink and the unit in muted. */
function hoursValue(minutes: number) {
  return hoursLabel(minutes).replace(/h$/, "");
}

export function WeekStats({ board, className }: { board: WeekBoard; className?: string }) {
  const s = board.stats;
  const target = board.settings.capacityTarget;
  const ratio = s.capacityRatio;
  const level = ratio > 0.8 ? "over" : ratio > target ? "full" : "ok";
  const nonSawRoles = board.roles.filter((r) => !r.isSaw && board.weekRoleIds.includes(r.id));
  const covered = new Set(s.rolesWithGoals);
  const withRock = nonSawRoles.filter((r) => covered.has(r.id));
  const withoutRock = nonSawRoles.filter((r) => !covered.has(r.id));
  const sawDone = SAW_DIMENSIONS.filter((d) => s.sawCovered.includes(d.key));
  const sawOpen = SAW_DIMENSIONS.filter((d) => !s.sawCovered.includes(d.key));
  // Over or at capacity is amber, never red: a full week is a caution, not a failure.
  const capacityTone = level === "ok" ? "primary" : "warning";

  // Four across only when the strip itself has room (42rem): beside a sidebar at tablet widths the labels
  // would otherwise wrap under their info buttons.
  return (
    <div className={cn("@container", className)}>
      <StatStrip cols={4} className="sm:grid-cols-2 @2xl:grid-cols-4">
        <StatCell
          label="Planned time"
          value={hoursValue(s.plannedMinutes)}
          unit="h"
          hint={pct(ratio)}
          tone={level === "ok" ? "default" : "warning"}
          info={
            <>
              {hoursLabel(s.plannedMinutes)} of {hoursLabel(s.availableMinutes)} waking hours. Aim for about {pct(target)} or less. The white
              space is for people, rest and the unexpected.
            </>
          }
        >
          <Meter value={ratio} target={target} tone={capacityTone} label="Planned time as a share of waking hours" />
        </StatCell>

        <StatCell
          label={
            <>
              <QuadrantDot q={2} /> Quadrant II time
            </>
          }
          value={hoursValue(s.q2Minutes)}
          unit="h"
          hint={s.plannedMinutes ? `${pct(s.q2Minutes / s.plannedMinutes)} of planned time` : "Nothing scheduled yet"}
        />

        <StatCell
          label="Roles with a rock"
          value={
            <>
              {covered.size}
              <span className="text-sm font-normal text-muted-foreground">/{nonSawRoles.length}</span>
            </>
          }
        >
          {nonSawRoles.length > 0 && (
            <>
              <Tooltip>
                <TooltipTrigger render={<div aria-hidden className="flex w-fit flex-wrap gap-1.5" />}>
                  {nonSawRoles.map((r) =>
                    covered.has(r.id) ? (
                      <RoleDot key={r.id} color={r.color} className="size-2.5" />
                    ) : (
                      <span
                        key={r.id}
                        className="role-scope inline-block size-2.5 shrink-0 rounded-full ring-1 ring-(--role-ink) ring-inset"
                        style={{ "--role": r.color } as CSSProperties}
                      />
                    ),
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-0.5">
                    {withRock.length > 0 && <p>With a rock: {withRock.map((r) => r.name).join(", ")}</p>}
                    {withoutRock.length > 0 && <p>No rock yet: {withoutRock.map((r) => r.name).join(", ")}</p>}
                  </div>
                </TooltipContent>
              </Tooltip>
              <p className="sr-only">
                {withRock.length > 0 && `With a rock: ${withRock.map((r) => r.name).join(", ")}. `}
                {withoutRock.length > 0 && `No rock yet: ${withoutRock.map((r) => r.name).join(", ")}.`}
              </p>
            </>
          )}
        </StatCell>

        <StatCell
          label="Sharpen the saw"
          value={
            <>
              {s.sawCovered.length}
              <span className="text-sm font-normal text-muted-foreground">/4</span>
            </>
          }
          hint={`rocks ${s.goalsDone}/${s.goalsTotal}`}
        >
          <Tooltip>
            <TooltipTrigger render={<div />}>
              {/* One segment per dimension, in order, so a covered dimension always lights its own segment. */}
              <MeterSegments
                total={SAW_DIMENSIONS.length}
                filled={sawDone.length}
                tone="q2"
                label="Sharpen the saw: dimensions with a rock"
                segmentClassName={(i) => (s.sawCovered.includes(SAW_DIMENSIONS[i].key) ? "bg-q2" : "bg-muted")}
              />
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-0.5">
                {sawDone.length > 0 && <p>Covered: {sawDone.map((d) => d.label).join(", ")}</p>}
                {sawOpen.length > 0 && <p>Not yet: {sawOpen.map((d) => d.label).join(", ")}</p>}
              </div>
            </TooltipContent>
          </Tooltip>
        </StatCell>
      </StatStrip>
    </div>
  );
}
