import { Check, Mountain, Plus, SkipForward } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { EmptyState } from "@/components/empty-state";
import { EventTitle, eventBlockVariants } from "@/components/event-block";
import { IconButton } from "@/components/icon-button";
import { SectionHeader } from "@/components/page";
import { MetaSep } from "@/components/row";
import { Button } from "@/components/ui/button";
import { BlockDialog, draftFromBlock, type BlockDraft } from "@/components/week/block-dialog";
import type { Block } from "@/lib/api";
import { formatDuration, formatMinutes } from "@/lib/format";
import { useNow, useRolesMap } from "@/lib/hooks";
import { useBlockActions } from "@/lib/mutations";
import { cn } from "@/lib/utils";

/**
 * Today's appointments and focus blocks as a simple agenda. Gaps are shown on
 * purpose: unscheduled time is where people, spontaneity and the unexpected fit.
 */
export function DayTimeline({
  date,
  isToday,
  blocks,
  dayStartHour,
  dayEndHour,
}: {
  date: string;
  isToday: boolean;
  blocks: Block[];
  dayStartHour: number;
  dayEndHour: number;
}) {
  const roles = useRolesMap();
  const { create, update, remove } = useBlockActions();
  const [draft, setDraft] = useState<BlockDraft | null>(null);
  const now = useNow(60_000);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const sorted = [...blocks].sort((a, b) => a.startMin - b.startMin);

  const rows: ({ kind: "block"; block: Block } | { kind: "gap"; from: number; to: number })[] = [];
  let cursor = dayStartHour * 60;
  for (const b of sorted) {
    if (b.startMin - cursor >= 45) rows.push({ kind: "gap", from: cursor, to: b.startMin });
    rows.push({ kind: "block", block: b });
    cursor = Math.max(cursor, b.endMin);
  }
  if (dayEndHour * 60 - cursor >= 45) rows.push({ kind: "gap", from: cursor, to: dayEndHour * 60 });

  const newAt = (from: number) => {
    // Late in the evening, keep the new block inside the day: blocks can't run past midnight.
    const startMin = Math.min(from, 1440 - 30);
    setDraft({
      date,
      startMin,
      endMin: Math.min(1440, startMin + 60),
      title: "",
      notes: "",
      roleId: null,
      kind: "appointment",
      quadrant: null,
      status: "planned",
      taskId: null,
    });
  };

  const nowLabel = formatMinutes(nowMin);
  const nowPill = <NowPill label={nowLabel} />;

  return (
    <section>
      <SectionHeader
        title="Schedule"
        action={
          <Button variant="ghost" size="sm" onClick={() => newAt(Math.max(dayStartHour * 60, Math.ceil(nowMin / 30) * 30))}>
            <Plus /> Add
          </Button>
        }
      />
      <ol>
        {rows.map((row) => {
          if (row.kind === "gap") {
            const active = isToday && nowMin >= row.from && nowMin < row.to;
            return (
              <TimelineRow key={`gap-${row.from}`} current={active} time={active ? nowPill : formatMinutes(row.from)} gap>
                <button
                  type="button"
                  onClick={() => newAt(Math.ceil(Math.max(row.from, isToday ? nowMin : 0) / 30) * 30)}
                  className="group/gap flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 pl-3.5 text-left text-xs text-muted-foreground transition-colors duration-120 hover:bg-subtle hover:text-foreground"
                >
                  {active && <span className="sm:hidden">{nowPill}</span>}
                  {/* The start time sits in the time column from `sm`; the full range stays in the button's name. */}
                  <span className="tabular-nums sm:sr-only">
                    {formatMinutes(row.from)}–{formatMinutes(row.to)}
                  </span>
                  <MetaSep className="sm:hidden" />
                  <span className="tabular-nums">
                    Open · {formatDuration(row.to - row.from)}
                    {active && <span className="sr-only"> · now</span>}
                  </span>
                  <span className="ml-auto flex items-center gap-1 opacity-0 transition-opacity duration-120 group-hover/gap:opacity-100 group-focus-visible/gap:opacity-100 pointer-coarse:opacity-100">
                    <Plus className="size-3.5" /> Add block
                  </span>
                </button>
              </TimelineRow>
            );
          }
          const b = row.block;
          const role = b.effectiveRoleId ? roles.get(b.effectiveRoleId) : undefined;
          const current = isToday && nowMin >= b.startMin && nowMin < b.endMin;
          const past = isToday && nowMin >= b.endMin;
          const done = b.status === "done" || b.taskStatus === "done";
          const skipped = b.status === "skipped";
          return (
            <TimelineRow
              key={b.id}
              current={current}
              time={
                <>
                  {/* Now replaces only the start time; the end time stays under it. */}
                  {current ? nowPill : <span className="block">{formatMinutes(b.startMin)}</span>}
                  <span className="block text-faint-foreground">{formatMinutes(b.endMin)}</span>
                </>
              }
            >
              <div
                data-done={done || undefined}
                data-skipped={skipped || undefined}
                data-past={(past && !done) || undefined}
                style={{ "--role": role?.color ?? "var(--border-strong)" } as CSSProperties}
                className={cn(eventBlockVariants({ kind: b.kind, layout: "row" }), "flex items-start gap-2")}
              >
                <button type="button" onClick={() => setDraft(draftFromBlock(b))} className="flex min-w-0 flex-1 flex-col rounded-xs text-left focus-ring-inset">
                  <span className="flex min-w-0 items-center gap-1.5 text-sm">
                    {b.taskKind === "goal" && <Mountain className="size-3.5 shrink-0 text-muted-foreground" />}
                    <EventTitle className="block min-w-0 truncate">{b.title || b.taskTitle}</EventTitle>
                  </span>
                  {/* Below `sm` the time joins this line, above the title. From `sm` it sits in the
                      time column, and the full range stays in the button's name. */}
                  <span className="mt-0.5 flex min-w-0 items-center gap-x-1.5 text-xs text-muted-foreground max-sm:order-first max-sm:mt-0 max-sm:mb-0.5">
                    {current && <NowPill label={nowLabel} className="shrink-0 sm:hidden" />}
                    <span className="shrink-0 tabular-nums sm:sr-only">
                      {formatMinutes(b.startMin)}–{formatMinutes(b.endMin)}
                    </span>
                    {/* On the role tint: muted, never faint. */}
                    <MetaSep className="text-muted-foreground sm:hidden" />
                    <span className="min-w-0 truncate">
                      {current ? "Now" : b.kind === "appointment" ? "Appointment" : "Focus time"}
                      {role ? ` · ${role.name}` : ""}
                    </span>
                  </span>
                </button>
                {/* On touch the gap lets each 44px hit area stand clear of its neighbour's. */}
                <div className="-my-0.5 -mr-1.5 flex shrink-0 gap-0.5 pointer-coarse:gap-4">
                  <IconButton
                    size="icon-xs"
                    label="Happened"
                    icon={<Check />}
                    aria-pressed={b.status === "done"}
                    className="aria-pressed:bg-success-soft aria-pressed:text-success"
                    onClick={() => update.mutate({ id: b.id, status: b.status === "done" ? "planned" : "done" })}
                  />
                  <IconButton
                    size="icon-xs"
                    label="Didn't happen"
                    icon={<SkipForward />}
                    aria-pressed={skipped}
                    onClick={() => update.mutate({ id: b.id, status: b.status === "skipped" ? "planned" : "skipped" })}
                  />
                </div>
              </div>
            </TimelineRow>
          );
        })}
      </ol>
      {sorted.length === 0 && <EmptyState size="compact" className="px-0" title="Nothing scheduled." description="Plenty of room to put first things first." />}
      <BlockDialog
        draft={draft}
        onClose={() => setDraft(null)}
        onSave={(d) => {
          const body = { date: d.date, startMin: d.startMin, endMin: d.endMin, title: d.title, notes: d.notes, roleId: d.roleId, kind: d.kind, quadrant: d.quadrant, status: d.status };
          if (d.id) update.mutate({ id: d.id, ...body });
          else create.mutate({ ...body, taskId: d.taskId });
          setDraft(null);
        }}
        onDelete={(id) => {
          remove.mutate(id);
          setDraft(null);
        }}
        dayStartHour={dayStartHour}
        dayEndHour={dayEndHour}
      />
    </section>
  );
}

/**
 * One line of the agenda: the time in a right-aligned gutter, then the item on the spine. The
 * current item's spine segment turns teal. Below `sm` the gutter folds away and the time moves
 * into the item itself.
 */
function TimelineRow({ time, current, gap = false, children }: { time: ReactNode; current: boolean; gap?: boolean; children: ReactNode }) {
  return (
    <li className="grid grid-cols-1 gap-x-3 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
      <div className={cn("text-right text-xs text-muted-foreground tabular-nums max-sm:hidden", gap ? "pt-1.5" : "pt-3")}>{time}</div>
      <div className={cn("min-w-0 border-l border-border-subtle pb-2 pl-3", current && "-ml-px border-l-2 border-primary")}>{children}</div>
    </li>
  );
}

/** The signature: now, as a teal pill on the spine. */
function NowPill({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn("inline-block rounded-full bg-primary px-1.5 text-2xs font-medium text-primary-foreground tabular-nums", className)}>
      <span className="sr-only">Now, </span>
      {label}
    </span>
  );
}
