import { useDraggable, useDroppable } from "@dnd-kit/react";
import { pointerIntersection } from "@dnd-kit/collision";
import { Check, Mountain } from "lucide-react";
import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { fromISODate } from "@shared/dates.ts";
import type { Block, Role, Task } from "@/lib/api";
import { formatDuration, formatMinutes, fmtDate } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { cardSensors } from "@/lib/dnd";
import { cn } from "@/lib/utils";
import { RoleDot } from "@/components/badges";
import { HOUR_PX, layoutLanes, minuteToY, PX_PER_MIN, SNAP_MIN } from "./layout";

export type DragData =
  | { kind: "goal"; task: Task }
  | { kind: "dayitem"; task: Task; date: string }
  | { kind: "block"; block: Block };

export type DropData = { kind: "prio"; date: string } | { kind: "grid"; date: string } | { kind: "tray" };

export interface HoverSlot {
  date: string;
  startMin: number;
  endMin: number;
}

interface WeekGridProps {
  days: string[];
  today: string;
  dayStartHour: number;
  dayEndHour: number;
  blocks: Block[];
  dayItems: Record<string, Task[]>;
  rolesById: Map<string, Role>;
  hover: HoverSlot | null;
  draggingId: string | null;
  registerColumn: (date: string, el: HTMLElement | null) => void;
  onCreateAt: (date: string, startMin: number) => void;
  onOpenBlock: (b: Block) => void;
  onResizeBlock: (b: Block, endMin: number) => void;
  onToggleItem: (t: Task) => void;
  onOpenItem: (t: Task) => void;
  onToggleBlockDone: (b: Block) => void;
  className?: string;
}

export function WeekGrid(props: WeekGridProps) {
  const { days, today, dayStartHour, dayEndHour } = props;
  const dayStartMin = dayStartHour * 60;
  const dayEndMin = dayEndHour * 60;
  const hours = Array.from({ length: dayEndHour - dayStartHour }, (_, i) => dayStartHour + i);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Start at a useful hour: an hour before now during the day (this week), otherwise the
  // earliest block of the week (or 07:00), so evening planning shows the whole day.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const earliest = Math.min(7 * 60, ...props.blocks.map((b) => b.startMin));
    const daytime = days.includes(today) && nowMin > dayStartMin + 60 && nowMin < dayEndMin - 3 * 60;
    const target = daytime ? nowMin - 60 : earliest - 30;
    el.scrollTop = Math.max(0, minuteToY(target, dayStartMin));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0]]);

  return (
    <div
      ref={scrollRef}
      className={cn("relative overflow-auto rounded-xl border bg-card scrollbar-thin", props.className)}
    >
      <div className="grid min-w-[760px]" style={{ gridTemplateColumns: "3.25rem repeat(7, minmax(0, 1fr))" }}>
        {/* Sticky header: day names + priorities lane */}
        <div className="sticky top-0 z-20 col-span-8 grid border-b bg-card/95 backdrop-blur" style={{ gridTemplateColumns: "3.25rem repeat(7, minmax(0, 1fr))" }}>
          <div className="flex items-end justify-center pb-1 text-[10px] text-muted-foreground" />
          {days.map((d) => (
            <DayHeader key={d} date={d} isToday={d === today} />
          ))}
          <div className="flex items-start justify-center border-t pt-2 text-[10px] font-medium text-muted-foreground uppercase [writing-mode:vertical-rl] rotate-180">
            Priorities
          </div>
          {days.map((d) => (
            <PriorityLane
              key={d}
              date={d}
              items={props.dayItems[d] ?? []}
              rolesById={props.rolesById}
              onToggle={props.onToggleItem}
              onOpen={props.onOpenItem}
              draggingId={props.draggingId}
            />
          ))}
        </div>

        {/* Hour labels */}
        <div className="relative" style={{ height: hours.length * HOUR_PX }}>
          {hours.map((h, i) => (
            <div key={h} className="absolute right-1.5 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums" style={{ top: i * HOUR_PX }}>
              {i === 0 ? "" : formatMinutes(h * 60)}
            </div>
          ))}
        </div>

        {days.map((d) => (
          <DayColumn
            key={d}
            date={d}
            isToday={d === today}
            hours={hours.length}
            dayStartMin={dayStartMin}
            dayEndMin={dayEndMin}
            blocks={props.blocks.filter((b) => b.date === d)}
            rolesById={props.rolesById}
            hover={props.hover?.date === d ? props.hover : null}
            draggingId={props.draggingId}
            registerColumn={props.registerColumn}
            onCreateAt={props.onCreateAt}
            onOpenBlock={props.onOpenBlock}
            onResizeBlock={props.onResizeBlock}
            onToggleBlockDone={props.onToggleBlockDone}
          />
        ))}
      </div>
    </div>
  );
}

