import { pointerIntersection } from "@dnd-kit/collision";
import { DragDropProvider, DragOverlay, useDragOperation, useDraggable, useDroppable } from "@dnd-kit/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Ban, CalendarPlus, CircleX, HeartHandshake, Inbox, Mountain, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { flagsForQuadrant, QUADRANTS, QUADRANT_ORDER, type Quadrant } from "@shared/quadrant.ts";
import { useAppState } from "@/components/app-state";
import { QUADRANT_CLASSES, QuadrantDot, RoleDot } from "@/components/badges";
import { Page, PageHeader } from "@/components/page";
import { DateField, RoleSelect } from "@/components/pickers";
import { QuickAdd } from "@/components/quick-add";
import { MetaSep, RowActions } from "@/components/row";
import { BoardColumn, boardCard, dragSource, type DropState } from "@/components/surface";
import { DueDate, MetaLine } from "@/components/task-row";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
    <Page>
      <PageHeader
        habit={3}
        eyebrow="Put first things first"
        title="Time management matrix"
        description="Urgent things act on you; important things need you to act. Triage what you capture, then invest in Quadrant II so that Quadrant I shrinks."
        actions={
          <>
            <label className="flex h-8 items-center gap-2 text-sm font-medium text-foreground select-none pointer-coarse:h-11">
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
        <div className={cn("grid grid-cols-1 gap-4", inbox.length > 0 && "xl:grid-cols-[18rem_minmax(0,1fr)]")}>
          {inbox.length > 0 && <InboxColumn tasks={inbox} />}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="hidden md:block" />
            <AxisLabel>Urgent</AxisLabel>
            <AxisLabel>Not urgent</AxisLabel>
            {([
              ["Important", [1, 2]],
              ["Not important", [3, 4]],
            ] as const).map(([label, qs]) => (
              <div key={label} className="contents">
                <AxisLabel vertical>{label}</AxisLabel>
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
        {/* No drop animation (DESIGN.md §7.2 fallback): the optimistic move remounts the card in its new
            column, so dnd-kit animates the preview towards a detached element instead of the card. */}
        <DragOverlay dropAnimation={null}>{active ? <CardPreview task={active} /> : null}</DragOverlay>
      </DragDropProvider>
    </Page>
  );
}

/** The two axes, in sentence case. Shown from `md` up, where the quadrants form a 2×2 grid. */
function AxisLabel({ vertical = false, children }: { vertical?: boolean; children: ReactNode }) {
  if (vertical) {
    return (
      <div className="hidden items-center justify-center md:flex">
        <span className="rotate-180 text-xs font-medium text-muted-foreground [writing-mode:vertical-rl]">{children}</span>
      </div>
    );
  }
  // A 16px line pulled 8px towards the wells: the row adds 24px, which the inbox's xl:mt-6 matches.
  return <div className="-mb-2 hidden text-center text-xs leading-4 font-medium text-muted-foreground md:block">{children}</div>;
}

function Distribution({ tasks, total }: { tasks: Task[]; total: number }) {
  if (total === 0) return null;
  const est = (q: Quadrant) => tasks.filter((t) => t.quadrant === q).reduce((s, t) => s + (t.estimateMinutes ?? 0), 0);
  return (
    <div className="mb-8 space-y-2.5">
      {/* The legend below carries the same numbers as text. */}
      <div aria-hidden className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        {QUADRANT_ORDER.map((q) => {
          const n = tasks.filter((t) => t.quadrant === q).length;
          return n ? <div key={q} className={QUADRANT_CLASSES[q].solid} style={{ flex: `${n} 1 0%` }} /> : null;
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
        {QUADRANT_ORDER.map((q) => {
          const n = tasks.filter((t) => t.quadrant === q).length;
          const m = est(q);
          return (
            <span key={q} className="inline-flex items-center gap-1.5">
              <QuadrantDot q={q} />
              <span className="font-medium text-foreground">Q{QUADRANTS[q].numeral}</span>
              {n}
              {m > 0 && (
                <>
                  <MetaSep />
                  {formatDuration(m)}
                </>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Where a column stands in the current drag: over it, open to it, or no drag at all. */
function useDropState(isDropTarget: boolean): DropState {
  const { source } = useDragOperation();
  if (isDropTarget) return "over";
  return source?.type === "task" ? "available" : "idle";
}

/** The one-line explanation under a column heading. */
function ColumnNote({ children }: { children: ReactNode }) {
  return <p className="-mt-1 mb-1.5 px-2 text-xs text-muted-foreground">{children}</p>;
}

function InboxColumn({ tasks }: { tasks: Task[] }) {
  const { ref, isDropTarget } = useDroppable<Drop>({ id: "inbox", data: { q: null }, accept: "task", collisionDetector: pointerIntersection });
  const drop = useDropState(isDropTarget);
  return (
    // At xl the inbox sits beside the quadrants: start it level with their wells, below the axis row,
    // and size it to its cards instead of stretching down the whole grid.
    <BoardColumn ref={ref} icon={<Inbox />} title="Inbox" count={tasks.length} drop={drop} className="min-h-0 xl:mt-6 xl:min-h-60 xl:self-start">
      <ColumnNote>Drag each into a quadrant: is it important? is it urgent?</ColumnNote>
      <ul className="flex flex-col gap-1.5">
        {tasks.map((t) => (
          <MatrixCard key={t.id} task={t} />
        ))}
      </ul>
    </BoardColumn>
  );
}

function QuadrantCell({ q, tasks, onAdd }: { q: Quadrant; tasks: Task[]; onAdd: (title: string) => void }) {
  const info = QUADRANTS[q];
  const { ref, isDropTarget } = useDroppable<Drop>({ id: `q${q}`, data: { q }, accept: "task", collisionDetector: pointerIntersection });
  const drop = useDropState(isDropTarget);
  const [value, setValue] = useState("");
  return (
    <BoardColumn
      ref={ref}
      bar={q}
      dot
      title={`Q${info.numeral} · ${info.verb}`}
      // From md up the axes name each quadrant, so the header keeps the label for screen readers only.
      label={<span className="md:sr-only">{info.label}</span>}
      // The title never gives way to the label on a narrow column. The shared minimum height only
      // earns its place in the 2×2 grid (md+); stacked, each well fits its cards.
      className="min-h-0 md:min-h-60 [&_h2]:shrink-0"
      count={tasks.length}
      lit={q === 2}
      drop={drop}
      footer={
        <QuickAdd
          variant="inline"
          value={value}
          onValueChange={setValue}
          onSubmit={() => {
            if (!value.trim()) return;
            onAdd(value.trim());
            setValue("");
          }}
          placeholder={`Add to Q${info.numeral}…`}
          aria-label={`Add a task to Quadrant ${info.numeral}`}
          // Faint text is never set on a tinted fill (DESIGN.md §2.1): the lit well takes muted.
          className={q === 2 ? "[&_input]:placeholder:text-muted-foreground" : undefined}
        />
      }
    >
      <ColumnNote>{info.guidance}</ColumnNote>
      {tasks.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {tasks.map((t) => (
            <MatrixCard key={t.id} task={t} />
          ))}
        </ul>
      )}
    </BoardColumn>
  );
}

function MatrixCard({ task }: { task: Task }) {
  const { ref, isDragging } = useDraggable({ id: task.id, type: "task", data: { task }, sensors: cardSensors });
  const { openTask } = useAppState();
  return (
    <li
      ref={ref}
      // The card left in place is a quiet placeholder: its actions stay hidden even though the
      // pointerdown focused its title.
      className={cn(
        boardCard,
        "group/row flex cursor-grab items-start gap-2 active:cursor-grabbing",
        isDragging && cn(dragSource, "[&_[data-slot=row-actions]]:invisible"),
      )}
    >
      <CardContent task={task} onOpen={() => openTask(task.id)} />
    </li>
  );
}

/**
 * The card's contents, shared by the card and its drag preview so the two are identical. The
 * preview passes no `onOpen`: its title is plain text and its (invisible) actions are inert,
 * kept only so the text wraps exactly as it does on the card.
 */
function CardContent({ task, onOpen }: { task: Task; onOpen?: () => void }) {
  const roles = useRolesMap();
  const role = task.roleId ? roles.get(task.roleId) : undefined;
  const { today } = useBootstrap();
  const q = task.quadrant;
  const body = (
    <>
      <span className="flex items-start gap-1.5">
        {task.kind === "goal" && (
          <span className="flex h-5 shrink-0 items-center">
            <Mountain aria-hidden className="size-3.5 text-muted-foreground" />
            <span className="sr-only">Big rock: </span>
          </span>
        )}
        <span className="line-clamp-2">{task.title}</span>
      </span>
      <MetaLine
        items={[
          !!task.dueDate && {
            key: "due",
            node: <DueDate date={task.dueDate} today={today} open={task.status === "open"} emphasis={task.urgentReason === "due"} />,
          },
          !!task.scheduledDate && { key: "planned", node: `planned ${relativeDay(task.scheduledDate, today)}` },
          task.createdQuadrant === 2 && q === 1 && { key: "was", node: <span className="font-medium text-foreground">was Q2</span> },
        ]}
      />
    </>
  );
  return (
    <>
      <RoleDot color={role?.color} className="mt-1.5" />
      {onOpen ? (
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 rounded-xs text-left">
          {body}
        </button>
      ) : (
        <div className="min-w-0 flex-1">{body}</div>
      )}
      {/* Stays visible while its Schedule popover is open (focus has moved into the portal). */}
      <RowActions data-no-drag inert={!onOpen || undefined} className="-my-1 -mr-1.5 has-[[aria-expanded=true]]:opacity-100">
        <CardActions task={task} />
      </RowActions>
    </>
  );
}

/** An icon-only card action: its name stays the short `label`; the tooltip explains it. */
function CardAction({ label, tip, icon, children: _children, ...props }: { label: string; tip: string; icon: ReactNode } & Omit<ButtonProps, "aria-label">) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-xs" aria-label={label} {...props} />}>{icon}</TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

function CardActions({ task }: { task: Task }) {
  const { weekStart } = useBootstrap();
  const { openTask } = useAppState();
  const { update, prevent } = useTaskActions();
  const q = task.quadrant;
  return (
    <>
      {q === 1 && <CardAction label="Prevent" tip="Prevent it recurring (adds a Q2 step)" icon={<ShieldCheck />} onClick={() => prevent.mutate({ id: task.id })} />}
      {q === 2 && (
        <>
          <SchedulePopover task={task} />
          {task.kind === "task" && (
            <CardAction
              label="Make big rock"
              tip="Make it a big rock this week"
              icon={<Mountain />}
              onClick={() => update.mutate({ id: task.id, kind: "goal", weekStart })}
            />
          )}
        </>
      )}
      {q === 3 && <CardAction label="Delegate" tip="Delegate" icon={<HeartHandshake />} onClick={() => openTask(task.id)} />}
      {(q === 3 || q === 4) && (
        <CardAction
          label="Drop"
          tip={q === 4 ? "Drop it" : "Say no"}
          icon={q === 4 ? <CircleX /> : <Ban />}
          onClick={() => update.mutate({ id: task.id, status: "dropped", statusReason: "declined" })}
        />
      )}
    </>
  );
}

function SchedulePopover({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const { update } = useTaskActions();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<CardAction label="Schedule" tip="Schedule it" icon={<CalendarPlus />} />} />
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

/** The card under the pointer: the same card, lifted. */
function CardPreview({ task }: { task: Task }) {
  return (
    <div className={cn(boardCard, "flex cursor-grabbing items-start gap-2 animate-dnd-lift")}>
      <CardContent task={task} />
    </div>
  );
}
