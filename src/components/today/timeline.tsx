import { Check, Mountain, Plus, SkipForward } from "lucide-react";
import { useState } from "react";
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

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Schedule</h2>
        <Button variant="ghost" size="xs" onClick={() => newAt(Math.max(dayStartHour * 60, Math.ceil(nowMin / 30) * 30))}>
          <Plus /> Add
        </Button>
      </div>
      <ol className="space-y-1">
        {rows.map((row) => {
          if (row.kind === "gap") {
            const active = isToday && nowMin >= row.from && nowMin < row.to;
            return (
              <li key={`gap-${row.from}`}>
                <button
                  type="button"
                  onClick={() => newAt(Math.ceil(Math.max(row.from, isToday ? nowMin : 0) / 30) * 30)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border border-dashed px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted/60",
                    active && "border-primary/40 text-foreground",
                  )}
                >
                  <span className="w-20 shrink-0 tabular-nums">
                    {formatMinutes(row.from)}–{formatMinutes(row.to)}
                  </span>
                  <span>
                    Open · {formatDuration(row.to - row.from)}
                    {active && " · now"}
                  </span>
                </button>
              </li>
            );
          }
          const b = row.block;
          const role = b.effectiveRoleId ? roles.get(b.effectiveRoleId) : undefined;
          const current = isToday && nowMin >= b.startMin && nowMin < b.endMin;
          const past = isToday && nowMin >= b.endMin;
          const done = b.status === "done" || b.taskStatus === "done";
          return (
            <li key={b.id}>
              <div
                className={cn(
                  "group flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm",
                  current && "ring-2 ring-primary/50",
                  (b.status === "skipped" || (past && !done)) && "opacity-70",
                )}
                style={{ borderLeft: `3px solid ${role?.color ?? "var(--border)"}` }}
              >
                <span className="w-20 shrink-0 text-xs text-muted-foreground tabular-nums">
                  {formatMinutes(b.startMin)}–{formatMinutes(b.endMin)}
                </span>
                <button type="button" onClick={() => setDraft(draftFromBlock(b))} className="min-w-0 flex-1 text-left">
                  <span className={cn("flex items-center gap-1.5", (done || b.status === "skipped") && "text-muted-foreground line-through")}>
                    {b.taskKind === "goal" && <Mountain className="size-3.5 shrink-0 text-primary" />}
                    <span className="truncate">{b.title || b.taskTitle}</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {current ? "Now" : b.kind === "appointment" ? "Appointment" : "Focus time"}
                    {role ? ` · ${role.name}` : ""}
                  </span>
                </button>
                <div className="flex gap-0.5 opacity-60 group-hover:opacity-100">
                  <Button
                    variant={b.status === "done" ? "secondary" : "ghost"}
                    size="icon-xs"
                    aria-label="Happened"
                    title="Happened"
                    onClick={() => update.mutate({ id: b.id, status: b.status === "done" ? "planned" : "done" })}
                  >
                    <Check />
                  </Button>
                  <Button
                    variant={b.status === "skipped" ? "secondary" : "ghost"}
                    size="icon-xs"
                    aria-label="Didn't happen"
                    title="Didn't happen"
                    onClick={() => update.mutate({ id: b.id, status: b.status === "skipped" ? "planned" : "skipped" })}
                  >
                    <SkipForward />
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {sorted.length === 0 && <p className="text-xs text-muted-foreground">Nothing scheduled. Plenty of room to put first things first.</p>}
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
    </div>
  );
}