function DayHeader({ date, isToday }: { date: string; isToday: boolean }) {
  const d = fromISODate(date);
  return (
    <div className="flex flex-col items-center gap-0.5 border-l py-2">
      <span className={cn("text-[11px] font-medium uppercase", isToday ? "text-primary" : "text-muted-foreground")}>{fmtDate(date, "EEE")}</span>
      <span
        className={cn(
          "grid size-7 place-items-center rounded-full text-sm font-semibold tabular-nums",
          isToday && "bg-primary text-primary-foreground",
        )}
      >
        {d.getDate()}
      </span>
    </div>
  );
}

function PriorityLane({
  date,
  items,
  rolesById,
  onToggle,
  onOpen,
  draggingId,
}: {
  date: string;
  items: Task[];
  rolesById: Map<string, Role>;
  onToggle: (t: Task) => void;
  onOpen: (t: Task) => void;
  draggingId: string | null;
}) {
  const { ref, isDropTarget } = useDroppable<DropData>({
    id: `prio:${date}`,
    data: { kind: "prio", date },
    accept: ["goal", "dayitem"],
    collisionDetector: pointerIntersection,
  });
  return (
    <div
      ref={ref}
      className={cn(
        "flex max-h-32 min-h-14 flex-col gap-1 overflow-y-auto border-t border-l p-1 scrollbar-thin transition-colors",
        isDropTarget && "bg-primary/10 ring-2 ring-primary/40 ring-inset",
      )}
    >
      {items.map((t) => (
        <PriorityChip key={t.id} task={t} date={date} role={t.roleId ? rolesById.get(t.roleId) : undefined} onToggle={onToggle} onOpen={onOpen} hidden={draggingId === `dayitem:${t.id}`} />
      ))}
      {items.length === 0 && <div className="m-auto text-[10px] text-muted-foreground/60">drop here</div>}
    </div>
  );
}

function PriorityChip({
  task,
  date,
  role,
  onToggle,
  onOpen,
  hidden,
}: {
  task: Task;
  date: string;
  role: Role | undefined;
  onToggle: (t: Task) => void;
  onOpen: (t: Task) => void;
  hidden: boolean;
}) {
  const { ref } = useDraggable<DragData>({ id: `dayitem:${task.id}`, type: "dayitem", data: { kind: "dayitem", task, date }, sensors: cardSensors });
  const done = task.status === "done";
  return (
    <div
      ref={ref}
      className={cn(
        "group flex cursor-grab items-center gap-1 rounded-md border bg-background px-1 py-0.5 text-[11px] leading-tight shadow-xs active:cursor-grabbing",
        hidden && "opacity-30",
      )}
      style={{ borderLeftColor: role?.color, borderLeftWidth: role ? 3 : 1 }}
    >
      <button
        type="button"
        aria-label={done ? "Mark not done" : "Mark done"}
        data-no-drag
        onClick={() => onToggle(task)}
        className={cn("grid size-3.5 shrink-0 place-items-center rounded-sm border", done && "border-primary bg-primary text-primary-foreground")}
      >
        {done && <Check className="size-2.5" />}
      </button>
      <button type="button" onClick={() => onOpen(task)} title={task.title} className={cn("line-clamp-2 min-w-0 flex-1 text-left break-words", done && "text-muted-foreground line-through")}>
        {task.kind === "goal" && <Mountain className="mr-0.5 inline size-3 text-primary" />}
        {task.priority && <span className="mr-0.5 font-semibold text-muted-foreground">{task.priority}</span>}
        {task.title}
      </button>
    </div>
  );
}

