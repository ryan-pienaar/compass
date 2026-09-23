import { useNavigate } from "@tanstack/react-router";
import { CalendarCheck, Check, Mountain, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PrincipleNote } from "@/components/page";
import { RoleDot } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, call, type WeekBoard, type WeekGoal } from "@/lib/api";
import { fmtDate, formatDuration, formatMinutes, hoursLabel, pct } from "@/lib/format";
import { useBootstrap } from "@/lib/hooks";
import { useApiMutation, useTaskActions } from "@/lib/mutations";
import { cn } from "@/lib/utils";

export function StepCommit({ board }: { board: WeekBoard }) {
  const navigate = useNavigate();
  const { weekStart } = useBootstrap();
  const start = board.week.startDate;
  const s = board.stats;
  const roles = board.roles.filter((r) => board.weekRoleIds.includes(r.id));
  const nonSaw = roles.filter((r) => !r.isSaw);
  const missingRoles = nonSaw.filter((r) => !s.rolesWithGoals.includes(r.id));
  const unscheduled = board.goals.filter((g) => g.status === "open" && g.blockCount === 0 && !g.scheduledDate);

  const commit = useApiMutation(() => call(api.weeks[":start"].commit.$post({ param: { start } })), {
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
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="compass-display text-3xl">Commit to the week</h2>
        <p className="text-muted-foreground">
          This is your plan, made from your values. When something more important comes up (often a person), you can change it
          with a clear conscience. That is integrity too.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Rocks" value={String(board.goals.length)} hint={`${roles.length} roles this week`} />
        <Summary label="Quadrant II time" value={hoursLabel(s.q2Minutes)} hint={`${hoursLabel(s.plannedMinutes)} planned in total`} />
        <Summary
          label="Planned share of waking hours"
          value={pct(s.capacityRatio)}
          hint={s.capacityRatio > board.settings.capacityTarget ? "Above your target: keep some white space" : "Plenty of room for the unexpected"}
          warn={s.capacityRatio > board.settings.capacityTarget}
        />
      </div>

      {(unscheduled.length > 0 || missingRoles.length > 0) && (
        <div className="space-y-2 rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm">
          {unscheduled.length > 0 && (
            <p className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
              <span>
                {unscheduled.length} rock{unscheduled.length > 1 ? "s have" : " has"} no day or time yet:{" "}
                <span className="font-medium">{unscheduled.map((g) => g.title).join(", ")}</span>. Quadrant II work that isn&apos;t
                scheduled usually doesn&apos;t happen.
              </span>
            </p>
          )}
          {missingRoles.length > 0 && (
            <p className="flex items-start gap-2 text-muted-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              No rock for {missingRoles.map((r) => r.name).join(", ")}. That&apos;s fine if it&apos;s a conscious choice.
            </p>
          )}
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Your week at a glance</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {roles.map((r) => {
            const goals = board.goals.filter((g) => g.roleId === r.id);
            return (
              <div key={r.id} className="rounded-xl border bg-card p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <RoleDot color={r.color} /> {r.name}
                </div>
                {goals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rock this week.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {goals.map((g) => {
                      const when = whenFor(g);
                      return (
                        <li key={g.id} className="flex items-start gap-2">
                          <Mountain className="mt-0.5 size-3.5 shrink-0 text-primary" />
                          <span className="min-w-0 flex-1">
                            {g.title}
                            <span className={cn("block text-xs", when ? "text-muted-foreground" : "text-warning")}>
                              {when ?? "not scheduled"}
                              {g.blockMinutes ? ` · ${formatDuration(g.blockMinutes)}` : ""}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <IfThenPlans goals={board.goals.filter((g) => g.status === "open")} />

      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
        {board.week.status !== "draft" && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Check className="size-4" /> Already committed. Committing again just saves changes.
          </span>
        )}
        <Button size="lg" onClick={() => commit.mutate(undefined)} disabled={commit.isPending}>
          <CalendarCheck /> Commit to this week
        </Button>
      </div>
    </div>
  );
}

function Summary({ label, value, hint, warn }: { label: string; value: string; hint: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold tabular-nums", warn && "text-warning")}>{value}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

/** Implementation intentions help most when used sparingly: only for the one to three rocks that matter most. */
function IfThenPlans({ goals }: { goals: WeekGoal[] }) {
  const [picked, setPicked] = useState<string[]>(() => goals.filter((g) => g.ifThen).map((g) => g.id).slice(0, 3));
  if (goals.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">If–then plans for your top rocks (optional)</h3>
      <PrincipleNote>
        Pick up to three rocks that matter most and decide in advance what you&apos;ll do when the obvious obstacle shows up. For
        example: &ldquo;If the morning meeting runs over, then I run at 18:00 instead.&rdquo;
      </PrincipleNote>
      <div className="flex flex-wrap gap-1.5">
        {goals.map((g) => {
          const on = picked.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              disabled={!on && picked.length >= 3}
              onClick={() => setPicked(on ? picked.filter((x) => x !== g.id) : [...picked, g.id])}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-40",
                on ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
              )}
            >
              {g.title}
            </button>
          );
        })}
      </div>
      <div className="grid gap-2">
        {goals
          .filter((g) => picked.includes(g.id))
          .map((g) => (
            <IfThenRow key={g.id} goal={g} />
          ))}
      </div>
    </section>
  );
}

function IfThenRow({ goal }: { goal: WeekGoal }) {
  const { update } = useTaskActions();
  const [text, setText] = useState(goal.ifThen);
  return (
    <div className="grid gap-1 sm:grid-cols-[14rem_1fr] sm:items-center">
      <span className="truncate text-sm font-medium">{goal.title}</span>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== goal.ifThen && update.mutate({ id: goal.id, ifThen: text })}
        placeholder="If …, then I will …"
      />
    </div>
  );
}
