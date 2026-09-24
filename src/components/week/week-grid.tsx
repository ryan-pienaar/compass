import { useDraggable, useDroppable } from "@dnd-kit/react";
import { pointerIntersection } from "@dnd-kit/collision";
import { ListChecks, Mountain } from "lucide-react";
import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { fromISODate } from "@shared/dates.ts";
import type { Block, Role, Task } from "@/lib/api";
import { formatMinutes, fmtDate } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { cardSensors } from "@/lib/dnd";
import { cn } from "@/lib/utils";
import { RoleDot } from "@/components/badges";
import { DoneCheck } from "@/components/done-check";
import { EventTime, EventTitle, eventBlockVariants, tierFor, type EventTier } from "@/components/event-block";
import { MetaSep } from "@/components/row";
import { boardCard, dragSource, dropZone, type DropState } from "@/components/surface";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { blockHeight, HOUR_PX, layoutLanes, minuteToY, PX_PER_MIN, SNAP_MIN } from "./layout";

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

/**
 * One column template for the header and the body: a 3.5rem hour gutter and seven day columns that
 * never shrink below a readable width. Narrower than that, the grid scrolls sideways inside its card
 * (snapping to a day on phones) and the page itself never does.
 */
const WEEK_COLS =
  "grid-cols-(--week-cols) [--week-cols:3.5rem_repeat(7,minmax(7.5rem,1fr))] md:[--week-cols:3.5rem_repeat(7,minmax(5.25rem,1fr))]";
/**
 * The same minimum as a width (3.5rem + 7 × 7.5rem, or 3.5rem + 7 × 5.25rem from `md`, which keeps all
 * seven days in view at 1280px with the sidebar and tray open). The grid box itself must be this
 * wide, not just its tracks: sticky cells (the hour gutter) can't travel past the edge of their grid
 * container.
 */
const WEEK_MIN_W = "min-w-[56rem] md:min-w-[40.25rem]";

/** Today's column wash: the one tint on the grid, tying today to the now pill in the gutter. */
const TODAY_WASH = "bg-[color-mix(in_oklab,var(--primary)_4%,transparent)]";

/** Vertical padding per block tier (DESIGN.md §6.2 event-block). */
const TIER_PAD: Record<EventTier, string> = { xs: "py-0", sm: "py-0.5", md: "py-1" };

/** Neutral bar and tint for a block without a role (teal is never a category colour). */
const roleVar = (role: Role | undefined) => ({ "--role": role?.color ?? "var(--muted-foreground)" }) as CSSProperties;

