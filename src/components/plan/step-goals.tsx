import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Mountain, Plus, Repeat, Target, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { addWeeksISO } from "@shared/dates.ts";
import { SAW_DIMENSIONS, type SawDimension } from "@shared/content.ts";
import { useAppState } from "@/components/app-state";
import { PrincipleNote } from "@/components/page";
import { RoleDot } from "@/components/badges";
import { EstimateSelect } from "@/components/pickers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, call, type Goal, type Role, type Task, type WeekBoard, type WeekGoal } from "@/lib/api";
import { useApiMutation, useTaskActions } from "@/lib/mutations";
import { goalsQuery, tasksQuery, weekQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function StepGoals({ board }: { board: WeekBoard }) {
  const start = board.week.startDate;
  const { data: prev } = useQuery(weekQuery(addWeeksISO(start, -1)));
  const { data: longTerm = [] } = useQuery(goalsQuery());
  const { data: backlog = [] } = useQuery(tasksQuery({ view: "backlog" }));
  const setRoles = useApiMutation((roleIds: string[]) => call(api.weeks[":start"].roles.$put({ param: { start }, json: { roleIds } })));

  const roles = board.roles.filter((r) => board.weekRoleIds.includes(r.id));
  const total = board.goals.length;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="compass-display text-3xl">Select your big rocks</h2>
        <p className="text-muted-foreground">
          For each role, one or two important results you want by the end of the week. Make them results, not activities, and
          let at least some be Quadrant II: important but not urgent. Tie them to your long-term goals where you can.
        </p>
      </div>
      {total > 10 && (
        <PrincipleNote icon={<Mountain className="size-4" />}>
          {total} rocks is a full jar. Big rocks are few by definition; leave room for people and the unexpected.
        </PrincipleNote>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {roles.map((role) =>
          role.isSaw ? (
            <SawCard key={role.id} role={role} start={start} goals={board.goals.filter((g) => g.roleId === role.id)} />
          ) : (
            <RoleCard
              key={role.id}
              role={role}
              start={start}
              goals={board.goals.filter((g) => g.roleId === role.id)}
              lastWeek={(prev?.goals ?? []).filter((g) => g.roleId === role.id)}
              longTerm={longTerm.filter((g) => g.roleId === role.id && g.status === "active")}
              backlog={backlog.filter((t) => t.roleId === role.id && t.quadrant === 2)}
              onSkip={() => setRoles.mutate(board.weekRoleIds.filter((id) => id !== role.id))}
            />
          ),
        )}
      </div>
    </div>
  );
}

function RoleCard({
  role,
  start,
  goals,
  lastWeek,
  longTerm,
  backlog,
  onSkip,
}: {
  role: Role;
  start: string;
  goals: WeekGoal[];
  lastWeek: WeekGoal[];
  longTerm: Goal[];
  backlog: Task[];
  onSkip: () => void;
}) {
  const { create, update } = useTaskActions();
  const titles = new Set(goals.map((g) => g.title.toLowerCase()));
  const repeatable = lastWeek.filter((g) => !titles.has(g.title.toLowerCase()) && !goals.some((x) => x.carriedFromId === g.id));
  const linked = new Set(goals.map((g) => g.goalId));
  const suggestions = [
    ...longTerm
      .filter((g) => !linked.has(g.id))
      .map((g) => ({ key: `lt-${g.id}`, icon: <Target className="size-3" />, label: g.title, add: () => create.mutate({ title: g.title, kind: "goal", roleId: role.id, goalId: g.id, weekStart: start }) })),
    ...repeatable.map((g) => ({
      key: `rp-${g.id}`,
      icon: <Repeat className="size-3" />,
      label: g.title,
      add: () =>
        create.mutate({ title: g.title, kind: "goal", roleId: role.id, goalId: g.goalId, estimateMinutes: g.estimateMinutes, weekStart: start }),
    })),
    ...backlog.slice(0, 4).map((t) => ({
      key: `bl-${t.id}`,
      icon: <ArrowUpRight className="size-3" />,
      label: t.title,
      add: () => update.mutate({ id: t.id, kind: "goal", weekStart: start }),
    })),
  ];

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <header>
        <div className="flex items-center gap-2 font-semibold">
          <RoleDot color={role.color} className="size-2.5" />
          {role.name}
          <span className="ml-auto text-xs font-normal text-muted-foreground">{goals.length === 0 ? "no rock yet" : `${goals.length} rock${goals.length > 1 ? "s" : ""}`}</span>
        </div>
        {role.description && <p className="compass-text mt-0.5 !text-sm text-muted-foreground italic">{role.description}</p>}
      </header>
      <ul className="space-y-1.5">
        {goals.map((g) => (
          <GoalRow key={g.id} goal={g} />
        ))}
      </ul>
      <QuickAdd
        placeholder={`Most important result as ${role.name.toLowerCase()} this week…`}
        onAdd={(title) => create.mutate({ title, kind: "goal", roleId: role.id, weekStart: start })}
      />
      {goals.length > 3 && <p className="text-xs text-warning">Fewer, bigger rocks: could any of these wait or be combined?</p>}
      {suggestions.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Suggestions</div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 6).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={s.add}
                className="inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-muted"
                title={s.key.startsWith("lt") ? "Toward a long-term goal" : s.key.startsWith("rp") ? "Repeat from last week" : "Promote a Quadrant II task"}
              >
                {s.icon}
                <span className="truncate">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {goals.length === 0 && (
        <button type="button" onClick={onSkip} className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline">
          No rock for this role this week (that&apos;s allowed)
        </button>
      )}
    </section>
  );
}

function SawCard({ role, start, goals }: { role: Role; start: string; goals: WeekGoal[] }) {
  const { create } = useTaskActions();
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-dashed bg-card p-4 lg:col-span-2">
      <header>
        <div className="flex items-center gap-2 font-semibold">
          <RoleDot color={role.color} className="size-2.5" /> Sharpen the Saw
        </div>
        <p className="text-sm text-muted-foreground">
          Renewal is Quadrant II by definition: nobody will make you do it. One small goal in each dimension keeps the rest of the
          week possible.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {SAW_DIMENSIONS.map((d) => {
          const mine = goals.filter((g) => g.sawDimension === d.key);
          return (
            <div key={d.key} className="rounded-xl bg-muted/40 p-3">
              <div className="text-sm font-medium">{d.label}</div>
              <div className="mb-2 text-xs text-muted-foreground">{d.prompt}</div>
              <ul className="mb-1 space-y-1.5">
                {mine.map((g) => (
                  <GoalRow key={g.id} goal={g} />
                ))}
              </ul>
              <QuickAdd
                placeholder={`e.g. ${d.examples[0]}`}
                onAdd={(title) => create.mutate({ title, kind: "goal", roleId: role.id, sawDimension: d.key as SawDimension, weekStart: start })}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function GoalRow({ goal }: { goal: WeekGoal }) {
  const { update, remove } = useTaskActions();
  const { openTask } = useAppState();
  const [title, setTitle] = useState(goal.title);
  useEffect(() => setTitle(goal.title), [goal.title]);
  return (
    <li className={cn("group flex items-center gap-2 rounded-lg border bg-background px-2 py-1", goal.status === "done" && "opacity-60")}>
      <Mountain className="size-3.5 shrink-0 text-primary" />
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title.trim() && title !== goal.title && update.mutate({ id: goal.id, title: title.trim() })}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="h-7 flex-1 border-none bg-transparent px-1 shadow-none focus-visible:ring-1 dark:bg-transparent"
        aria-label="Rock title"
      />
      {goal.carryCount > 0 && (
        <span className="inline-flex items-center gap-0.5 text-[11px] text-warning" title={`Carried ${goal.carryCount}×`}>
          <Repeat className="size-3" />
          {goal.carryCount}
        </span>
      )}
      <EstimateSelect value={goal.estimateMinutes} onChange={(estimateMinutes) => update.mutate({ id: goal.id, estimateMinutes })} size="sm" className="h-7 min-w-24 text-xs" />
      <Button variant="ghost" size="icon-xs" onClick={() => openTask(goal.id)} aria-label="Details" title="Details">
        <ArrowUpRight />
      </Button>
      <Button variant="ghost" size="icon-xs" onClick={() => remove.mutate(goal.id)} aria-label="Remove rock" title="Remove">
        <Trash2 />
      </Button>
    </li>
  );
}

function QuickAdd({ placeholder, onAdd }: { placeholder: string; onAdd: (title: string) => void }) {
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
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="h-8 text-sm" />
      <Button type="submit" size="sm" variant="outline" disabled={!value.trim()} aria-label="Add rock">
        <Plus />
      </Button>
    </form>
  );
}
