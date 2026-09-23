import { pointerIntersection } from "@dnd-kit/collision";
import { DragDropProvider, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Ban, CalendarPlus, Inbox, Mountain, Plus, ShieldCheck, Users2 } from "lucide-react";
import { useState } from "react";
import { flagsForQuadrant, QUADRANTS, QUADRANT_ORDER, type Quadrant } from "@shared/quadrant.ts";
import { useAppState } from "@/components/app-state";
import { QUADRANT_CLASSES, RoleDot } from "@/components/badges";
import { Page, PageHeader } from "@/components/page";
import { DateField, RoleSelect } from "@/components/pickers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import type { Task } from "@/lib/api";
import { formatDuration, relativeDay } from "@/lib/format";
import { useBootstrap, useRolesMap } from "@/lib/hooks";
import { useTaskActions } from "@/lib/mutations";
import { qk, tasksQuery } from "@/lib/queries";
import { cardSensors } from "@/lib/dnd";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/matrix")({
  component: MatrixPage,
});

type Drop = { q: Quadrant | null };

function MatrixPage() {
  const qc = useQueryClient();
  const { today, settings } = useBootstrap();
  const [roleId, setRoleId] = useState<string | null>(null);
  const [showRocks, setShowRocks] = useState(true);
  const { data: tasks = [] } = useQuery(tasksQuery({ view: "open" }));
  const { update, create } = useTaskActions();
  const [active, setActive] = useState<Task | null>(null);

  const visible = tasks.filter((t) => (!roleId || t.roleId === roleId) && (showRocks || t.kind === "task"));
  const inbox = visible.filter((t) => t.quadrant == null);
  const byQ = (q: Quadrant) => visible.filter((t) => t.quadrant === q);
  const total = visible.filter((t) => t.quadrant != null).length;

  const moveTo = (task: Task, q: Quadrant | null) => {
    if (task.quadrant === q) return;
    const flags = q ? flagsForQuadrant(q, task.dueDate, today, settings.urgentWithinDays) : { important: null, urgent: null };
    qc.setQueryData<Task[]>(qk.tasks({ view: "open" }), (old) => old?.map((t) => (t.id === task.id ? { ...t, quadrant: q } : t)));
    update.mutate({ id: task.id, ...flags });
  };

  return (
    <Page width="wide">
      <PageHeader
        eyebrow="Habit 3 · Put first things first"
        title="Time management matrix"
        description="Urgent things act on you; important things need you to act. Triage what you capture, then invest in Quadrant II so that Quadrant I shrinks."
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={showRocks} onCheckedChange={setShowRocks} /> Big rocks
            </label>
            <RoleSelect value={roleId} onChange={setRoleId} placeholder="All roles" size="sm" />
          </>
        }
      />
      <Distribution tasks={visible} total={total} />
      <DragDropProvider
        onDragStart={(e) => setActive((e.operation.source?.data as { task: Task } | undefined)?.task ?? null)}
        onDragEnd={(e) => {
          setActive(null);
          const task = (e.operation.source?.data as { task: Task } | undefined)?.task;
          const target = e.operation.target?.data as Drop | undefined;
          if (e.canceled || !task || !target) return;
          moveTo(task, target.q);
        }}
      >
        <div className={cn("grid gap-3", inbox.length > 0 && "xl:grid-cols-[18rem_1fr]")}>
          {inbox.length > 0 && <InboxColumn tasks={inbox} />}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[auto_1fr_1fr]">
            <div />
            <div className="hidden text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase md:block">Urgent</div>
            <div className="hidden text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase md:block">Not urgent</div>
            {([
              ["Important", [1, 2]],
              ["Not important", [3, 4]],
            ] as const).map(([label, qs]) => (
              <div key={label} className="contents">
                <div className="hidden items-center md:flex">
                  <span className="rotate-180 text-xs font-semibold tracking-wide text-muted-foreground uppercase [writing-mode:vertical-rl]">{label}</span>
                </div>
                {qs.map((q) => (
                  <QuadrantCell
                    key={q}
                    q={q}
                    tasks={byQ(q)}
                    onAdd={(title) => create.mutate({ title, ...flagsForQuadrant(q, null, today, settings.urgentWithinDays), roleId, source: "matrix" })}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>{active ? <CardPreview task={active} /> : null}</DragOverlay>
      </DragDropProvider>
    </Page>
  );
}

function Distribution({ tasks, total }: { tasks: Task[]; total: number }) {
  if (total === 0) return null;
  const est = (q: Quadrant) => tasks.filter((t) => t.quadrant === q).reduce((s, t) => s + (t.estimateMinutes ?? 0), 0);
  return (
    <div className="mb-4 space-y-1.5">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {QUADRANT_ORDER.map((q) => {
          const n = tasks.filter((t) => t.quadrant === q).length;
          return n ? <div key={q} className={QUADRANT_CLASSES[q].solid} style={{ width: `${(n / total) * 100}%` }} title={`Quadrant ${QUADRANTS[q].numeral}: ${n}`} /> : null;
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {QUADRANT_ORDER.map((q) => {
          const n = tasks.filter((t) => t.quadrant === q).length;
          const m = est(q);
          return (
            <span key={q} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", QUADRANT_CLASSES[q].solid)} />
              Q{QUADRANTS[q].numeral} {n}
              {m > 0 && ` · ${formatDuration(m)}`}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function InboxColumn({ tasks }: { tasks: Task[] }) {
  const { ref, isDropTarget } = useDroppable<Drop>({ id: "inbox", data: { q: null }, accept: "task", collisionDetector: pointerIntersection });
  return (
    <section ref={ref} className={cn("rounded-2xl border border-dashed bg-card p-3", isDropTarget && "ring-2 ring-primary/30")}>
      <div className="mb-2 flex items-center gap-2">
        <Inbox className="size-4 text-muted-foreground" />
        <div>
          <div className="text-sm font-semibold">Inbox · {tasks.length}</div>
          <div className="text-xs text-muted-foreground">Drag each into a quadrant: is it important? is it urgent?</div>
        </div>
      </div>
      <ul className="space-y-1.5">
        {tasks.map((t) => (
          <MatrixCard key={t.id} task={t} />
        ))}
      </ul>
    </section>
  );
}

function QuadrantCell({ q, tasks, onAdd }: { q: Quadrant; tasks: Task[]; onAdd: (title: string) => void }) {
  const info = QUADRANTS[q];
  const c = QUADRANT_CLASSES[q];
  const { ref, isDropTarget } = useDroppable<Drop>({ id: `q${q}`, data: { q }, accept: "task", collisionDetector: pointerIntersection });
  const [value, setValue] = useState("");
  return (
    <section
      ref={ref}
      className={cn("flex min-h-56 flex-col rounded-2xl border bg-card p-3 transition-colors", c.border, isDropTarget && cn("ring-2", c.ring, c.bg))}
    >
      <header className="mb-2">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <span aria-hidden className={cn("size-2.5 rounded-full", c.solid)} />
            Q{info.numeral} · {info.verb}
            <span className="ml-2 font-normal text-muted-foreground">{info.label}</span>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{tasks.length}</span>
        </div>
        <p className="text-xs text-muted-foreground">{info.guidance}</p>
      </header>
      <ul className="flex-1 space-y-1.5">
        {tasks.map((t) => (
          <MatrixCard key={t.id} task={t} />
        ))}
      </ul>
      <form
        className="mt-2 flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.trim()) return;
          onAdd(value.trim());
          setValue("");
        }}
      >
        <Plus className="size-3.5 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Add to Q${info.numeral}…`}
          className="h-7 border-none bg-transparent px-1 text-xs shadow-none focus-visible:ring-1 dark:bg-transparent"
        />
      </form>
    </section>
  );
}

function MatrixCard({ task }: { task: Task }) {
  const { ref, isDragging } = useDraggable({ id: task.id, type: "task", data: { task }, sensors: cardSensors });
  const roles = useRolesMap();
  const role = task.roleId ? roles.get(task.roleId) : undefined;
  const { today, weekStart } = useBootstrap();
  const { openTask } = useAppState();
  const { update, prevent } = useTaskActions();
  const q = task.quadrant;

  return (
    <li
      ref={ref}
      className={cn(
        "group flex cursor-grab items-start gap-2 rounded-lg border bg-background px-2 py-1.5 text-sm shadow-xs active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <RoleDot color={role?.color} className="mt-1.5" />
      <button type="button" onClick={() => openTask(task.id)} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-1">
          {task.kind === "goal" && <Mountain className="size-3.5 shrink-0 text-primary" />}
          <span className="line-clamp-2">{task.title}</span>
        </div>
        <div className="flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
          {task.dueDate && (
            <span className={cn(task.urgentReason === "due" && "font-medium text-foreground")}>due {relativeDay(task.dueDate, today)}</span>
          )}
          {task.scheduledDate && <span>planned {relativeDay(task.scheduledDate, today)}</span>}
          {task.createdQuadrant === 2 && q === 1 && <span className="font-medium text-foreground">was Q2</span>}
        </div>
      </button>
      <div data-no-drag className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {q === 1 && (
          <Button variant="ghost" size="icon-xs" title="Prevent it recurring (adds a Q2 step)" aria-label="Prevent" onClick={() => prevent.mutate({ id: task.id })}>
            <ShieldCheck />
          </Button>
        )}
        {q === 2 && (
          <>
            <SchedulePopover task={task} />
            {task.kind === "task" && (
              <Button variant="ghost" size="icon-xs" title="Make it a big rock this week" aria-label="Make big rock" onClick={() => update.mutate({ id: task.id, kind: "goal", weekStart })}>
                <Mountain />
              </Button>
            )}
          </>
        )}
        {q === 3 && (
          <Button variant="ghost" size="icon-xs" title="Delegate" aria-label="Delegate" onClick={() => openTask(task.id)}>
            <Users2 />
          </Button>
        )}
        {(q === 3 || q === 4) && (
          <Button
            variant="ghost"
            size="icon-xs"
            title={q === 4 ? "Drop it" : "Say no"}
            aria-label="Drop"
            onClick={() => update.mutate({ id: task.id, status: "dropped", statusReason: "declined" })}
          >
            <Ban />
          </Button>
        )}
      </div>
    </li>
  );
}

function SchedulePopover({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const { update } = useTaskActions();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="icon-xs" title="Schedule it" aria-label="Schedule" />}>
        <CalendarPlus />
      </PopoverTrigger>
      <PopoverContent className="w-auto" align="end">
        <div className="text-sm font-medium">Schedule it</div>
        <DateField
          value={task.scheduledDate}
          onChange={(scheduledDate) => {
            update.mutate({ id: task.id, scheduledDate });
            setOpen(false);
          }}
          placeholder="Pick a day"
          size="sm"
        />
      </PopoverContent>
    </Popover>
  );
}

function CardPreview({ task }: { task: Task }) {
  return <div className="max-w-64 rounded-lg border bg-card px-3 py-2 text-sm font-medium shadow-lg">{task.title}</div>;
}