export function WeekGrid(props: WeekGridProps) {
  const { days, today, dayStartHour, dayEndHour } = props;
  const dayStartMin = dayStartHour * 60;
  const dayEndMin = dayEndHour * 60;
  const hours = Array.from({ length: dayEndHour - dayStartHour }, (_, i) => dayStartHour + i);
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = useNow(60_000);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = days.includes(today) && nowMin >= dayStartMin && nowMin <= dayEndMin;
  const nowY = minuteToY(nowMin, dayStartMin);
  const hover = props.hover;
  const hoverY = hover ? minuteToY(hover.startMin, dayStartMin) : 0;
  const pillYs = [...(showNow ? [nowY] : []), ...(hover ? [hoverY] : [])];
  // Priority lanes take rocks and day items; they show where to drop only while one is in the air.
  const laneDrag = !!props.draggingId && (props.draggingId.startsWith("goal:") || props.draggingId.startsWith("dayitem:"));

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
    <Card variant="flush" className={cn("min-w-0", props.className)}>
      <div
        ref={scrollRef}
        className={cn(
          "isolate min-h-0 flex-1 overflow-auto overscroll-x-contain scroll-pl-14 scrollbar-thin",
          // Phones snap to a day; never mid-drag, where snapping would fight the auto-scroll.
          !props.draggingId && "max-md:snap-x max-md:snap-mandatory",
        )}
      >
        <div className={cn("grid", WEEK_COLS, WEEK_MIN_W)}>
          {/* Sticky header: day names + priorities lane */}
          <div className={cn("sticky top-0 z-20 col-span-full grid border-b border-border-subtle bg-card/95 backdrop-blur-md", WEEK_COLS)}>
            <div aria-hidden className="sticky left-0 z-30 bg-card" />
            {days.map((d) => (
              <DayHeader key={d} date={d} isToday={d === today} isPast={d < today} />
            ))}
            <div className="sticky left-0 z-30 flex justify-center border-t border-border-subtle bg-card pt-2.5">
              <Tooltip>
                <TooltipTrigger render={<span className="flex text-muted-foreground" />}>
                  <ListChecks aria-hidden className="size-4" />
                  <span className="sr-only">Priorities</span>
                </TooltipTrigger>
                <TooltipContent side="right">Priorities for the day</TooltipContent>
              </Tooltip>
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
                available={laneDrag}
              />
            ))}
          </div>

          {/* Hour labels, and the now pill that ties today's line to the gutter */}
          <div className="sticky left-0 z-10 bg-card" style={{ height: hours.length * HOUR_PX }}>
            {hours.map((h, i) => {
              // A pill (now, or the drop time during a drag) replaces the hour label it would sit on.
              const covered = pillYs.some((y) => Math.abs(i * HOUR_PX - y) < 12);
              return i === 0 ? null : (
                <div
                  key={h}
                  aria-hidden={covered || undefined}
                  className={cn("absolute right-2 -translate-y-1/2 text-2xs text-muted-foreground tabular-nums", covered && "invisible")}
                  style={{ top: i * HOUR_PX }}
                >
                  {formatMinutes(h * 60)}
                </div>
              );
            })}
            {showNow && (
              <div
                className="absolute right-1 z-10 -translate-y-1/2 rounded-full bg-primary px-1.5 text-2xs font-medium text-primary-foreground tabular-nums"
                style={{ top: nowY }}
              >
                <span className="sr-only">Now, </span>
                {formatMinutes(nowMin)}
              </div>
            )}
            {hover && (
              // Where a drag would land, read off the gutter: the slot itself is usually under the drag preview.
              <div
                aria-hidden
                className="absolute right-1 z-10 -translate-y-1/2 rounded-full bg-card px-1.5 text-2xs font-medium text-primary-ink tabular-nums ring-1 ring-primary"
                style={{ top: hoverY }}
              >
                {formatMinutes(hover.startMin)}
              </div>
            )}
          </div>

          {days.map((d) => (
            <DayColumn
              key={d}
              date={d}
              isToday={d === today}
              nowMark={showNow ? (d === today ? "today" : d < today ? "before" : null) : null}
              nowY={nowY}
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
    </Card>
  );
}

function DayHeader({ date, isToday, isPast }: { date: string; isToday: boolean; isPast: boolean }) {
  const d = fromISODate(date);
  return (
    <div aria-current={isToday ? "date" : undefined} className="flex flex-col items-center border-l border-border-subtle pt-2 pb-1.5">
      <span className={cn("text-2xs font-medium", isPast ? "text-faint-foreground" : "text-muted-foreground")}>{fmtDate(date, "EEE")}</span>
      <span
        className={cn(
          "mt-0.5 grid size-8 place-items-center rounded-full text-lg font-medium tabular-nums",
          isToday ? "bg-primary text-primary-foreground" : isPast ? "text-faint-foreground" : "text-foreground",
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
  available,
}: {
  date: string;
  items: Task[];
  rolesById: Map<string, Role>;
  onToggle: (t: Task) => void;
  onOpen: (t: Task) => void;
  draggingId: string | null;
  available: boolean;
}) {
  const { ref, isDropTarget } = useDroppable<DropData>({
    id: `prio:${date}`,
    data: { kind: "prio", date },
    accept: ["goal", "dayitem"],
    collisionDetector: pointerIntersection,
  });
  const drop: DropState = isDropTarget ? "over" : available ? "available" : "idle";
  return (
    <div
      ref={ref}
      className={cn(
        // p-1, not p-1.5: at the narrowest day column every pixel goes to the chip titles.
        "flex max-h-32 min-h-14 flex-col gap-1 overflow-y-auto border-t border-l border-border-subtle p-1 scrollbar-thin transition-[background-color,outline-color] duration-180 ease-out",
        dropZone(drop),
      )}
    >
      {items.map((t) => (
        <PriorityChip
          key={t.id}
          task={t}
          date={date}
          role={t.roleId ? rolesById.get(t.roleId) : undefined}
          onToggle={onToggle}
          onOpen={onOpen}
          hidden={draggingId === `dayitem:${t.id}`}
        />
      ))}
      {items.length === 0 && available && <div className="m-auto text-2xs text-muted-foreground">Drop here</div>}
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
  const marked = task.kind === "goal" || !!task.priority;
  return (
    <div
      ref={ref}
      data-done={done || undefined}
      style={role ? ({ "--role": role.color } as CSSProperties) : undefined}
      className={cn(
        "role-scope @container/chip flex cursor-grab items-start gap-1 rounded-lg bg-card px-1.5 py-1 text-2xs shadow-xs ring-1 ring-edge active:cursor-grabbing",
        hidden && dragSource,
      )}
    >
      {/* The check, then the rock icon and priority letter. In a narrow day column they stack under the
          check, so the title keeps the width for whole words; from an 8rem chip they sit beside it and the
          text steps up to text-xs. Each row is one title line tall, so the check centres on the first line. */}
      <span className="flex shrink-0 flex-col items-center @[8rem]/chip:flex-row @[8rem]/chip:gap-1 @[8rem]/chip:text-xs">
        <span className="flex h-4 items-center @[8rem]/chip:h-4.5">
          <DoneCheck
            size="sm"
            done={done}
            color={role?.color}
            celebrate={task.kind === "goal" && task.quadrant === 2}
            onToggle={() => onToggle(task)}
            data-no-drag
            aria-label={done ? "Mark not done" : "Mark done"}
          />
        </span>
        {marked && (
          <span aria-hidden className="flex h-4 items-center gap-0.5 text-muted-foreground @[8rem]/chip:h-4.5">
            {task.kind === "goal" && <Mountain className="size-3.5" />}
            {task.priority && <span className="font-semibold">{task.priority}</span>}
          </span>
        )}
      </span>
      <Tooltip>
        <TooltipTrigger
          delay={600}
          render={
            <button
              type="button"
              onClick={() => onOpen(task)}
              className="line-clamp-2 min-w-0 flex-1 rounded-xs text-left break-words @[8rem]/chip:text-xs"
            />
          }
        >
          {task.priority && <span className="sr-only">{task.priority} </span>}
          <span className="strike">{task.title}</span>
        </TooltipTrigger>
        <TooltipContent>{task.title}</TooltipContent>
      </Tooltip>
    </div>
  );
}

function DayColumn({
  date,
  isToday,
  nowMark,
  nowY,
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
  /** Where the now line runs in this column: solid in today's, a faint lead-in on the days before it. */
  nowMark: "today" | "before" | null;
  nowY: number;
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
  const { ref } = useDroppable<DropData>({
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

  // The registered element is exactly the timed area: every decoration inside it is
  // pointer-events-none, so a click on empty time reaches it (e.target === e.currentTarget).
  return (
    <div
      ref={setRefs}
      className={cn("relative snap-start border-l border-border-subtle", isToday && TODAY_WASH)}
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
        <div
          key={i}
          aria-hidden
          className={cn("pointer-events-none absolute inset-x-0", i > 0 && "border-t border-border-subtle")}
          style={{ top: i * HOUR_PX }}
        >
          <div className="absolute inset-x-0 border-t border-dotted border-border-subtle" style={{ top: HOUR_PX / 2 }} />
        </div>
      ))}
      {nowMark === "before" && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-px -translate-y-1/2 bg-[color-mix(in_oklab,var(--primary)_35%,transparent)] dark:bg-[color-mix(in_oklab,var(--primary)_60%,transparent)]"
          style={{ top: nowY }}
        />
      )}
      {nowMark === "today" && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 z-6 h-0.5 -translate-y-1/2 bg-primary" style={{ top: nowY }}>
          <div className="absolute top-1/2 left-0 size-2 -translate-y-1/2 rounded-full bg-primary" />
        </div>
      )}
      {hover && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0.5 z-6 rounded-sm bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] outline-1 -outline-offset-1 outline-primary/60"
          style={{ top: minuteToY(hover.startMin, dayStartMin), height: blockHeight(hover.endMin - hover.startMin) }}
        >
          <span className="absolute top-0.5 left-1.5 text-2xs font-medium text-primary-ink tabular-nums">
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
            height: blockHeight(Math.min(b.endMin, dayEndMin) - Math.max(b.startMin, dayStartMin)),
            // 2px from the column lines and 2px between side-by-side lanes.
            left: `calc(2px + ${lane} * (100% - 2px) / ${lanes})`,
            width: `calc((100% - 2px) / ${lanes} - 2px)`,
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

/**
 * The first line of a block keeps clear of the done check wherever the check always shows: on a done
 * block, and on touch. The time line sits below the check, so it keeps the full width.
 */
const CHECK_ROOM = "in-data-[done]:pr-4 pointer-coarse:pr-4";

/** A block's text, by tier: title only (≤20 min), "Title · 09:30" (≤40), or title then time. */
function BlockBody({ block, endMin, tier, height }: { block: Block; endMin: number; tier: EventTier; height: number }) {
  const title = block.title || block.taskTitle || "Untitled";
  const goal = block.taskKind === "goal" && <Mountain aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />;
  if (tier === "md") {
    return (
      <>
        <div className={cn("flex min-w-0 items-start gap-1", CHECK_ROOM)}>
          {goal && <span className="flex h-4 shrink-0 items-center">{goal}</span>}
          {/* Title lines set 16px apart, so an hour-long block (54px) fits two of them above its time. */}
          <EventTitle as="div" className={cn("min-w-0 text-xs leading-4 break-words", height < 52 ? "line-clamp-1" : "line-clamp-2")}>
            {title}
          </EventTitle>
        </div>
        <EventTime className="truncate text-2xs">
          {formatMinutes(block.startMin)}–{formatMinutes(endMin)}
        </EventTime>
      </>
    );
  }
  return (
    <div className={cn("flex min-w-0 items-center gap-1 whitespace-nowrap", tier === "xs" ? "text-2xs" : "text-xs", CHECK_ROOM)}>
      {goal}
      <EventTitle className="min-w-0 truncate">{title}</EventTitle>
      {tier === "sm" && (
        <>
          <MetaSep className="hidden shrink-0 @[9rem]:inline" />
          <EventTime className="hidden shrink-0 @[9rem]:inline">{formatMinutes(block.startMin)}</EventTime>
        </>
      )}
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
  style: CSSProperties & { height: number };
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
  const height = resizeEnd != null ? blockHeight(Math.min(resizeEnd, dayEndMin) - Math.max(block.startMin, dayStartMin)) : style.height;
  const done = block.status === "done" || block.taskStatus === "done";
  const skipped = block.status === "skipped";
  const tier = tierFor(endMin - block.startMin);
  const title = block.title || block.taskTitle || "Untitled";

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
      data-done={done || undefined}
      data-skipped={skipped || undefined}
      className={cn(eventBlockVariants({ kind: block.kind, layout: "grid" }), "group absolute z-5 flex flex-col p-0", hidden && dragSource)}
      style={{ ...style, height, ...roleVar(role) }}
    >
      {/* The tooltip gives the full title and time, which short blocks clip or leave out. It opens to the
          right so it never covers the slot a drag would land in. */}
      <Tooltip>
        <TooltipTrigger
          delay={600}
          render={
            <div
              ref={handleRef}
              role="button"
              tabIndex={0}
              aria-label={`${title}, ${formatMinutes(block.startMin)}–${formatMinutes(endMin)}`}
              onClick={() => onOpen(block)}
              onKeyDown={(e) => e.key === "Enter" && onOpen(block)}
              className={cn(
                "@container flex min-h-0 flex-1 cursor-grab flex-col rounded-sm pr-1.5 pl-2.5 focus-ring-inset active:cursor-grabbing",
                TIER_PAD[tier],
              )}
            />
          }
        >
          <BlockBody block={block} endMin={endMin} tier={tier} height={height} />
        </TooltipTrigger>
        <TooltipContent side="right" className="tabular-nums">
          {title} · {formatMinutes(block.startMin)}–{formatMinutes(endMin)}
        </TooltipContent>
      </Tooltip>
      <div
        onPointerDown={startResize}
        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize opacity-0 transition-opacity duration-120 group-hover:opacity-100 after:absolute after:bottom-0.5 after:left-1/2 after:h-0.5 after:w-6 after:-translate-x-1/2 after:rounded-full after:bg-foreground/30 pointer-coarse:opacity-100"
        aria-hidden
      />
      <DoneCheck
        size="sm"
        done={done}
        color={role?.color}
        onPointerDown={(e) => e.stopPropagation()}
        onToggle={(e) => {
          e.stopPropagation();
          onToggleDone(block);
        }}
        aria-label={done ? "Mark as not done" : "Mark as done"}
        className={cn(
          "absolute right-1 opacity-0 transition-[opacity,background-color,border-color,scale] group-hover:opacity-100 focus-visible:opacity-100 data-[done]:opacity-100 pointer-coarse:opacity-100",
          tier === "xs" ? "top-0.5" : "top-1",
        )}
      />
    </div>
  );
}

export function DragPreview({
  data,
  rolesById,
  columnWidth,
}: {
  data: DragData | undefined;
  rolesById: Map<string, Role>;
  /** Width of the dragged block's day column, so the preview keeps the block's shape. */
  columnWidth?: number | null;
}): ReactNode {
  if (!data) return null;
  if (data.kind === "block") {
    const b = data.block;
    const role = b.effectiveRoleId ? rolesById.get(b.effectiveRoleId) : undefined;
    const minutes = b.endMin - b.startMin;
    const tier = tierFor(minutes);
    const height = blockHeight(minutes);
    return (
      <div
        data-done={b.status === "done" || b.taskStatus === "done" || undefined}
        data-skipped={b.status === "skipped" || undefined}
        className={cn(eventBlockVariants({ kind: b.kind, layout: "grid" }), "@container flex animate-dnd-lift flex-col", TIER_PAD[tier])}
        style={{ height, width: columnWidth ? columnWidth - 4 : 140, ...roleVar(role) }}
      >
        <BlockBody block={b} endMin={b.endMin} tier={tier} height={height} />
      </div>
    );
  }
  const t = data.task;
  const role = t.roleId ? rolesById.get(t.roleId) : undefined;
  return (
    <div className={cn(boardCard, "flex w-max max-w-60 animate-dnd-lift items-center gap-2 py-2")}>
      <RoleDot color={role?.color} />
      {t.kind === "goal" && <Mountain aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />}
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
