import { Link } from "@tanstack/react-router";
import { Ban, CalendarClock, HeartHandshake, Mountain, Sun } from "lucide-react";
import { addDaysISO } from "@shared/dates.ts";
import { useAppState } from "@/components/app-state";
import { QuadrantBadge, RoleDot } from "@/components/badges";
import { Button } from "@/components/ui/button";
import type { Delegation, Task } from "@/lib/api";
import { relativeDay } from "@/lib/format";
import { useRolesMap } from "@/lib/hooks";
import { useTaskActions } from "@/lib/mutations";
import { cn } from "@/lib/utils";

function Panel({ title, icon, children, className }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card p-3", className)}>
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase [&_svg]:size-3.5">
        {icon}
        {title}
      </h3>
      {children}
    </section>
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
    <Panel title={`This week's big rocks · ${done}/${rocks.length}`} icon={<Mountain />}>
      {open.length === 0 ? (
        <p className="text-sm text-muted-foreground">Every open rock is on today&apos;s list or done.</p>
      ) : (
        <ul className="space-y-1">
          {open.map((r) => {
            const role = r.roleId ? roles.get(r.roleId) : undefined;
            return (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <RoleDot color={role?.color} />
                <button type="button" onClick={() => openTask(r.id)} className="min-w-0 flex-1 truncate text-left hover:underline">
                  {r.title}
                </button>
                {r.scheduledDate && <span className="text-[11px] text-muted-foreground">{relativeDay(r.scheduledDate, date)}</span>}
                <Button variant="ghost" size="xs" onClick={() => update.mutate({ id: r.id, scheduledDate: date, priority: "A" })}>
                  <Sun /> Today
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/** Planned for an earlier day, still open. Not "overdue" (a plan isn't a deadline); just decide. */
export function UnfinishedPanel({ tasks, date }: { tasks: Task[]; date: string }) {
  const { update } = useTaskActions();
  const { openTask } = useAppState();
  if (tasks.length === 0) return null;
  return (
    <Panel title="Waiting for a decision" icon={<CalendarClock />}>
      <p className="mb-2 text-xs text-muted-foreground">Planned for an earlier day and still open. Choose, don&apos;t drift.</p>
      <ul className="space-y-1.5">
        {tasks.slice(0, 8).map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <QuadrantBadge q={t.quadrant} size="xs" />
            <button type="button" onClick={() => openTask(t.id)} className="min-w-0 flex-1 truncate text-left hover:underline">
              {t.title}
            </button>
            <span className="text-[11px] text-muted-foreground">{relativeDay(t.scheduledDate, date)}</span>
            <div className="flex gap-0.5">
              <Button variant="ghost" size="xs" onClick={() => update.mutate({ id: t.id, scheduledDate: date })}>
                Today
              </Button>
              <Button variant="ghost" size="xs" onClick={() => update.mutate({ id: t.id, scheduledDate: addDaysISO(date, 1) })}>
                Tomorrow
              </Button>
              <Button variant="ghost" size="xs" title="Back to your list for weekly planning" onClick={() => update.mutate({ id: t.id, scheduledDate: null })}>
                Later
              </Button>
              <Button variant="ghost" size="icon-xs" aria-label="Let it go" title="Let it go" onClick={() => update.mutate({ id: t.id, status: "dropped", statusReason: "declined" })}>
                <Ban />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {tasks.length > 8 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {tasks.length - 8} older {tasks.length - 8 === 1 ? "one waits" : "ones wait"} below these. Decide these first, or see them all in{" "}
          <Link to="/tasks" className="underline">
            Tasks
          </Link>
          .
        </p>
      )}
    </Panel>
  );
}

export function DueSoonPanel({ tasks, date }: { tasks: Task[]; date: string }) {
  const { openTask } = useAppState();
  const { update } = useTaskActions();
  if (tasks.length === 0) return null;
  return (
    <Panel title="Deadlines coming up" icon={<CalendarClock />}>
      <ul className="space-y-1">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-2 text-sm">
            <QuadrantBadge q={t.quadrant} size="xs" />
            <button type="button" onClick={() => openTask(t.id)} className="min-w-0 flex-1 truncate text-left hover:underline">
              {t.title}
            </button>
            <span className={cn("text-[11px]", t.dueDate && t.dueDate < date ? "font-medium text-destructive" : "text-muted-foreground")}>
              {t.dueDate && t.dueDate < date ? "was due " : "due "}
              {relativeDay(t.dueDate, date)}
            </span>
            <Button variant="ghost" size="xs" onClick={() => update.mutate({ id: t.id, scheduledDate: date })}>
              Today
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function CheckinsPanel({ checkins }: { checkins: Omit<Delegation, "checkins">[] }) {
  if (checkins.length === 0) return null;
  return (
    <Panel title="Stewardship check-ins due" icon={<HeartHandshake />}>
      <ul className="space-y-1 text-sm">
        {checkins.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-2">
            <span className="truncate">
              {d.title} <span className="text-muted-foreground">· {d.delegate || "someone"}</span>
            </span>
          </li>
        ))}
      </ul>
      <Button variant="link" size="xs" className="mt-1 h-auto p-0" render={<Link to="/stewardships" />}>
        Open stewardships
      </Button>
    </Panel>
  );
}
