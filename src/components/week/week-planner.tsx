import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import type { SawDimension } from "@shared/content.ts";
import { useAppState } from "@/components/app-state";
import { Skeleton } from "@/components/ui/skeleton";
import { api, call, type Block, type Task, type WeekBoard } from "@/lib/api";
import { useBootstrap } from "@/lib/hooks";
import { useApiMutation, useBlockActions, useTaskActions, useToggleDone } from "@/lib/mutations";
import { qk, weekQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { BlockDialog, draftFromBlock, type BlockDraft } from "./block-dialog";
import { GoalTray } from "./goal-tray";
import { clamp, yToMinute } from "./layout";
import { DragPreview, useColumnRegistry, WeekGrid, type DragData, type DropData, type HoverSlot } from "./week-grid";

const RANK: Record<string, number> = { A: 0, B: 1, C: 2 };
const byPriority = (a: Task, b: Task) =>
  (a.priority ? RANK[a.priority] : 3) - (b.priority ? RANK[b.priority] : 3) ||
  Number(b.kind === "goal") - Number(a.kind === "goal") ||
  a.sortOrder - b.sortOrder;

/**
 * Covey's weekly worksheet, interactive: roles and big rocks on the left,
 * seven days on the right. Rocks go in first: onto a day as a priority, or
 * (better) onto a time as an appointment.
 */
export function WeekPlanner({ start, height = "calc(100svh - 13rem)", className }: { start: string; height?: string; className?: string }) {
  const { data: board } = useQuery(weekQuery(start));
  if (!board) {
    return (
      <div className={cn("grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]", className)}>
        <Skeleton style={{ height }} />
        <Skeleton style={{ height }} />
      </div>
    );
  }
  return <Planner board={board} start={start} height={height} className={className} />;
}

function Planner({ board, start, height, className }: { board: WeekBoard; start: string; height: string; className?: string }) {
  const qc = useQueryClient();
  const { today } = useBootstrap();
  const { openTask } = useAppState();
  const taskActions = useTaskActions();
  const blockActions = useBlockActions();
  const toggleDone = useToggleDone();
  const cols = useColumnRegistry();
  const [hover, setHover] = useState<HoverSlot | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [blockDraft, setBlockDraft] = useState<BlockDraft | null>(null);
  const grab = useRef<number | null>(null);

  const rolesById = useMemo(() => new Map(board.roles.map((r) => [r.id, r])), [board.roles]);
  const dayStartMin = board.settings.dayStartHour * 60;
  const dayEndMin = board.settings.dayEndHour * 60;

  const dayItems = useMemo(() => {
    const map: Record<string, Task[]> = Object.fromEntries(board.days.map((d) => [d, [] as Task[]]));
    for (const t of [...board.goals, ...board.dayTasks]) if (t.scheduledDate && map[t.scheduledDate]) map[t.scheduledDate].push(t);
    for (const d of board.days) map[d].sort(byPriority);
    return map;
  }, [board]);

  const patchBoard = (fn: (b: WeekBoard) => WeekBoard) =>
    qc.setQueryData<WeekBoard>(qk.week(start), (old) => (old ? fn(old) : old));

  const setScheduled = (task: Task, date: string | null) => {
    patchBoard((b) => ({
      ...b,
      goals: b.goals.map((g) => (g.id === task.id ? { ...g, scheduledDate: date } : g)),
      dayTasks: b.dayTasks.map((t) => (t.id === task.id ? { ...t, scheduledDate: date } : t)),
    }));
    taskActions.update.mutate({ id: task.id, scheduledDate: date });
  };

  const durationFor = (data: DragData) => {
    if (data.kind === "block") return data.block.endMin - data.block.startMin;
    const est = data.task.estimateMinutes;
    return est && est <= 120 ? est : board.settings.defaultBlockMinutes;
  };

  const slotFor = (data: DragData, date: string, pointerY: number): HoverSlot | null => {
    const el = cols.map.current.get(date);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const dur = durationFor(data);
    const top = data.kind === "block" && grab.current != null ? pointerY - grab.current : pointerY - 10;
    const startMin = clamp(yToMinute(top - rect.top, dayStartMin), dayStartMin, Math.max(dayStartMin, dayEndMin - dur));
    return { date, startMin, endMin: Math.min(1440, startMin + dur) };
  };

  const handleDrop = (data: DragData, target: DropData, pointerY: number) => {
    if (target.kind === "prio") {
      if (data.kind === "block") return;
      if (data.task.scheduledDate !== target.date) setScheduled(data.task, target.date);
      return;
    }
    if (target.kind === "tray") {
      if (data.kind === "dayitem") setScheduled(data.task, null);
      if (data.kind === "block") {
        const b = data.block;
        patchBoard((x) => ({ ...x, blocks: x.blocks.filter((y) => y.id !== b.id) }));
        blockActions.remove.mutate(b.id, {
          onSuccess: () =>
            toast("Time block removed", {
              action: {
                label: "Undo",
                onClick: () =>
                  blockActions.create.mutate({
                    date: b.date,
                    startMin: b.startMin,
                    endMin: b.endMin,
                    title: b.title,
                    taskId: b.taskId,
                    roleId: b.roleId,
                    kind: b.kind,
                    quadrant: b.quadrant as 1 | null,
                  }),
              },
            }),
        });
      }
      return;
    }
    const slot = slotFor(data, target.date, pointerY);
    if (!slot) return;
    if (data.kind === "block") {
      const b = data.block;
      if (b.date === slot.date && b.startMin === slot.startMin) return;
      patchBoard((x) => ({
        ...x,
        blocks: x.blocks.map((y) => (y.id === b.id ? { ...y, date: slot.date, startMin: slot.startMin, endMin: slot.endMin } : y)),
      }));
      blockActions.update.mutate({ id: b.id, date: slot.date, startMin: slot.startMin, endMin: slot.endMin });
      return;
    }
    const task = data.task;
    const temp: Block = {
      id: `temp-${Date.now()}`,
      date: slot.date,
      startMin: slot.startMin,
      endMin: slot.endMin,
      title: task.title,
      notes: "",
      taskId: task.id,
      roleId: task.roleId,
      kind: "focus",
      quadrant: null,
      status: "planned",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      effectiveQuadrant: task.quadrant,
      effectiveRoleId: task.roleId,
      taskTitle: task.title,
      taskStatus: task.status,
      taskKind: task.kind,
    };
    patchBoard((x) => ({ ...x, blocks: [...x.blocks, temp] }));
    blockActions.create.mutate({ date: slot.date, startMin: slot.startMin, endMin: slot.endMin, taskId: task.id });
    // A priority that becomes an appointment no longer needs its day slot.
    if (data.kind === "dayitem") setScheduled(task, null);
  };

  const addGoal = useApiMutation((input: { title: string; roleId: string; sawDimension?: SawDimension }) =>
    call(api.tasks.$post({ json: { ...input, kind: "goal", weekStart: start } })),
  );

  const saveBlock = (d: BlockDraft) => {
    const body = {
      date: d.date,
      startMin: d.startMin,
      endMin: d.endMin,
      title: d.title,
      notes: d.notes,
      roleId: d.roleId,
      kind: d.kind,
      quadrant: d.quadrant,
      status: d.status,
    };
    if (d.id) blockActions.update.mutate({ id: d.id, ...body });
    else blockActions.create.mutate({ ...body, taskId: d.taskId });
    setBlockDraft(null);
  };

  return (
    <DragDropProvider
      onDragStart={(event) => {
        const source = event.operation.source;
        const data = source?.data as DragData | undefined;
        setDraggingId(source ? String(source.id) : null);
        grab.current = null;
        if (data?.kind === "block" && source?.element) {
          grab.current = event.operation.position.current.y - source.element.getBoundingClientRect().top;
        }
      }}
      onDragMove={(event) => {
        const data = event.operation.source?.data as DragData | undefined;
        const target = event.operation.target?.data as DropData | undefined;
        if (!data || target?.kind !== "grid") {
          if (hover) setHover(null);
          return;
        }
        const next = slotFor(data, target.date, event.operation.position.current.y);
        if (!next || (hover && next.date === hover.date && next.startMin === hover.startMin)) return;
        setHover(next);
      }}
      onDragEnd={(event) => {
        const data = event.operation.source?.data as DragData | undefined;
        const target = event.operation.target?.data as DropData | undefined;
        const y = event.operation.position.current.y;
        setHover(null);
        setDraggingId(null);
        if (event.canceled || !data || !target) return;
        handleDrop(data, target, y);
      }}
    >
      <div className={cn("grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]", className)} style={{ "--week-h": height } as CSSProperties}>
        <GoalTray
          board={board}
          draggingId={draggingId}
          onAddGoal={(input) => addGoal.mutate(input)}
          onToggle={(g) => toggleDone(g)}
          onOpen={(g) => openTask(g.id)}
          className="max-h-[70svh] lg:h-(--week-h) lg:max-h-none"
        />
        <WeekGrid
          className="h-(--week-h) min-h-80"
          days={board.days}
          today={today}
          dayStartHour={board.settings.dayStartHour}
          dayEndHour={board.settings.dayEndHour}
          blocks={board.blocks}
          dayItems={dayItems}
          rolesById={rolesById}
          hover={hover}
          draggingId={draggingId}
          registerColumn={cols.register}
          onCreateAt={(date, startMin) =>
            setBlockDraft({
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
            })
          }
          onOpenBlock={(b) => setBlockDraft(draftFromBlock(b))}
          onResizeBlock={(b, endMin) => {
            patchBoard((x) => ({ ...x, blocks: x.blocks.map((y) => (y.id === b.id ? { ...y, endMin } : y)) }));
            blockActions.update.mutate({ id: b.id, endMin });
          }}
          onToggleItem={(t) => toggleDone(t)}
          onOpenItem={(t) => openTask(t.id)}
          onToggleBlockDone={(b) => blockActions.update.mutate({ id: b.id, status: b.status === "done" ? "planned" : "done" })}
        />
      </div>
      <DragOverlay dropAnimation={null}>{(source) => <DragPreview data={source?.data as DragData | undefined} rolesById={rolesById} />}</DragOverlay>
      <BlockDialog
        draft={blockDraft}
        onClose={() => setBlockDraft(null)}
        onSave={saveBlock}
        onDelete={(id) => {
          blockActions.remove.mutate(id);
          setBlockDraft(null);
        }}
        dayStartHour={board.settings.dayStartHour}
        dayEndHour={board.settings.dayEndHour}
      />
    </DragDropProvider>
  );
}
