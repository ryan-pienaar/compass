import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CircleCheck, Mountain, Repeat, Target, Trash2, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { addWeeksISO } from "@shared/dates.ts";
import { SAW_DIMENSIONS, type SawDimension } from "@shared/content.ts";
import { useAppState } from "@/components/app-state";
import { AddChip, Chip } from "@/components/chip";
import { IconButton } from "@/components/icon-button";
import { PrincipleNote, StepHeader } from "@/components/page";
import { RoleDot } from "@/components/badges";
import { EstimateSelect } from "@/components/pickers";
import { QuickAdd } from "@/components/quick-add";
import { Row, RowActions } from "@/components/row";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api, call, type Goal, type Role, type Task, type WeekBoard, type WeekGoal } from "@/lib/api";
import { useApiMutation, useTaskActions } from "@/lib/mutations";
import { goalsQuery, tasksQuery, weekQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** Where a suggestion comes from: shown as a trailing icon, named in the chip's accessible name and tooltip. */
const SUGGESTION_SOURCE = {
  lt: { icon: Target, text: "Toward a long-term goal" },
  rp: { icon: Repeat, text: "Repeat from last week" },
  bl: { icon: ArrowUpRight, text: "Promote a Quadrant II task" },
} as const;

export function StepGoals({ board }: { board: WeekBoard }) {
  const start = board.week.startDate;
  const { data: prev } = useQuery(weekQuery(addWeeksISO(start, -1)));
  const { data: longTerm = [] } = useQuery(goalsQuery());
  const { data: backlog = [] } = useQuery(tasksQuery({ view: "backlog" }));
  const setRoles = useApiMutation((roleIds: string[]) => call(api.weeks[":start"].roles.$put({ param: { start }, json: { roleIds } })));

  const roles = board.roles.filter((r) => board.weekRoleIds.includes(r.id));
  const total = board.goals.length;

  return (
    <div>
      <StepHeader
        title="Select your big rocks"
        lede={
          <>
            For each role, one or two important results you want by the end of the week. Make them results, not activities, and
            let at least some be Quadrant II: important but not urgent. Tie them to your long-term goals where you can.
          </>
        }
      />
      {total > 10 && (
        <PrincipleNote icon={<Mountain />} className="-mt-2 mb-8">
          {total} rocks is a full jar. Big rocks are few by definition; leave room for people and the unexpected.
        </PrincipleNote>
      )}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
      .map((g) => ({ key: `lt-${g.id}`, source: "lt" as const, label: g.title, add: () => create.mutate({ title: g.title, kind: "goal", roleId: role.id, goalId: g.id, weekStart: start }) })),
    ...repeatable.map((g) => ({
      key: `rp-${g.id}`,
      source: "rp" as const,
      label: g.title,
      add: () =>
        create.mutate({ title: g.title, kind: "goal", roleId: role.id, goalId: g.goalId, estimateMinutes: g.estimateMinutes, weekStart: start }),
    })),
    ...backlog.slice(0, 4).map((t) => ({
      key: `bl-${t.id}`,
      source: "bl" as const,
      label: t.title,
      add: () => update.mutate({ id: t.id, kind: "goal", weekStart: start }),
    })),
  ];

  return (
    <Card render={<section />} className="min-w-0">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle as="h3" className="flex items-center gap-2">
            <RoleDot color={role.color} className="size-2.5" />
            <span className="min-w-0">{role.name}</span>
          </CardTitle>
          {role.description && <p className="mt-1 voice-sm text-muted-foreground italic">{role.description}</p>}
        </div>
        <CardAction className="pt-0.5 text-xs text-muted-foreground tabular-nums">
          {goals.length === 0 ? "no rock yet" : `${goals.length} rock${goals.length > 1 ? "s" : ""}`}
        </CardAction>
      </CardHeader>
      <div>
        {goals.length > 0 && (
          <ul className="-mx-3">
            {goals.map((g) => (
              <GoalRow key={g.id} goal={g} />
            ))}
          </ul>
        )}
        <RockAdd
          placeholder={`Most important result as ${role.name.toLowerCase()} this week…`}
          label={`Add a rock for ${role.name}`}
          onAdd={(title) => create.mutate({ title, kind: "goal", roleId: role.id, weekStart: start })}
        />
      </div>
      {goals.length > 3 && (
        <p className="flex items-start gap-1.5 text-xs text-warning">
          <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          Fewer, bigger rocks: could any of these wait or be combined?
        </p>
      )}
      {suggestions.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Suggestions</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 6).map((s) => {
              const { icon: SourceIcon, text } = SUGGESTION_SOURCE[s.source];
              return (
                <Tooltip key={s.key}>
                  <TooltipTrigger render={<AddChip onClick={s.add} className="max-w-full" />}>
                    <span className="min-w-0 truncate">{s.label}</span>
                    <span className="sr-only">, {text.toLowerCase()}</span>
                    <SourceIcon aria-hidden className="shrink-0 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>{text}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}
      {goals.length === 0 && (
        <Button variant="ghost" size="xs" onClick={onSkip} className="-ml-2.5 self-start">
          No rock for this role this week (that&apos;s allowed)
        </Button>
      )}
    </Card>
  );
}

function SawCard({ role, start, goals }: { role: Role; start: string; goals: WeekGoal[] }) {
  const { create } = useTaskActions();
  return (
    <Card render={<section />} className="min-w-0 xl:col-span-2">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle as="h3" className="flex items-center gap-2">
            <RoleDot color={role.color} className="size-2.5" /> Sharpen the saw
          </CardTitle>
          <p className="mt-1 max-w-[65ch] text-sm text-muted-foreground">
            Renewal is Quadrant II by definition: nobody will make you do it. One small goal in each dimension keeps the rest of the
            week possible.
          </p>
        </div>
        <CardAction>
          <Chip>Always on</Chip>
        </CardAction>
      </CardHeader>
      <div className="-mx-5 -mb-5 grid grid-cols-1 gap-px overflow-hidden rounded-b-xl border-t border-border-subtle bg-border-subtle max-sm:-mx-4 max-sm:-mb-4 sm:grid-cols-2">
        {SAW_DIMENSIONS.map((d) => {
          const mine = goals.filter((g) => g.sawDimension === d.key);
          return (
            <div key={d.key} className="min-w-0 bg-card px-5 pt-4 pb-3 max-sm:px-4">
              <h4 className="text-sm font-medium text-foreground">{d.label}</h4>
              <p className="text-xs text-muted-foreground">{d.prompt}</p>
              <div className="mt-2">
                {mine.length > 0 && (
                  <ul className="-mx-3">
                    {mine.map((g) => (
                      <GoalRow key={g.id} goal={g} />
                    ))}
                  </ul>
                )}
                <RockAdd
                  placeholder={`e.g. ${d.examples[0]}`}
                  label={`Add a rock for ${d.label}`}
                  onAdd={(title) => create.mutate({ title, kind: "goal", roleId: role.id, sawDimension: d.key as SawDimension, weekStart: start })}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function GoalRow({ goal }: { goal: WeekGoal }) {
  const { update, remove } = useTaskActions();
  const { openTask } = useAppState();
  const [title, setTitle] = useState(goal.title);
  useEffect(() => setTitle(goal.title), [goal.title]);
  const done = goal.status === "done";
  return (
    // Phones: always two lines, the title across the card and its meta and actions under it, with a
    // hairline from the text column between rocks so each pair reads as one. From sm: one line,
    // wrapping only when the card gets narrow.
    <Row
      as="li"
      done={done}
      className="flex-wrap gap-x-2.5 gap-y-0.5 py-1.5 max-sm:gap-y-0 max-sm:before:pointer-events-none max-sm:before:absolute max-sm:before:top-0 max-sm:before:right-3 max-sm:before:left-9.5 max-sm:before:h-px max-sm:before:bg-border-subtle max-sm:first:before:hidden"
    >
      <div className="flex min-w-0 flex-1 basis-full items-center gap-2.5 sm:min-w-44 sm:basis-44">
        {done ? (
          <CircleCheck aria-label="Done" className="size-4 shrink-0 text-success" />
        ) : (
          <Mountain aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        )}
        <Input
          variant="ghost"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== goal.title && update.mutate({ id: goal.id, title: title.trim() })}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="h-8 min-w-0 flex-1 truncate group-data-[done]/row:text-muted-foreground"
          aria-label="Rock title"
        />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1 max-sm:w-full max-sm:pl-6.5">
        {goal.carryCount > 0 && <CarryChip count={goal.carryCount} />}
        <EstimateSelect
          value={goal.estimateMinutes}
          onChange={(estimateMinutes) => update.mutate({ id: goal.id, estimateMinutes })}
          size="sm"
          variant="ghost"
          // First on its line on phones: pull the ghost padding back so its text sits under the title.
          className={cn("min-w-0 text-muted-foreground", goal.carryCount === 0 && "max-sm:-ml-2.5")}
        />
        <RowActions className="max-sm:ml-auto">
          <IconButton size="icon-xs" label="Details" icon={<ArrowUpRight />} onClick={() => openTask(goal.id)} />
          <IconButton size="icon-xs" label="Remove rock" icon={<Trash2 />} onClick={() => remove.mutate(goal.id)} />
        </RowActions>
      </div>
    </Row>
  );
}

/** Carried from an earlier week: neutral, never amber. */
function CarryChip({ count }: { count: number }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Chip size="sm" icon={<Repeat aria-hidden />} className="tabular-nums" />}>
        <span aria-hidden>{count}</span>
        <span className="sr-only">Carried {count}×</span>
      </TooltipTrigger>
      <TooltipContent>Carried {count}×</TooltipContent>
    </Tooltip>
  );
}

function RockAdd({ placeholder, label, onAdd }: { placeholder: string; label: string; onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <QuickAdd
      variant="inline"
      className="-mx-2"
      value={value}
      onValueChange={setValue}
      placeholder={placeholder}
      aria-label={label}
      submitLabel="Add rock"
      onSubmit={() => {
        if (!value.trim()) return;
        onAdd(value.trim());
        setValue("");
      }}
    />
  );
}