function DayColumn({
  date,
  isToday,
  hours,
  dayStartMin,
  dayEndMin,
  blocks,
  rolesById,
  hover,
  draggingId,
  registerColumn,
  onCreateAt,
  onOpenBlock,
  onResizeBlock,
  onToggleBlockDone,
}: {
  date: string;
  isToday: boolean;
  hours: number;
  dayStartMin: number;
  dayEndMin: number;
  blocks: Block[];
  rolesById: Map<string, Role>;
  hover: HoverSlot | null;
  draggingId: string | null;
  registerColumn: (date: string, el: HTMLElement | null) => void;
  onCreateAt: (date: string, startMin: number) => void;
  onOpenBlock: (b: Block) => void;
  onResizeBlock: (b: Block, endMin: number) => void;
  onToggleBlockDone: (b: Block) => void;
}) {
  const { ref, isDropTarget } = useDroppable<DropData>({
    id: `grid:${date}`,
    data: { kind: "grid", date },
    accept: ["goal", "dayitem", "block"],
    collisionDetector: pointerIntersection,
  });
  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      ref(el);
      registerColumn(date, el);
    },
    [ref, registerColumn, date],
  );
  const laid = layoutLanes(blocks);
  const now = useNow(60_000);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  return (
    <div
      ref={setRefs}
      className={cn("relative border-l", isToday && "bg-primary/[0.03]", isDropTarget && "bg-primary/5")}
      style={{ height: hours * HOUR_PX }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const m = Math.floor((y / PX_PER_MIN + dayStartMin) / 30) * 30;
        onCreateAt(date, Math.min(m, dayEndMin - 30));
      }}
    >
      {Array.from({ length: hours }, (_, i) => (
        <div key={i} className="pointer-events-none absolute inset-x-0 border-t border-border/60" style={{ top: i * HOUR_PX }}>
          <div className="absolute inset-x-0 border-t border-dashed border-border/30" style={{ top: HOUR_PX / 2 }} />
        </div>
      ))}
      {isToday && nowMin >= dayStartMin && nowMin <= dayEndMin && (
        <div className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-q1" style={{ top: minuteToY(nowMin, dayStartMin) }}>
          <div className="absolute -top-1 -left-1 size-2.5 rounded-full bg-q1" />
        </div>
      )}
      {hover && (
        <div
          className="pointer-events-none absolute inset-x-1 z-10 rounded-md border-2 border-dashed border-primary bg-primary/10"
          style={{ top: minuteToY(hover.startMin, dayStartMin), height: Math.max(12, (hover.endMin - hover.startMin) * PX_PER_MIN) }}
        >
          <span className="absolute top-0.5 left-1 text-[10px] font-medium text-primary">
            {formatMinutes(hover.startMin)}–{formatMinutes(hover.endMin)}
          </span>
        </div>
      )}
      {laid.map(({ item: b, lane, lanes }) => (
        <GridBlock
          key={b.id}
          block={b}
          role={b.effectiveRoleId ? rolesById.get(b.effectiveRoleId) : undefined}
          dayStartMin={dayStartMin}
          dayEndMin={dayEndMin}
          style={{
            top: minuteToY(Math.max(b.startMin, dayStartMin), dayStartMin),
            height: Math.max(14, (Math.min(b.endMin, dayEndMin) - Math.max(b.startMin, dayStartMin)) * PX_PER_MIN - 2),
            left: `calc(${(lane / lanes) * 100}% + 2px)`,
            width: `calc(${100 / lanes}% - 4px)`,
          }}
          hidden={draggingId === `block:${b.id}`}
          onOpen={onOpenBlock}
          onResize={onResizeBlock}
          onToggleDone={onToggleBlockDone}
        />
      ))}
    </div>
  );
}

