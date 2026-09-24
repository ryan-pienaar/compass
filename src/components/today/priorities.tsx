import { CollisionPriority } from "@dnd-kit/abstract";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider, useDragOperation, useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { ArrowRightFromLine, CalendarClock, Crosshair, GripVertical, Mountain } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { addDaysISO } from "@shared/dates.ts";
import { useAppState } from "@/components/app-state";
import { QuadrantBadge, RoleDot } from "@/components/badges";
import { ChoiceChip } from "@/components/chip";
import { DoneCheck } from "@/components/done-check";
import { IconButton } from "@/components/icon-button";
import { Meter } from "@/components/meter";
import { GroupLabel } from "@/components/page";
import { DateField } from "@/components/pickers";
import { QuickAdd } from "@/components/quick-add";
import { MetaSep, Row, RowActions, RowMeta, RowTitle } from "@/components/row";
import { dropZone } from "@/components/surface";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader className="items-center">
        <CardTitle as="h2">Today&apos;s priorities</CardTitle>
        {items.length > 0 && (
          <CardAction>
            <span className="text-xs text-muted-foreground tabular-nums">
              {done} of {items.length}
            </span>
            <Meter className="w-16" size="sm" value={done / items.length} label="Priorities done" />
          </CardAction>
        )}
      </CardHeader>
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
        <div className="space-y-3">
          {GROUPS.map((grp) => {
            const ids = groups[grp.key];
            if (grp.key === "none" && ids.length === 0) return null;
            return (
              <GroupColumn key={grp.key} group={grp.key} label={grp.label} hint={grp.hint} ids={ids}>
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
    </Card>
  );
}

function GroupColumn({ group, label, hint, ids, children }: { group: Group; label: string; hint: string; ids: string[]; children: React.ReactNode }) {
  // The id must equal the group key: move() uses it to drop into an empty group.
  const { ref, isDropTarget } = useDroppable({ id: group, type: "column", accept: "item", collisionPriority: CollisionPriority.Low });
  // Visual only: while a priority is dragged every group shows it can take it, and the group
  // holding it (move() re-homes it on drag over) or under the pointer is marked as the target.
  const { source } = useDragOperation();
  const holdsSource = source != null && ids.includes(String(source.id));
  const state = isDropTarget || holdsSource ? "over" : source ? "available" : "idle";
  return (
    <section ref={ref} className={cn("-mx-3 rounded-lg pt-2 pb-1 transition-[background-color,outline-color] duration-180 ease-out", dropZone(state))}>
      {/* The label heads the check column and the empty line sits in the title column, so the
          grip gutter stays clear (the grip only shows on hover, focus and touch). */}
      <GroupLabel label={label} hint={hint} className="pr-3 pl-10" />
      <ul>{children}</ul>
      {ids.length === 0 && <p className="flex min-h-10 items-center pr-3 pl-18 text-sm text-muted-foreground">Drag a task here, or add one below.</p>}
    </section>
  );
}

function PriorityItem({ task, index, group, date }: { task: Task; index: number; group: Group; date: string }) {
  const handle = useRef<HTMLButtonElement | null>(null);
  const { ref } = useSortable({ id: task.id, index, group, type: "item", accept: "item", handle, sensors: cardSensors });
  const roles = useRolesMap();
  const role = task.roleId ? roles.get(task.roleId) : undefined;
  const toggle = useToggleDone();
  const { openTask, openFocus } = useAppState();
  const done = task.status === "done";
  const pastDue = !!task.dueDate && task.dueDate < date;

  return (
    <Row
      as="li"
      ref={ref}
      divided
      done={done}
      className={cn(
        "before:left-18",
        // The lifted row gets the sheet's surface (dnd-kit's own top-layer reset would leave it clear).
        "not-data-[dnd-placeholder]:data-[dnd-dragging]:bg-card! not-data-[dnd-placeholder]:data-[dnd-dragging]:ring-1 not-data-[dnd-placeholder]:data-[dnd-dragging]:ring-edge",
        // The origin slot is a dashed ghost (global rule); no hairline inside it.
        "data-[dnd-placeholder]:before:hidden",
      )}
    >
      <button
        ref={handle}
        type="button"
        aria-label="Drag to reorder"
        className={cn(
          "relative -mr-1 -ml-1 grid size-6 shrink-0 cursor-grab place-items-center rounded-xs text-faint-foreground opacity-0 transition-[opacity,color] duration-120 group-hover/row:opacity-100 hover:text-foreground focus-visible:opacity-100 active:cursor-grabbing pointer-coarse:opacity-100",
          // A touch hit area that grows up, down and outward, away from the check beside it.
          "pointer-coarse:after:absolute pointer-coarse:after:-inset-y-2.5 pointer-coarse:after:right-0 pointer-coarse:after:-left-2.5",
        )}
      >
        <GripVertical className="size-4" />
      </button>
      <DoneCheck done={done} onToggle={() => toggle(task)} color={role?.color} celebrate={task.kind === "goal" && task.quadrant === 2} />
      <button type="button" onClick={() => openTask(task.id)} className="min-w-0 flex-1 rounded-xs text-left focus-ring-inset">
        <span className="flex min-w-0 items-center gap-1.5">
          {task.kind === "goal" && <Mountain className="size-3.5 shrink-0 text-muted-foreground" />}
          <RowTitle>{task.title}</RowTitle>
        </span>
        {/* From `sm` one line that never wraps: the role name gives way first. Below `sm` the quadrant
            joins the role, and the due date drops to its own line when both don't fit, so the role
            name stays readable. */}
        <RowMeta as="span" className={cn("max-sm:gap-x-2 sm:flex-nowrap", !role && !task.dueDate && "sm:hidden")}>
          <span className="flex min-w-0 items-center gap-x-2 sm:contents">
            <QuadrantBadge q={task.quadrant} size="xs" className="sm:hidden" />
            {role && (
              <span className="flex min-w-0 items-center gap-1.5">
                <RoleDot color={role.color} />
                <span className="truncate">{role.name}</span>
              </span>
            )}
          </span>
          {/* No separator where the line may wrap: it would dangle at a line end. */}
          {role && task.dueDate && <MetaSep className="max-sm:hidden" />}
          {task.dueDate && (
            <span className={cn("flex shrink-0 items-center gap-1 whitespace-nowrap", pastDue && "text-warning")}>
              <CalendarClock />
              {pastDue ? "was due" : "due"} {relativeDay(task.dueDate, date)}
            </span>
          )}
        </RowMeta>
      </button>
      {!done && (
        <RowActions className="has-aria-expanded:opacity-100 pointer-coarse:gap-4">
          <IconButton size="icon-xs" label="Focus on this" icon={<Crosshair />} onClick={() => openFocus(task.id)} />
          <MoveButton task={task} date={date} />
        </RowActions>
      )}
      {/* After the actions, so the badges line up on the right edge whether or not a row has actions. */}
      <QuadrantBadge q={task.quadrant} size="xs" className="max-sm:hidden" />
    </Row>
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
  const whyId = useId();
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
      <PopoverTrigger render={<IconButton size="icon-xs" label="Move to another day" icon={<ArrowRightFromLine />} />} />
      <PopoverContent align="end" className="w-88">
        <p id={whyId} className="text-sm font-medium">
          Why move it?
        </p>
        <div role="group" aria-labelledby={whyId} className="flex flex-wrap gap-1.5">
          {REASONS.map((r) => (
            <ChoiceChip key={r.value} selection="single" pressed={reason === r.value} onClick={() => setReason(r.value)} className="h-7 px-2.5 text-xs">
              {r.label}
            </ChoiceChip>
          ))}
        </div>
        <p className="mt-1 border-t border-border-subtle pt-3 text-sm font-medium">Move to</p>
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
    <QuickAdd
      value={value}
      onValueChange={setValue}
      onSubmit={() => {
        if (!value.trim()) return;
        onAdd(value.trim());
        setValue("");
      }}
      placeholder="Add a priority for today…"
      aria-label="Add priority"
    />
  );
}
