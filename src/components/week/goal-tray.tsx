import { useDraggable, useDroppable } from "@dnd-kit/react";
import { pointerIntersection } from "@dnd-kit/collision";
import { Check, CircleDashed, GripVertical, Mountain, Repeat } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import { SAW_DIMENSIONS, type SawDimension } from "@shared/content.ts";
import { GroupLabel } from "@/components/page";
import { RoleDot } from "@/components/badges";
import { Chip } from "@/components/chip";
import { DoneCheck } from "@/components/done-check";
import { QuickAdd } from "@/components/quick-add";
import { MetaSep, RowMeta } from "@/components/row";
import { boardCard, dragSource, dropZone, Well } from "@/components/surface";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Role, WeekBoard, WeekGoal } from "@/lib/api";
import { fmtDate, formatDuration } from "@/lib/format";
import { cardSensors } from "@/lib/dnd";
import { cn } from "@/lib/utils";
import type { DragData, DropData } from "./week-grid";

interface TrayProps {
  board: WeekBoard;
  draggingId: string | null;
  onAddGoal: (input: { title: string; roleId: string; sawDimension?: SawDimension }) => void;
  onToggle: (g: WeekGoal) => void;
  onOpen: (g: WeekGoal) => void;
  className?: string;
}

export function GoalTray({ board, draggingId, onAddGoal, onToggle, onOpen, className }: TrayProps) {
  const { ref, isDropTarget } = useDroppable<DropData>({
    id: "tray",
    data: { kind: "tray" },
    accept: ["dayitem", "block"],
    collisionDetector: pointerIntersection,
  });
  const selected = new Set(board.weekRoleIds);
  const roles = board.roles.filter((r) => selected.has(r.id));
  const inWeek = new Set(roles.map((r) => r.id));
  const orphans = board.goals.filter((g) => !g.roleId || !inWeek.has(g.roleId));
  const unscheduled = board.goals.filter((g) => g.status === "open" && g.blockCount === 0 && !g.scheduledDate).length;
  // Dropping a block here deletes it, so that drop reads as destructive; a priority just goes back to the tray.
  const removesBlock = isDropTarget && !!draggingId?.startsWith("block:");

  return (
    <Well
      as="aside"
      ref={ref}
      aria-labelledby="week-tray-title"
      className={cn(
        "flex min-h-0 flex-col transition-[background-color,outline-color] duration-180 ease-out",
        isDropTarget && dropZone("over", removesBlock ? "danger" : "primary"),
        className,
      )}
    >
      <div className="px-2 pt-1 pb-3">
        {/* In the 16rem tray (below 2xl) the status chip wraps under the title instead of truncating it. */}
        <div className="flex min-h-6 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2 id="week-tray-title" className="min-w-0 text-sm font-semibold text-foreground">
            Roles & big rocks
          </h2>
          {board.goals.length > 0 && (
            <Tooltip>
              <TooltipTrigger
                render={
                  unscheduled ? (
                    <Chip tone="neutral" icon={<CircleDashed aria-hidden />} className="tabular-nums" />
                  ) : (
                    <Chip tone="success" icon={<Check aria-hidden />} />
                  )
                }
              >
                {unscheduled ? `${unscheduled} not placed` : "All placed"}
              </TooltipTrigger>
              <TooltipContent>Rocks without a day or time yet</TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{isDropTarget ? "Drop to unschedule" : "Drag rocks onto a day or a time"}</p>
      </div>
      {/* The scroller reaches the well's edges and pads itself, so card hairlines and focus rings aren't clipped.
          `relative` keeps absolutely positioned descendants (sr-only text) inside it, so they never stretch the page. */}
      <div className="relative -mx-2 -mb-2 min-h-0 flex-1 scroll-fade-y space-y-5 overflow-y-auto px-2 pb-2 scrollbar-thin">
        {roles.map((role) =>
          role.isSaw ? (
            <SawSection key={role.id} role={role} goals={board.goals.filter((g) => g.roleId === role.id)} {...{ draggingId, onAddGoal, onToggle, onOpen }} />
          ) : (
            <RoleSection key={role.id} role={role} goals={board.goals.filter((g) => g.roleId === role.id)} {...{ draggingId, onAddGoal, onToggle, onOpen }} />
          ),
        )}
        {orphans.length > 0 && (
          <section>
            <GroupLabel label="Other" count={orphans.length} className="px-2" />
            <div className="flex flex-col gap-1.5">
              {orphans.map((g) => (
                <GoalCard key={g.id} goal={g} role={undefined} hidden={draggingId === `goal:${g.id}`} onToggle={onToggle} onOpen={onOpen} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Well>
  );
}

/** A role's heading in the tray: dot and name, then the count or a quiet "no rock yet". */
function RoleLabel({ role, count, hint }: { role: Role; count?: number; hint?: ReactNode }) {
  return (
    <GroupLabel
      className="items-center px-2"
      label={
        <span className="flex min-w-0 items-center gap-2">
          <RoleDot color={role.color} />
          <span className="truncate">{role.name}</span>
        </span>
      }
      hint={hint}
      count={count || undefined}
    />
  );
}

function RoleSection({
  role,
  goals,
  draggingId,
  onAddGoal,
  onToggle,
  onOpen,
}: {
  role: Role;
  goals: WeekGoal[];
  draggingId: string | null;
  onAddGoal: TrayProps["onAddGoal"];
  onToggle: TrayProps["onToggle"];
  onOpen: TrayProps["onOpen"];
}) {
  return (
    <section>
      <RoleLabel role={role} count={goals.length} hint={goals.length === 0 ? "· no rock yet" : undefined} />
      <div className="flex flex-col gap-1.5">
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} role={role} hidden={draggingId === `goal:${g.id}`} onToggle={onToggle} onOpen={onOpen} />
        ))}
        <AddInline placeholder="Add a rock…" label={`Add a rock for ${role.name}`} onAdd={(title) => onAddGoal({ title, roleId: role.id })} />
      </div>
    </section>
  );
}

function SawSection({
  role,
  goals,
  draggingId,
  onAddGoal,
  onToggle,
  onOpen,
}: {
  role: Role;
  goals: WeekGoal[];
  draggingId: string | null;
  onAddGoal: TrayProps["onAddGoal"];
  onToggle: TrayProps["onToggle"];
  onOpen: TrayProps["onOpen"];
}) {
  const loose = goals.filter((g) => !g.sawDimension);
  return (
    <section>
      <RoleLabel role={role} />
      <div className="space-y-2">
        {SAW_DIMENSIONS.map((d) => {
          const mine = goals.filter((g) => g.sawDimension === d.key);
          return (
            <div key={d.key} className="flex flex-col gap-1.5">
              <h4 className="px-2 text-xs font-medium text-muted-foreground">{d.label}</h4>
              {mine.map((g) => (
                <GoalCard key={g.id} goal={g} role={role} hidden={draggingId === `goal:${g.id}`} onToggle={onToggle} onOpen={onOpen} />
              ))}
              {mine.length === 0 && (
                <AddInline
                  placeholder={d.examples[0]}
                  label={`Add a ${d.label.toLowerCase()} rock`}
                  onAdd={(title) => onAddGoal({ title, roleId: role.id, sawDimension: d.key })}
                />
              )}
            </div>
          );
        })}
        {loose.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {loose.map((g) => (
              <GoalCard key={g.id} goal={g} role={role} hidden={draggingId === `goal:${g.id}`} onToggle={onToggle} onOpen={onOpen} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function GoalCard({
  goal,
  role,
  hidden,
  onToggle,
  onOpen,
}: {
  goal: WeekGoal;
  role: Role | undefined;
  hidden?: boolean;
  onToggle: (g: WeekGoal) => void;
  onOpen: (g: WeekGoal) => void;
}) {
  const { ref } = useDraggable<DragData>({ id: `goal:${goal.id}`, type: "goal", data: { kind: "goal", task: goal }, sensors: cardSensors });
  const done = goal.status === "done";
  const closed = goal.status === "missed" || goal.status === "dropped";
  const meta: ReactNode[] = [];
  if (goal.blockCount > 0) {
    meta.push(
      <span key="blocks">
        {goal.blockCount}× · {formatDuration(goal.blockMinutes)}
      </span>,
    );
  }
  if (goal.scheduledDate) meta.push(<span key="day">{fmtDate(goal.scheduledDate, "EEE")}</span>);
  if (goal.blockCount === 0 && !goal.scheduledDate && goal.status === "open") {
    meta.push(
      <span key="unplaced" className="inline-flex items-center gap-1">
        <CircleDashed aria-hidden /> Not placed yet
      </span>,
    );
  }
  if (goal.carryCount > 0) {
    meta.push(
      <Tooltip key="carry">
        <TooltipTrigger render={<span className="inline-flex items-center gap-1" />}>
          <Repeat aria-hidden />
          <span aria-hidden>{goal.carryCount}</span>
          <span className="sr-only">Carried over {goal.carryCount}×</span>
        </TooltipTrigger>
        <TooltipContent>Carried over {goal.carryCount}×</TooltipContent>
      </Tooltip>,
    );
  }
  if (goal.estimateMinutes) meta.push(<span key="estimate">est. {formatDuration(goal.estimateMinutes)}</span>);

  return (
    <div
      ref={ref}
      data-done={done || undefined}
      className={cn(boardCard, "group/card flex cursor-grab items-start gap-2 px-2.5 py-2 active:cursor-grabbing", hidden && dragSource)}
    >
      {/* Check and icon centre on the first title line (20px). */}
      <span className="flex h-5 shrink-0 items-center">
        <DoneCheck size="sm" done={done} color={role?.color} celebrate={goal.quadrant === 2} onToggle={() => onToggle(goal)} data-no-drag />
      </span>
      <span className="flex h-5 shrink-0 items-center">
        <Mountain aria-hidden className="size-3.5 text-muted-foreground" />
      </span>
      <button type="button" onClick={() => onOpen(goal)} className="min-w-0 flex-1 rounded-xs text-left">
        <span className={cn("block text-sm break-words text-foreground", closed && "text-muted-foreground")}>
          <span className="strike">{goal.title}</span>
        </span>
        {meta.length > 0 && (
          <RowMeta>
            {meta.map((m, i) => (
              <Fragment key={i}>
                {i > 0 && <MetaSep />}
                {m}
              </Fragment>
            ))}
          </RowMeta>
        )}
      </button>
      {/* Decorative: the whole card drags. Shown on hover, and always on touch. */}
      <span aria-hidden className="flex h-5 shrink-0 items-center text-faint-foreground opacity-0 transition-opacity duration-120 group-hover/card:opacity-100 pointer-coarse:opacity-100">
        <GripVertical className="size-3.5" />
      </span>
    </div>
  );
}

function AddInline({ placeholder, label, onAdd }: { placeholder: string; label: string; onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <QuickAdd
      variant="inline"
      value={value}
      onValueChange={setValue}
      onSubmit={() => {
        if (!value.trim()) return;
        onAdd(value.trim());
        setValue("");
      }}
      placeholder={placeholder}
      aria-label={label}
    />
  );
}
