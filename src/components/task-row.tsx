import { CalendarClock, Mountain, Repeat } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { Task } from "@/lib/api";
import { formatDuration, relativeDay } from "@/lib/format";
import { useBootstrap, useRolesMap } from "@/lib/hooks";
import { useToggleDone } from "@/lib/mutations";
import { cn } from "@/lib/utils";
import { useAppState } from "./app-state";
import { QuadrantBadge, RoleDot } from "./badges";
import { DoneCheck } from "./done-check";
import { MetaSep, MetaSlot, Row, RowActions, RowMeta, RowTitle } from "./row";

/**
 * A deadline: `CalendarClock` plus "due …". A past one turns amber and reads "was due …" (never red,
 * never colour alone; the same words as Today and Insights); a planned day is never late, so it never
 * uses this. `short` drops the visible "due" (the icon carries it) for the
 * narrow right-hand column.
 */
export function DueDate({
  date,
  today,
  open = true,
  emphasis = false,
  short = false,
  className,
}: {
  date: string;
  today: string;
  /** Only an open item can be past due. */
  open?: boolean;
  /** The deadline is what makes it urgent: set it in ink. */
  emphasis?: boolean;
  short?: boolean;
  className?: string;
}) {
  const past = open && date < today;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", emphasis && "font-medium text-foreground", past && "text-warning", className)}>
      <CalendarClock aria-hidden className="size-3.5 shrink-0" />
      {short ? (
        <>
          <span className="sr-only">{past ? "was due " : "due "}</span>
          <span className="truncate">{relativeDay(date, today)}</span>
        </>
      ) : (
        `${past ? "was due" : "due"} ${relativeDay(date, today)}`
      )}
    </span>
  );
}

/**
 * `narrow`: the value also has its own right-hand column, which shows once the row (a size
 * container, `@container`) is at least 42rem wide; below that it joins the meta line instead.
 */
type MetaItem = { key: string; node: ReactNode; narrow?: boolean };

/**
 * A RowMeta line from the items that have a value, with `·` between them. Every item leads with
 * its own separator (4px box plus the 6px gap) and the line is pulled 10px left inside a clipping
 * RowMeta: the separator that starts each line, the first one or one a wrap carried down, is
 * clipped, so none ever dangles at a line's end or leads a line.
 */
export function MetaLine({ items, className }: { items: (MetaItem | false | null | undefined)[]; className?: string }) {
  const present = items.filter((i): i is MetaItem => !!i);
  // Always-visible items first, so the narrow ones that hide at @2xl leave no gap mid-line.
  const list = [...present.filter((i) => !i.narrow), ...present.filter((i) => i.narrow)];
  if (!list.length) return null;
  return (
    <RowMeta className={cn("overflow-hidden", list.every((i) => i.narrow) && "@2xl:hidden", className)}>
      <span className="-ml-2.5 flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5">
        {list.map((item) => (
          <span key={item.key} className={cn("inline-flex min-w-0 items-center gap-1.5", item.narrow && "@2xl:hidden")}>
            <MetaSep className="w-1 shrink-0 text-center" />
            <span className="inline-flex min-w-0 items-center gap-1">{item.node}</span>
          </span>
        ))}
      </span>
    </RowMeta>
  );
}

/** MetaSlot shows from `sm` (viewport); these columns follow the row's own width instead. */
const slotShown = "mt-px sm:hidden @2xl:block";

/**
 * The check's state shown at once, before the refetch lands, so the title strike runs with the
 * check. Local only (the cache is never touched): it gives way as soon as the real value changes,
 * and reverts after 4s if it never does (the same rules as DoneCheck).
 */
function useShownDone(done: boolean) {
  const [guess, setGuess] = useState<{ value: boolean; from: boolean } | null>(null);
  useEffect(() => {
    if (!guess) return;
    const t = setTimeout(() => setGuess(null), 4000);
    return () => clearTimeout(t);
  }, [guess]);
  const shown = guess && guess.from === done ? guess.value : done;
  return [shown, (value: boolean) => setGuess({ value, from: done })] as const;
}

