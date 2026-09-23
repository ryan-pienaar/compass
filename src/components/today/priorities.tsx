import { CollisionPriority } from "@dnd-kit/abstract";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider, useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { ArrowRightFromLine, Check, Crosshair, GripVertical, Mountain, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { addDaysISO } from "@shared/dates.ts";
import { useAppState } from "@/components/app-state";
import { QuadrantBadge, RoleDot } from "@/components/badges";
import { DateField } from "@/components/pickers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api, call, type Task } from "@/lib/api";
import { relativeDay } from "@/lib/format";
import { useRolesMap } from "@/lib/hooks";
import { cardSensors } from "@/lib/dnd";
import { useApiMutation, useTaskActions, useToggleDone, type RescheduleReason } from "@/lib/mutations";
import { cn } from "@/lib/utils";

type Group = "A" | "B" | "C" | "none";
const GROUPS: { key: Group; label: string; hint: string }[] = [
  { key: "A", label: "A · Vital", hint: "Must happen today" },
  { key: "B", label: "B · Important", hint: "Should happen today" },
  { key: "C", label: "C · Optional", hint: "Nice if there's time" },
  { key: "none", label: "Not ranked yet", hint: "Give these a letter" },
];

type Groups = Record<Group, string[]>;

function toGroups(items: Task[]): Groups {
  const g: Groups = { A: [], B: [], C: [], none: [] };
  for (const t of items) g[(t.priority ?? "none") as Group].push(t.id);
  return g;
}

/** Third-generation A/B/C ordering, used the fourth-generation way: inside a week already organized around roles. */
export function Priorities({ date, items }: { date: string; items: Task[] }) {
  const byId = useMemo(() => new Map(items.map((t) => [t.id, t])), [items]);
  const [groups, setGroupsState] = useState<Groups>(() => toGroups(items));
  const latest = useRef(groups);
  const setGroups = (g: Groups) => {
    latest.current = g;
    setGroupsState(g);
  };
  const dragging = useRef(false);
  const snapshot = useRef<Groups | null>(null);
  const reorder = useApiMutation((payload: { id: string; priority: "A" | "B" | "C" | null; sortOrder: number }[]) =>
    call(api.tasks.day[":date"].order.$put({ param: { date }, json: { items: payload } })),
  );
  const { create } = useTaskActions();

  // Follow server data unless the user is mid-drag.
  useEffect(() => {
    if (!dragging.current) {
      const g = toGroups(items);
      latest.current = g;
      setGroupsState(g);
    }
  }, [items]);

  const persist = (g: Groups) => {
    const payload = (Object.keys(g) as Group[]).flatMap((key) =>
      g[key].map((id, i) => ({ id, priority: key === "none" ? null : key, sortOrder: i })),
    );
    reorder.mutate(payload);
  };

  const done = items.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Today&apos;s priorities</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {done}/{items.length} done
        </span>
      </div>
      <DragDropProvider
        onDragStart={() => {
          dragging.current = true;
          snapshot.current = latest.current;
        }}
        onDragOver={(event) => setGroups(move(latest.current, event))}
        onDragEnd={(event) => {
          dragging.current = false;
          if (event.canceled) {
            if (snapshot.current) setGroups(snapshot.current);
            return;
          }
          persist(latest.current);
        }}
      >
        <div className="space-y-2">
          {GROUPS.map((grp) => {
            const ids = groups[grp.key];
            if (grp.key === "none" && ids.length === 0) return null;
            return (
              <GroupColumn key={grp.key} group={grp.key} label={grp.label} hint={grp.hint} empty={ids.length === 0}>
                {ids.map((id, index) => {
                  const t = byId.get(id);
                  return t ? <PriorityItem key={id} task={t} index={index} group={grp.key} date={date} /> : null;
                })}
              </GroupColumn>
            );
          })}
        </div>
      </DragDropProvider>
      <AddPriority onAdd={(title) => create.mutate({ title, scheduledDate: date, priority: "B", source: "today" })} />
    </div>
  );
}

function GroupColumn({ group, label, hint, empty, children }: { group: Group; label: string; hint: string; empty: boolean; children: React.ReactNode }) {
  // The id must equal the group key: move() uses it to drop into an empty group.
  const { ref, isDropTarget } = useDroppable({ id: group, type: "column", accept: "item", collisionPriority: CollisionPriority.Low });
  return (
    <section
      ref={ref}
      className={cn("rounded-xl border bg-card p-2 transition-colors", isDropTarget && "ring-2 ring-primary/30", group === "none" && "border-dashed")}
    >
      <div className="flex items-baseline gap-2 px-1 pb-1">
        <span className={cn("text-xs font-semibold", group === "A" && "text-primary")}>{label}</span>
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      </div>
      <ul className="min-h-8 space-y-1">{children}</ul>
      {empty && <div className="px-1 pb-1 text-xs text-muted-foreground/70">Drag items here</div>}
    </section>
  );
}

