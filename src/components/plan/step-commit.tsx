import { useNavigate } from "@tanstack/react-router";
import { CalendarCheck, Check, CircleDashed, Info, Mountain, TriangleAlert } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { ChoiceChip } from "@/components/chip";
import { PrincipleNote, SectionHeader, StepHeader } from "@/components/page";
import { QuadrantDot, RoleDot } from "@/components/badges";
import { ActionBar, StepBody } from "@/components/plan/plan-chrome";
import { STEP_LABELS } from "@/components/plan/steps";
import { MetaSep } from "@/components/row";
import { StatCell, StatStrip } from "@/components/stat";
import { Callout } from "@/components/surface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, call, type WeekBoard, type WeekGoal } from "@/lib/api";
import { fmtDate, formatDuration, formatMinutes, hoursLabel, pct } from "@/lib/format";
import { useBootstrap } from "@/lib/hooks";
import { useApiMutation, useTaskActions } from "@/lib/mutations";
import { cn } from "@/lib/utils";

export function StepCommit({ board, onBack, backDisabled }: { board: WeekBoard; onBack: () => void; backDisabled: boolean }) {
  const navigate = useNavigate();
  const { weekStart } = useBootstrap();
  const start = board.week.startDate;
  const s = board.stats;
  const roles = board.roles.filter((r) => board.weekRoleIds.includes(r.id));
  const nonSaw = roles.filter((r) => !r.isSaw);
  const missingRoles = nonSaw.filter((r) => !s.rolesWithGoals.includes(r.id));
  const unscheduled = board.goals.filter((g) => g.status === "open" && g.blockCount === 0 && !g.scheduledDate);
  const overTarget = s.capacityRatio > board.settings.capacityTarget;

  const commit = useApiMutation(() => call(api.weeks[":start"].commit.$post({ param: { start } })), {
    // Success navigates away at once (unchanged), so the CTA has no "Committed" state to bloom into here.
    onSuccess: () => {
      toast.success("Week committed. A promise to yourself: keep it, or consciously choose something higher.");
      void navigate(start === weekStart ? { to: "/today" } : { to: "/week/$start", params: { start } });
    },
  });

  const whenFor = (g: WeekGoal) => {
    const blocks = board.blocks.filter((b) => b.taskId === g.id).sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
    if (blocks.length) return blocks.map((b) => `${fmtDate(b.date, "EEE")} ${formatMinutes(b.startMin)}`).join(", ");
    if (g.scheduledDate) return fmtDate(g.scheduledDate, "EEEE");
    return null;
  };

  return (
    <>
      <StepBody>
        <StepHeader
          title="Commit to the week"
          lede={
            <>
              This is your plan, made from your values. When something more important comes up (often a person), you can change it
              with a clear conscience. That is integrity too.
            </>
          }
        />

        <div className="space-y-10">
          <StatStrip cols={3}>
            <StatCell label="Rocks" value={String(board.goals.length)} hint={`${roles.length} roles this week`} />
            <StatCell
              label={
                <>
                  <QuadrantDot q={2} /> Quadrant II time
                </>
              }
              value={hoursLabel(s.q2Minutes)}
              hint={`${hoursLabel(s.plannedMinutes)} planned in total`}
            />
            <StatCell
              label="Planned share of waking hours"
              value={pct(s.capacityRatio)}
              hint={overTarget ? "Above your target: keep some white space" : "Plenty of room for the unexpected"}
              tone={overTarget ? "warning" : "default"}
            />
          </StatStrip>

          {(unscheduled.length > 0 || missingRoles.length > 0) && (
            // Warning only for unplaced rocks; a role without a rock is a choice, so on its own it stays neutral.
            <Callout tone={unscheduled.length > 0 ? "warning" : "neutral"} icon={unscheduled.length > 0 ? <TriangleAlert /> : <Info />}>
              {unscheduled.length > 0 && (
                <p>
                  {unscheduled.length} rock{unscheduled.length > 1 ? "s have" : " has"} no day or time yet:{" "}
                  <span className="font-medium">{unscheduled.map((g) => g.title).join(", ")}</span>. Quadrant II work that isn&apos;t
                  scheduled usually doesn&apos;t happen.
                </p>
              )}
              {missingRoles.length > 0 && (
                <p className={cn(unscheduled.length > 0 && "mt-1.5")}>
                  No rock for {missingRoles.map((r) => r.name).join(", ")}. That&apos;s fine if it&apos;s a conscious choice.
                </p>
              )}
            </Callout>
          )}

          <section>
            <SectionHeader as="h3" title="Your week at a glance" />
            <div className="grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2">
              {roles.map((r) => {
                const goals = board.goals.filter((g) => g.roleId === r.id);
                return (
                  <section key={r.id} className="min-w-0">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <RoleDot color={r.color} /> {r.name}
                    </h4>
                    {goals.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">No rock this week.</p>
                    ) : (
                      <dl className="mt-2.5 space-y-2.5">
                        {goals.map((g) => {
                          const when = whenFor(g);
                          return (
                            // Each group holds only its dt and dd; the icon lives in the dt, the meta indents under the title.
                            <div key={g.id}>
                              <dt className="flex items-start gap-2.5 text-sm text-foreground">
                                <Mountain aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                <span className="min-w-0">{g.title}</span>
                              </dt>
                              <dd className="mt-0.5 flex flex-wrap items-center gap-x-1.5 pl-6.5 text-xs text-muted-foreground tabular-nums">
                                {when ?? (
                                  <span className="inline-flex items-center gap-1">
                                    <CircleDashed aria-hidden className="size-3.5" /> Not placed yet
                                  </span>
                                )}
                                {g.blockMinutes ? (
                                  <>
                                    <MetaSep />
                                    {formatDuration(g.blockMinutes)}
                                  </>
                                ) : null}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    )}
                  </section>
                );
              })}
            </div>
          </section>

          <IfThenPlans goals={board.goals.filter((g) => g.status === "open")} />
        </div>
      </StepBody>

      <ActionBar
        onBack={onBack}
        backDisabled={backDisabled}
        persistentHint={board.week.status !== "draft"}
        hint={
          board.week.status !== "draft" ? (
            <span className="inline-flex items-center gap-1.5">
              <Check aria-hidden className="size-4 shrink-0" /> Already committed. Committing again just saves changes.
            </span>
          ) : (
            STEP_LABELS.commit.hint
          )
        }
      >
        <Button
          size="xl"
          onClick={() => commit.mutate(undefined)}
          disabled={commit.isPending}
          pending={commit.isPending}
        >
          <CalendarCheck /> Commit to this week
        </Button>
      </ActionBar>
    </>
  );
}

/** Implementation intentions help most when used sparingly: only for the one to three rocks that matter most. */
function IfThenPlans({ goals }: { goals: WeekGoal[] }) {
  const [picked, setPicked] = useState<string[]>(() => goals.filter((g) => g.ifThen).map((g) => g.id).slice(0, 3));
  if (goals.length === 0) return null;
  return (
    <section>
      <SectionHeader
        as="h3"
        title={
          <>
            If–then plans for your top rocks <span className="font-normal text-muted-foreground">(optional)</span>
          </>
        }
      />
      <PrincipleNote>
        Pick up to three rocks that matter most and decide in advance what you&apos;ll do when the obvious obstacle shows up. For
        example: &ldquo;If the morning meeting runs over, then I run at 18:00 instead.&rdquo;
      </PrincipleNote>
      <div role="group" aria-label="Rocks with an if–then plan" className="mt-5 flex flex-wrap gap-2">
        {goals.map((g) => {
          const on = picked.includes(g.id);
          return (
            <ChoiceChip
              key={g.id}
              pressed={on}
              disabled={!on && picked.length >= 3}
              onClick={() => setPicked(on ? picked.filter((x) => x !== g.id) : [...picked, g.id])}
              className="max-w-full"
            >
              <span className="min-w-0 truncate">{g.title}</span>
            </ChoiceChip>
          );
        })}
      </div>
      {picked.length > 0 && (
        <div className="mt-5 grid gap-4">
          {goals
            .filter((g) => picked.includes(g.id))
            .map((g) => (
              <IfThenRow key={g.id} goal={g} />
            ))}
        </div>
      )}
    </section>
  );
}

function IfThenRow({ goal }: { goal: WeekGoal }) {
  const { update } = useTaskActions();
  const id = useId();
  const [text, setText] = useState(goal.ifThen);
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-center sm:gap-4">
      <Label htmlFor={id} className="min-w-0">
        <span className="line-clamp-2">{goal.title}</span>
      </Label>
      <Input
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== goal.ifThen && update.mutate({ id: goal.id, ifThen: text })}
        placeholder="If …, then I will …"
      />
    </div>
  );
}