/**
 * A task line on paper: check, title and meta, quadrant, then aligned day/due/estimate columns.
 * `showQuadrant` / `showRole` hide what a surrounding group heading already says.
 */
export function TaskRow({
  task,
  actions,
  showQuadrant = true,
  showRole = true,
  className,
}: {
  task: Task;
  actions?: ReactNode;
  showQuadrant?: boolean;
  showRole?: boolean;
  className?: string;
}) {
  const { today } = useBootstrap();
  const roles = useRolesMap();
  const role = task.roleId ? roles.get(task.roleId) : undefined;
  const toggle = useToggleDone();
  const { openTask } = useAppState();
  const done = task.status === "done";
  const closed = task.status === "dropped" || task.status === "missed";
  const [shownDone, setShownDone] = useShownDone(done);
  const planned = task.scheduledDate ? relativeDay(task.scheduledDate, today) : null;
  const estimate = task.estimateMinutes ? formatDuration(task.estimateMinutes) : null;
  const open = task.status === "open";

  const meta: (MetaItem | false)[] = [
    showRole && !!role && {
      key: "role",
      node: (
        <>
          <RoleDot color={role.color} className="mr-0.5" />
          {role.name}
        </>
      ),
    },
    task.carryCount > 0 && {
      key: "carry",
      node: (
        <>
          <Repeat aria-hidden />
          {task.carryCount}
          <span className="sr-only"> times carried</span>
        </>
      ),
    },
    closed && !!task.statusReason && { key: "reason", node: task.statusReason.replace(/_/g, " ") },
    // On a narrow row the column values join the meta line.
    !!planned && { key: "planned", node: `planned ${planned}`, narrow: true },
    !!task.dueDate && { key: "due", node: <DueDate date={task.dueDate} today={today} open={open} />, narrow: true },
    !!estimate && { key: "estimate", node: estimate, narrow: true },
  ];
  const hasMeta = meta.some((m) => m && !m.narrow);
  const hasNarrowMeta = meta.some((m) => m && m.narrow);

  return (
    <Row
      divided
      done={shownDone || closed}
      // The row is a size container: its right-hand columns appear when the row itself is wide
      // enough (a sidebar or a narrow page can leave a wide viewport with a narrow list).
      // Two-line rows align the check, badge and columns to the title line.
      className={cn("@container", hasMeta ? "items-start" : hasNarrowMeta && "@max-2xl:*:self-start", className)}
    >
      <DoneCheck
        done={done}
        onToggle={() => {
          setShownDone(!shownDone);
          toggle(task);
        }}
        color={role?.color}
        disabled={closed}
        aria-label={done ? "Mark as not done" : "Mark as done"}
      />
      <button type="button" onClick={() => openTask(task.id)} className="min-w-0 flex-1 rounded-xs text-left">
        <span className="flex min-w-0 items-center gap-1.5">
          {task.kind === "goal" && (
            <>
              <Mountain aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="sr-only">Big rock: </span>
            </>
          )}
          <RowTitle>{task.title}</RowTitle>
        </span>
        <MetaLine items={meta} />
      </button>
      {showQuadrant && <QuadrantBadge q={task.quadrant} size="xs" />}
      <MetaSlot slot="day" className={cn(slotShown, "w-20")}>
        {planned && (
          <>
            <span className="sr-only">planned </span>
            {planned}
          </>
        )}
      </MetaSlot>
      {/* Flex, not block: an inline-flex box would take its baseline from the icon and ride 2px high. */}
      <MetaSlot slot="due" className="mt-px w-24 sm:hidden @2xl:flex @2xl:justify-end">
        {task.dueDate && <DueDate date={task.dueDate} today={today} open={open} short className="max-w-full" />}
      </MetaSlot>
      <MetaSlot slot="estimate" className={cn(slotShown, "w-12")}>
        {estimate && (
          <>
            <span className="sr-only">estimate </span>
            {estimate}
          </>
        )}
      </MetaSlot>
      {actions && <RowActions className="-my-1">{actions}</RowActions>}
    </Row>
  );
}
