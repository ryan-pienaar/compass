import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, PartyPopper, Repeat, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { addWeeksISO } from "@shared/dates.ts";
import { integritySummary, MISS_REASONS, type MissReason } from "@shared/integrity.ts";
import { SAW_DIMENSIONS } from "@shared/content.ts";
import { PrincipleNote } from "@/components/page";
import { RoleDot } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, call, type WeekBoard, type WeekGoal, type WeekReview } from "@/lib/api";
import { fmtDate, formatWeekRange, hoursLabel, pct } from "@/lib/format";
import { useApiMutation } from "@/lib/mutations";
import { weekReviewQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Decision = { outcome: "done" | "missed" | "dropped"; reason: MissReason | null; note: string; carry: boolean };

export function StepReview({ board, planStart, onDone }: { board: WeekBoard; planStart: string; onDone: () => void }) {
  const reviewStart = board.lastUnreviewed?.startDate ?? addWeeksISO(planStart, -1);
  const weeksAgo = board.lastUnreviewed?.weeksAgo ?? 1;
  const { data: review } = useQuery(weekReviewQuery(reviewStart));
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [rating, setRating] = useState<number | null>(null);
  const [wins, setWins] = useState<string | null>(null);
  const [lessons, setLessons] = useState<string | null>(null);

  const submit = useApiMutation(
    (skip: boolean) =>
      call(
        api.weeks[":start"].review.$post({
          param: { start: reviewStart },
          json: skip
            ? {
                // A fresh start closes the old rocks without judgement and carries nothing.
                dispositions: (review?.goals ?? [])
                  .filter((g) => g.status === "open")
                  .map((g) => ({ taskId: g.id, outcome: "missed" as const, reason: null, carry: false })),
                carryTo: planStart,
              }
            : {
                dispositions: Object.entries(decisions).map(([taskId, d]) => ({
                  taskId,
                  outcome: d.outcome,
                  reason: d.outcome === "missed" ? d.reason : null,
                  note: d.note,
                  carry: d.outcome !== "done" && d.carry,
                })),
                carryTo: planStart,
                rating: rating ?? review?.week.reviewRating ?? null,
                wins: wins ?? review?.week.wins ?? "",
                lessons: lessons ?? review?.week.lessons ?? "",
              },
        }),
      ),
    {
      success: (res) => (res.carried ? `Review saved. ${res.carried} carried into this week.` : "Review saved"),
      onSuccess: onDone,
    },
  );

  const projected = useMemo(() => {
    if (!review) return null;
    return integritySummary(
      review.goals.map((g) => {
        const d = decisions[g.id];
        if (!d || g.status !== "open") return g;
        // "Not done" without a reason makes no judgement either way.
        return { status: d.outcome, statusReason: d.outcome === "missed" ? d.reason : d.outcome === "dropped" ? "no_longer_relevant" : null };
      }),
    );
  }, [review, decisions]);

  if (!review || !projected) return <Skeleton className="h-96" />;
  const rolesById = new Map(review.roles.map((r) => [r.id, r]));
  const openGoals = review.goals.filter((g) => g.status === "open");
  const kept = review.goals.filter((g) => g.status === "done");
  const closed = review.goals.filter((g) => g.status === "missed" || g.status === "dropped");
  // Every open rock gets a decision, so nothing is left open without anywhere to decide it later.
  const undecided = openGoals.filter((g) => !decisions[g.id]).length;

  const decide = (g: WeekGoal, patch: Partial<Decision>) =>
    setDecisions((all) => {
      const base: Decision = all[g.id] ?? { outcome: "missed", reason: null, note: "", carry: true };
      return { ...all, [g.id]: { ...base, ...patch } };
    });

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="compass-display text-3xl">Close out {weeksAgo > 1 ? "your last planned week" : "last week"}</h2>
        <p className="text-muted-foreground">
          {formatWeekRange(reviewStart)}. Start with what went well, then decide honestly about the rest. A change of plan for a
          genuinely higher value is integrity, not failure.
        </p>
      </div>

      {weeksAgo > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-4">
          <div className="text-sm">
            <div className="font-medium">It&apos;s been {weeksAgo} weeks. That&apos;s okay.</div>
            <div className="text-muted-foreground">
              You can review it, or make a fresh start: its open rocks close without judgement and nothing carries over. No backlog of guilt.
            </div>
          </div>
          <Button variant="outline" onClick={() => submit.mutate(true)} disabled={submit.isPending}>
            <Sparkles /> Fresh start: skip review
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Promises kept" value={projected.score == null ? "–" : pct(projected.score)} hint={`${projected.kept} of ${projected.counted} decided`} />
        <Metric
          label="Quadrant II time"
          value={hoursLabel(review.q2.doneMinutes)}
          hint={`of ${hoursLabel(review.q2.plannedMinutes)} planned`}
        />
        <Metric label="Rocks done" value={`${kept.length}/${review.goals.length}`} hint={undecided ? `${undecided} still to decide` : "All decided"} />
      </div>

      {kept.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <PartyPopper className="size-4 text-primary" /> Kept
          </h3>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {kept.map((g) => (
              <li key={g.id} className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm">
                <Check className="size-4 shrink-0 text-primary" />
                <RoleDot color={g.roleId ? rolesById.get(g.roleId)?.color : null} />
                <span className="truncate">{g.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {openGoals.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Decide on the rest</h3>
          {openGoals.map((g) => {
            const d = decisions[g.id];
            const role = g.roleId ? rolesById.get(g.roleId) : undefined;
            return (
              <div key={g.id} className="rounded-xl border bg-card p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <RoleDot color={role?.color} />
                    <span className="font-medium">{g.title}</span>
                    {g.carryCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-warning">
                        <Repeat className="size-3" /> carried {g.carryCount}×
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant={d?.outcome === "done" ? "default" : "outline"} onClick={() => decide(g, { outcome: "done" })}>
                      <Check /> Done after all
                    </Button>
                    <Button size="sm" variant={d && d.outcome !== "done" ? "secondary" : "outline"} onClick={() => decide(g, { outcome: "missed" })}>
                      Not done
                    </Button>
                  </div>
                </div>
                {d && d.outcome !== "done" && (
                  <div className="mt-3 grid gap-3">
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {MISS_REASONS.map((r) => {
                        const active = (d.outcome === "dropped" && r.value === "no_longer_relevant") || (d.outcome === "missed" && d.reason === r.value);
                        return (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() =>
                              decide(g, {
                                outcome: r.value === "no_longer_relevant" ? "dropped" : "missed",
                                reason: r.value === "no_longer_relevant" ? null : r.value,
                                carry: r.value !== "no_longer_relevant",
                              })
                            }
                            className={cn(
                              "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                              active ? "border-primary bg-primary/10" : "hover:bg-muted",
                            )}
                          >
                            <div className="font-medium">{r.label}</div>
                            <div className="text-xs text-muted-foreground">{r.description}</div>
                          </button>
                        );
                      })}
                    </div>
                    {g.carryCount >= 1 && d.carry && (
                      <PrincipleNote>
                        This has been carried before. Before carrying it again: can you break it into a smaller first step, give it a
                        specific time, or let it go?
                      </PrincipleNote>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        placeholder="Note (optional): what happened?"
                        value={d.note}
                        onChange={(e) => decide(g, { note: e.target.value })}
                        className="flex-1"
                      />
                      {d.outcome !== "dropped" && (
                        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                          <Checkbox checked={d.carry} onCheckedChange={(v) => decide(g, { carry: v === true })} />
                          Carry into this week
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {closed.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Already decided: {closed.map((g) => g.title).join(", ")}.
        </p>
      )}

      <section className="grid gap-4 rounded-xl border bg-card p-4">
        <div className="grid gap-2">
          <Label className="compass-text !text-base">How well did your plan turn your deepest values into your days?</Label>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => {
              const current = rating ?? review.week.reviewRating;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={cn("size-9 rounded-full border text-sm font-semibold", current === n ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
                >
                  {n}
                </button>
              );
            })}
            <span className="self-center pl-2 text-xs text-muted-foreground">1 = barely · 5 = fully</span>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Three wins</Label>
            <Textarea rows={3} value={wins ?? review.week.wins} onChange={(e) => setWins(e.target.value)} placeholder={"1.\n2.\n3."} />
          </div>
          <div className="grid gap-1.5">
            <Label>What will you do differently?</Label>
            <Textarea rows={3} value={lessons ?? review.week.lessons} onChange={(e) => setLessons(e.target.value)} placeholder="One lesson for next week" />
          </div>
        </div>
      </section>

      <BalanceStrip review={review} />

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        {undecided > 0 && (
          <span className="text-sm text-muted-foreground">
            Decide on {undecided} more rock{undecided === 1 ? "" : "s"}: done after all, or not done (a reason is optional).
          </span>
        )}
        <Button size="lg" onClick={() => submit.mutate(false)} disabled={submit.isPending || undecided > 0}>
          Save review & plan this week <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

/** Balance is judged over weeks, not days: roles and renewal over the last four weeks. */
function BalanceStrip({ review }: { review: WeekReview }) {
  const roles = review.roles.filter((r) => !r.isSaw && !r.archivedAt);
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Balance over the last four weeks</h3>
      <div className="overflow-x-auto rounded-xl border bg-card p-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="py-1 text-left font-medium">Role</th>
              {review.balance.map((b) => (
                <th key={b.weekStart} className="px-2 py-1 font-medium">
                  {fmtDate(b.weekStart, "d MMM")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id}>
                <td className="py-1 pr-2">
                  <span className="flex items-center gap-1.5">
                    <RoleDot color={r.color} /> {r.name}
                  </span>
                </td>
                {review.balance.map((b) => (
                  <td key={b.weekStart} className="px-2 py-1 text-center">
                    <span
                      className={cn("inline-block size-3 rounded-full", b.roleIds.includes(r.id) ? "" : "opacity-20")}
                      style={{ backgroundColor: r.color }}
                      title={b.roleIds.includes(r.id) ? "Had a rock" : "No rock"}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="py-1 pr-2 text-muted-foreground">Sharpen the saw</td>
              {review.balance.map((b) => (
                <td key={b.weekStart} className="px-2 py-1 text-center">
                  <span className="inline-flex gap-0.5">
                    {SAW_DIMENSIONS.map((d) => (
                      <span key={d.key} title={d.label} className={cn("h-3 w-1.5 rounded-sm", b.saw.includes(d.key) ? "bg-q2" : "bg-muted")} />
                    ))}
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
