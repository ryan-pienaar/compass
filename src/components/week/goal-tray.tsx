import { useDraggable, useDroppable } from "@dnd-kit/react";
import { pointerIntersection } from "@dnd-kit/collision";
import { Check, GripVertical, Plus, Repeat } from "lucide-react";
import { useState } from "react";
import { SAW_DIMENSIONS, type SawDimension } from "@shared/content.ts";
import { RoleDot } from "@/components/badges";
import { Input } from "@/components/ui/input";
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

  return (
    <aside
      ref={ref}
      className={cn(
        "flex min-h-0 flex-col rounded-xl border bg-card transition-colors",
        isDropTarget && "bg-destructive/5 ring-2 ring-destructive/30",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <div>
          <div className="text-sm font-semibold">Roles & big rocks</div>
          <div className="text-xs text-muted-foreground">
            {isDropTarget ? "Drop to unschedule" : "Drag rocks onto a day or a time"}
          </div>
        </div>
        {board.goals.length > 0 && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              unscheduled ? "bg-warning/15 text-warning" : "bg-success/15 text-success",
            )}
            title="Rocks without a day or time yet"
          >
            {unscheduled ? `${unscheduled} unscheduled` : "All placed"}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 scrollbar-thin">
        {roles.map((role) =>
          role.isSaw ? (
            <SawSection key={role.id} role={role} goals={board.goals.filter((g) => g.roleId === role.id)} {...{ draggingId, onAddGoal, onToggle, onOpen }} />
          ) : (
            <RoleSection key={role.id} role={role} goals={board.goals.filter((g) => g.roleId === role.id)} {...{ draggingId, onAddGoal, onToggle, onOpen }} />
          ),
        )}
        {orphans.length > 0 && (
          <section className="space-y-1.5">
            <div className="text-xs font-semibold text-muted-foreground">Other</div>
            {orphans.map((g) => (
              <GoalCard key={g.id} goal={g} role={undefined} hidden={draggingId === `goal:${g.id}`} onToggle={onToggle} onOpen={onOpen} />
            ))}
          </section>
        )}
      </div>
    </aside>
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
    <section className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs font-semibold">
        <RoleDot color={role.color} />
        <span className="truncate">{role.name}</span>
        {goals.length === 0 && <span className="font-normal text-muted-foreground">· no rock yet</span>}
      </div>
      {goals.map((g) => (
        <GoalCard key={g.id} goal={g} role={role} hidden={draggingId === `goal:${g.id}`} onToggle={onToggle} onOpen={onOpen} />
      ))}
      <AddInline placeholder="Add a rock…" onAdd={(title) => onAddGoal({ title, roleId: role.id })} />
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
    <section className="space-y-2 rounded-lg border border-dashed p-2">
      <div className="flex items-center gap-2 text-xs font-semibold">
        <RoleDot color={role.color} />
        {role.name}
      </div>
      {SAW_DIMENSIONS.map((d) => {
        const mine = goals.filter((g) => g.sawDimension === d.key);
        return (
          <div key={d.key} className="space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground">{d.label}</div>
            {mine.map((g) => (
              <GoalCard key={g.id} goal={g} role={role} hidden={draggingId === `goal:${g.id}`} onToggle={onToggle} onOpen={onOpen} />
            ))}
            {mine.length === 0 && (
              <AddInline placeholder={d.examples[0]} onAdd={(title) => onAddGoal({ title, roleId: role.id, sawDimension: d.key })} />
            )}
          </div>
        );
      })}
      {loose.map((g) => (
        <GoalCard key={g.id} goal={g} role={role} hidden={draggingId === `goal:${g.id}`} onToggle={onToggle} onOpen={onOpen} />
      ))}
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
  return (
    <div
      ref={ref}
      className={cn(
        "group flex cursor-grab items-start gap-1.5 rounded-lg border bg-background px-1.5 py-1.5 text-sm shadow-xs active:cursor-grabbing",
        hidden && "opacity-30",
        closed && "opacity-60",
      )}
    >
      <GripVertical aria-hidden className="mt-0.5 size-3.5 shrink-0 cursor-grab text-muted-foreground/60" />
      <button
        type="button"
        onClick={() => onToggle(goal)}
        data-no-drag
        aria-label={done ? "Mark as not done" : "Mark as done"}
        className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded border", done && "border-primary bg-primary text-primary-foreground")}
        style={!done && role ? { borderColor: role.color } : undefined}
      >
        {done && <Check className="size-3" />}
      </button>
      <button type="button" onClick={() => onOpen(goal)} className="min-w-0 flex-1 text-left">
        <div className={cn("leading-snug", done && "text-muted-foreground line-through")}>{goal.title}</div>
        <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
          {goal.blockCount > 0 && (
            <span className="rounded bg-primary/10 px-1 font-medium text-primary">
              {goal.blockCount}× · {formatDuration(goal.blockMinutes)}
            </span>
          )}
          {goal.scheduledDate && <span className="rounded bg-muted px-1 font-medium">{fmtDate(goal.scheduledDate, "EEE")}</span>}
          {goal.blockCount === 0 && !goal.scheduledDate && goal.status === "open" && <span className="text-warning">unscheduled</span>}
          {goal.carryCount > 0 && (
            <span className="inline-flex items-center gap-0.5" title={`Carried over ${goal.carryCount}×`}>
              <Repeat className="size-2.5" /> {goal.carryCount}
            </span>
          )}
          {goal.estimateMinutes ? <span>est. {formatDuration(goal.estimateMinutes)}</span> : null}
        </div>
      </button>
    </div>
  );
}

function AddInline({ placeholder, onAdd }: { placeholder: string; onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        onAdd(value.trim());
        setValue("");
      }}
      className="flex items-center gap-1"
    >
      <Plus className="size-3.5 shrink-0 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-7 border-none bg-transparent px-1 text-xs shadow-none focus-visible:ring-1 dark:bg-transparent"
      />
    </form>
  );
}
