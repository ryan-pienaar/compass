import { Link } from "@tanstack/react-router";
import { CalendarClock, CircleX, HeartHandshake, Hourglass, ListChecks, Mountain, MoreHorizontal, Sun, Sunrise } from "lucide-react";
import { addDaysISO } from "@shared/dates.ts";
import { useAppState } from "@/components/app-state";
import { QuadrantBadge, RoleDot } from "@/components/badges";
import { IconButton } from "@/components/icon-button";
import { SectionHeader } from "@/components/page";
import { Row, RowActions, RowMeta, RowTitle } from "@/components/row";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Delegation, Task } from "@/lib/api";
import { relativeDay } from "@/lib/format";
import { useRolesMap } from "@/lib/hooks";
import { useTaskActions } from "@/lib/mutations";
import { cn } from "@/lib/utils";

/** The day word beside a row title: a plan, so always plain meta, never late. */
function DayMeta({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("shrink-0 text-xs text-muted-foreground tabular-nums", className)}>{children}</span>;
}

/** A two-line row body that opens the task: the title, then its meta (quadrant first). */
function TitleButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="min-w-0 flex-1 rounded-xs text-left focus-ring-inset">
      <RowTitle>{title}</RowTitle>
      <RowMeta as="span" className="flex-nowrap gap-x-2">{children}</RowMeta>
    </button>
  );
}

/** This week's big rocks that aren't on today's list: the natural source of today's priorities. */
export function RocksPanel({ rocks, date }: { rocks: Task[]; date: string }) {
  const roles = useRolesMap();
  const { update } = useTaskActions();
  const { openTask } = useAppState();
  const open = rocks.filter((r) => r.status === "open" && r.scheduledDate !== date);
  const done = rocks.filter((r) => r.status === "done").length;
  if (rocks.length === 0) return null;
  return (
    <section>
      <SectionHeader title="This week's big rocks" icon={<Mountain />} count={`${done} of ${rocks.length} done`} />
      {open.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Every open rock is on today&apos;s list or done.</p>
      ) : (
        <ul className="-mx-3">
          {open.map((r) => {
            const role = r.roleId ? roles.get(r.roleId) : undefined;
            return (
              <Row as="li" key={r.id} divided className="before:left-8">
                <RoleDot color={role?.color} />
                <RowTitle as="button" onClick={() => openTask(r.id)}>
                  {r.title}
                </RowTitle>
                {r.scheduledDate && <DayMeta>{relativeDay(r.scheduledDate, date)}</DayMeta>}
                {/* Revealed per row (always on touch), so the day word stands alone as the row's one date. */}
                <RowActions className="-mr-1.5">
                  <Button variant="ghost" size="xs" onClick={() => update.mutate({ id: r.id, scheduledDate: date, priority: "A" })}>
                    <Sun /> Today
                  </Button>
                </RowActions>
              </Row>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Planned for an earlier day, still open. Not "overdue" (a plan isn't a deadline); just decide. */
export function UnfinishedPanel({ tasks, date }: { tasks: Task[]; date: string }) {
  const { update } = useTaskActions();
  const { openTask } = useAppState();
  if (tasks.length === 0) return null;
  return (
    <section>
      <SectionHeader
        title="Waiting for a decision"
        icon={<Hourglass />}
        description="Planned for an earlier day and still open. Choose, don't drift."
      />
      <ul className="-mx-3">
        {tasks.slice(0, 8).map((t) => (
          <Row as="li" key={t.id} divided className="before:left-3">
            <TitleButton onClick={() => openTask(t.id)} title={t.title}>
              <QuadrantBadge q={t.quadrant} size="xs" />
              <span>{relativeDay(t.scheduledDate, date)}</span>
            </TitleButton>
            <div className="-mr-1.5 flex shrink-0 items-center gap-0.5 pointer-coarse:gap-4">
              <Button variant="ghost" size="xs" onClick={() => update.mutate({ id: t.id, scheduledDate: date })}>
                <Sun /> Today
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<IconButton size="icon-xs" label="More choices" icon={<MoreHorizontal />} />} />
                <DropdownMenuContent align="end" className="w-auto">
                  <DropdownMenuItem onClick={() => update.mutate({ id: t.id, scheduledDate: addDaysISO(date, 1) })}>
                    <Sunrise /> Tomorrow
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => update.mutate({ id: t.id, scheduledDate: null })}>
                    <ListChecks /> Later
                    <span className="ml-auto pl-4 text-xs text-muted-foreground">Back to your list for weekly planning</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => update.mutate({ id: t.id, status: "dropped", statusReason: "declined" })}>
                    <CircleX /> Let it go
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Row>
        ))}
      </ul>
      {tasks.length > 8 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {tasks.length - 8} older {tasks.length - 8 === 1 ? "one waits" : "ones wait"} below these. Decide these first, or see them all in{" "}
          <Button variant="link" size="inline" className="text-xs" render={<Link to="/tasks" />}>
            Tasks
          </Button>
          .
        </p>
      )}
    </section>
  );
}

export function DueSoonPanel({ tasks, date }: { tasks: Task[]; date: string }) {
  const { openTask } = useAppState();
  const { update } = useTaskActions();
  if (tasks.length === 0) return null;
  return (
    <section>
      <SectionHeader title="Deadlines coming up" icon={<CalendarClock />} />
      <ul className="-mx-3">
        {tasks.map((t) => {
          const late = !!t.dueDate && t.dueDate < date;
          return (
            <Row as="li" key={t.id} divided className="before:left-3">
              <TitleButton onClick={() => openTask(t.id)} title={t.title}>
                <QuadrantBadge q={t.quadrant} size="xs" />
                <span className={cn("flex items-center gap-1 whitespace-nowrap", late && "font-medium text-warning")}>
                  <CalendarClock />
                  {late ? "was due " : "due "}
                  {relativeDay(t.dueDate, date)}
                </span>
              </TitleButton>
              {/* Like Big rocks: shown on hover, focus and touch, so a column of "Today"s never reads as a date beside "was due". */}
              <RowActions className="-mr-1.5">
                <Button variant="ghost" size="xs" onClick={() => update.mutate({ id: t.id, scheduledDate: date })}>
                  <Sun /> Today
                </Button>
              </RowActions>
            </Row>
          );
        })}
      </ul>
    </section>
  );
}

export function CheckinsPanel({ checkins }: { checkins: Omit<Delegation, "checkins">[] }) {
  if (checkins.length === 0) return null;
  return (
    <section>
      <SectionHeader title="Stewardship check-ins due" icon={<HeartHandshake />} />
      <ul className="-mx-3">
        {checkins.map((d) => (
          <Row
            as="li"
            key={d.id}
            divided
            // Nothing to act on: no plate, and the hairlines stay put on hover.
            className="before:left-3 hover:bg-transparent hover:before:opacity-100 [&:hover+*]:before:opacity-100"
          >
            <RowTitle>
              {d.title} <span className="text-muted-foreground">· {d.delegate || "someone"}</span>
            </RowTitle>
          </Row>
        ))}
      </ul>
      <Button variant="link" size="inline" className="mt-2" render={<Link to="/stewardships" />}>
        Open stewardships
      </Button>
    </section>
  );
}