function GridBlock({
  block,
  role,
  style,
  hidden,
  dayStartMin,
  dayEndMin,
  onOpen,
  onResize,
  onToggleDone,
}: {
  block: Block;
  role: Role | undefined;
  style: CSSProperties;
  hidden: boolean;
  dayStartMin: number;
  dayEndMin: number;
  onOpen: (b: Block) => void;
  onResize: (b: Block, endMin: number) => void;
  onToggleDone: (b: Block) => void;
}) {
  const handleRef = useRef<HTMLDivElement | null>(null);
  const { ref } = useDraggable<DragData>({ id: `block:${block.id}`, type: "block", data: { kind: "block", block }, handle: handleRef, sensors: cardSensors });
  const [resizeEnd, setResizeEnd] = useState<number | null>(null);
  const endMin = resizeEnd ?? block.endMin;
  const height = resizeEnd != null ? Math.max(14, (Math.min(resizeEnd, dayEndMin) - Math.max(block.startMin, dayStartMin)) * PX_PER_MIN - 2) : style.height;
  const done = block.status === "done" || block.taskStatus === "done";
  const skipped = block.status === "skipped";
  const color = role?.color ?? "var(--muted-foreground)";
  const compact = (endMin - block.startMin) < 45;

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const original = block.endMin;
    let latest = original;
    const move = (ev: PointerEvent) => {
      const delta = (ev.clientY - startY) / PX_PER_MIN;
      latest = Math.max(block.startMin + SNAP_MIN, Math.min(1440, Math.round((original + delta) / SNAP_MIN) * SNAP_MIN));
      setResizeEnd(latest);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (latest !== original) onResize(block, latest);
      // The click that ends a resize must not reach the day column, which would start a new block.
      const swallow = (ev: MouseEvent) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      window.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => {
        window.removeEventListener("click", swallow, { capture: true });
        setResizeEnd(null);
      }, 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      ref={ref}
      className={cn(
        "group absolute z-[5] flex flex-col overflow-hidden rounded-md border text-[11px] leading-tight shadow-xs transition-opacity",
        block.kind === "appointment" ? "bg-background" : "",
        hidden && "opacity-30",
        skipped && "opacity-50",
      )}
      style={{
        ...style,
        height,
        borderLeft: `3px solid ${color}`,
        backgroundColor: block.kind === "focus" ? `color-mix(in oklch, ${color} 14%, var(--card))` : undefined,
      }}
    >
      <div
        ref={handleRef}
        role="button"
        tabIndex={0}
        onClick={() => onOpen(block)}
        onKeyDown={(e) => e.key === "Enter" && onOpen(block)}
        className="flex min-h-0 flex-1 cursor-grab flex-col gap-0.5 px-1.5 py-1 active:cursor-grabbing"
        title={`${block.title} · ${formatMinutes(block.startMin)}–${formatMinutes(endMin)}`}
      >
        <div className={cn("flex items-start gap-1 font-medium", (done || skipped) && "line-through decoration-muted-foreground")}>
          {block.taskKind === "goal" && <Mountain className="mt-px size-3 shrink-0 text-primary" />}
          <span className={cn(compact ? "truncate" : "line-clamp-3")}>{block.title || block.taskTitle || "Untitled"}</span>
        </div>
        {!compact && (
          <div className="text-[10px] text-muted-foreground tabular-nums">
            {formatMinutes(block.startMin)}–{formatMinutes(endMin)} · {formatDuration(endMin - block.startMin)}
          </div>
        )}
      </div>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleDone(block);
        }}
        aria-label={done ? "Mark as not done" : "Mark as done"}
        className={cn(
          "absolute top-1 right-1 grid size-4 place-items-center rounded-sm border bg-background/80 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100",
          done && "border-primary bg-primary text-primary-foreground opacity-100",
        )}
      >
        {done && <Check className="size-3" />}
      </button>
      <div
        onPointerDown={startResize}
        className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize opacity-0 group-hover:bg-foreground/20 group-hover:opacity-100"
        aria-hidden
      />
    </div>
  );
}

export function DragPreview({ data, rolesById }: { data: DragData | undefined; rolesById: Map<string, Role> }): ReactNode {
  if (!data) return null;
  if (data.kind === "block") {
    const b = data.block;
    const role = b.effectiveRoleId ? rolesById.get(b.effectiveRoleId) : undefined;
    return (
      <div
        className="rounded-md border bg-card px-1.5 py-1 text-[11px] font-medium shadow-lg"
        style={{ borderLeft: `3px solid ${role?.color ?? "var(--muted-foreground)"}`, height: Math.max(14, (b.endMin - b.startMin) * PX_PER_MIN - 2), width: 140 }}
      >
        {b.title || b.taskTitle}
      </div>
    );
  }
  const t = data.task;
  const role = t.roleId ? rolesById.get(t.roleId) : undefined;
  return (
    <div className="flex max-w-60 items-center gap-1.5 rounded-lg border bg-card px-2 py-1.5 text-xs font-medium shadow-lg">
      <RoleDot color={role?.color} />
      <span className="truncate">{t.title}</span>
    </div>
  );
}

/** Keeps a live map of day column elements for precise drop-time maths. */
export function useColumnRegistry() {
  const map = useRef(new Map<string, HTMLElement>());
  const register = useCallback((date: string, el: HTMLElement | null) => {
    if (el) map.current.set(date, el);
    else map.current.delete(date);
  }, []);
  return { map, register };
}