function PriorityItem({ task, index, group, date }: { task: Task; index: number; group: Group; date: string }) {
  const handle = useRef<HTMLButtonElement | null>(null);
  const { ref, isDragging } = useSortable({ id: task.id, index, group, type: "item", accept: "item", handle, sensors: cardSensors });
  const roles = useRolesMap();
  const role = task.roleId ? roles.get(task.roleId) : undefined;
  const toggle = useToggleDone();
  const { openTask, openFocus } = useAppState();
  const done = task.status === "done";

  return (
    <li
      ref={ref}
      className={cn(
        "group flex items-center gap-2 rounded-lg border bg-background px-1.5 py-1.5 text-sm",
        isDragging && "opacity-50 shadow-lg",
      )}
    >
      <button ref={handle} type="button" className="cursor-grab text-muted-foreground/50 hover:text-foreground active:cursor-grabbing" aria-label="Drag to reorder">
        <GripVertical className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => toggle(task)}
        aria-label={done ? "Mark as not done" : "Mark as done"}
        className={cn("grid size-5 shrink-0 place-items-center rounded-md border-2", done ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary")}
        style={!done && role ? { borderColor: role.color } : undefined}
      >
        {done && <Check className="size-3.5" />}
      </button>
      <button type="button" onClick={() => openTask(task.id)} className="min-w-0 flex-1 text-left">
        <span className={cn("flex items-center gap-1.5", done && "text-muted-foreground line-through")}>
          {task.kind === "goal" && <Mountain className="size-3.5 shrink-0 text-primary" />}
          <span className="truncate">{task.title}</span>
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {role && (
            <>
              <RoleDot color={role.color} /> {role.name}
            </>
          )}
          {task.dueDate && <span>· due {relativeDay(task.dueDate, date)}</span>}
        </span>
      </button>
      <QuadrantBadge q={task.quadrant} size="xs" />
      {!done && (
        <div className="flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button variant="ghost" size="icon-xs" onClick={() => openFocus(task.id)} aria-label="Focus on this" title="Focus">
            <Crosshair />
          </Button>
          <MoveButton task={task} date={date} />
        </div>
      )}
    </li>
  );
}

const REASONS: { value: RescheduleReason; label: string }[] = [
  { value: "higher_value", label: "Someone needed me" },
  { value: "crisis", label: "A real crisis" },
  { value: "interruption", label: "Others' priorities" },
  { value: "overplanned", label: "I overplanned" },
  { value: "not_today", label: "It can wait" },
];

/** Moment of choice: moving a plan is fine, and noticing *why* builds self-awareness. */
function MoveButton({ task, date }: { task: Task; date: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<RescheduleReason>("not_today");
  const [other, setOther] = useState<string | null>(null);
  const { reschedule } = useTaskActions();
  const go = (toDate: string | null) => {
    reschedule.mutate(
      { id: task.id, toDate, reason },
      {
        onSuccess: () =>
          toast.success(toDate ? `Moved to ${relativeDay(toDate, date)}` : "Back on your list for weekly planning", {
            description: reason === "higher_value" ? "People over schedules. That's integrity, not failure." : undefined,
          }),
      },
    );
    setOpen(false);
  };
  const tomorrow = addDaysISO(date, 1);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Move to another day" title="Move" />}>
        <ArrowRightFromLine />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="text-sm font-medium">Why move it?</div>
        <div className="flex flex-wrap gap-1">
          {REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReason(r.value)}
              className={cn("rounded-full border px-2 py-0.5 text-xs", reason === r.value ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="text-sm font-medium">Move to</div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => go(tomorrow)}>
            Tomorrow
          </Button>
          <DateField value={other} onChange={(d) => d && (setOther(d), go(d))} placeholder="Pick a day" size="sm" clearable={false} />
          <Button size="sm" variant="ghost" onClick={() => go(null)}>
            Unschedule
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AddPriority({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        onAdd(value.trim());
        setValue("");
      }}
    >
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Add a priority for today…" className="h-9" />
      <Button type="submit" variant="outline" size="icon" disabled={!value.trim()} aria-label="Add priority">
        <Plus />
      </Button>
    </form>
  );
}
