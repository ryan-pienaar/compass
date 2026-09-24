import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, CircleCheck, Repeat, Sparkles } from "lucide-react";
import { useId, useMemo, useState, type CSSProperties } from "react";
import { addWeeksISO } from "@shared/dates.ts";
import { integritySummary, MISS_REASONS, type MissReason } from "@shared/integrity.ts";
import { SAW_DIMENSIONS } from "@shared/content.ts";
import { Chip } from "@/components/chip";
import { useEnterOnce } from "@/components/motion";
import { PrincipleNote, SectionHeader, StepHeader } from "@/components/page";
import { QuadrantDot, RoleDot } from "@/components/badges";
import { ActionBar, StepBody } from "@/components/plan/plan-chrome";
import { OptionButton } from "@/components/plan/option-card";
import { STEP_LABELS } from "@/components/plan/steps";
import { Segmented } from "@/components/segmented";
import { StatCell, StatStrip } from "@/components/stat";
import { Callout } from "@/components/surface";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api, call, type Role, type WeekBoard, type WeekGoal, type WeekReview } from "@/lib/api";
import { fmtDate, formatWeekRange, hoursLabel, pct } from "@/lib/format";
import { useApiMutation } from "@/lib/mutations";
import { weekReviewQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Decision = { outcome: "done" | "missed" | "dropped"; reason: MissReason | null; note: string; carry: boolean };

export function StepReview({
  board,
  planStart,
  onDone,
  onBack,
  backDisabled,
}: {
  board: WeekBoard;
  planStart: string;
  onDone: () => void;
  onBack: () => void;
  backDisabled: boolean;
}) {
  const reviewStart = board.lastUnreviewed?.startDate ?? addWeeksISO(planStart, -1);
  const weeksAgo = board.lastUnreviewed?.weeksAgo ?? 1;
  const { data: review } = useQuery(weekReviewQuery(reviewStart));
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [rating, setRating] = useState<number | null>(null);
  const [wins, setWins] = useState<string | null>(null);
  const [lessons, setLessons] = useState<string | null>(null);
  const winsId = useId();
  const lessonsId = useId();
  const ratingId = useId();

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

  const header = (
    <StepHeader
      title={`Close out ${weeksAgo > 1 ? "your last planned week" : "last week"}`}
      lede={
        <>
          {formatWeekRange(reviewStart)}. Start with what went well, then decide honestly about the rest. A change of plan for a
          genuinely higher value is integrity, not failure.
        </>
      }
    />
  );

  if (!review || !projected) {
    return (
      <StepBody aria-busy>
        {header}
        <div className="space-y-10" aria-hidden>
          <Skeleton className="h-24 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        </div>
      </StepBody>
    );
  }
  const rolesById = new Map(review.roles.map((r) => [r.id, r]));
  const openGoals = review.goals.filter((g) => g.status === "open");
  const kept = review.goals.filter((g) => g.status === "done");
  const closed = review.goals.filter((g) => g.status === "missed" || g.status === "dropped");
  // Every open rock gets a decision, so nothing is left open without anywhere to decide it later.
  const undecided = openGoals.filter((g) => !decisions[g.id]).length;
  const saving = submit.isPending && submit.variables === false;
  const currentRating = rating ?? review.week.reviewRating;

  const decide = (g: WeekGoal, patch: Partial<Decision>) =>
    setDecisions((all) => {
      const base: Decision = all[g.id] ?? { outcome: "missed", reason: null, note: "", carry: true };
      return { ...all, [g.id]: { ...base, ...patch } };
    });

  return (
    <>
      <StepBody>
      {header}

      <div className="space-y-10">
        {weeksAgo > 1 && (
          <Callout
            tone="neutral"
            icon={<Sparkles />}
            title={<>It&apos;s been {weeksAgo} weeks. That&apos;s okay.</>}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => submit.mutate(true)}
                disabled={submit.isPending}
                pending={submit.isPending && submit.variables === true}
              >
                Fresh start: skip review
              </Button>
            }
          >
            <p>
              You can review it, or make a fresh start: its open rocks close without judgement and nothing carries over. No backlog of guilt.
            </p>
          </Callout>
        )}

        <StatStrip cols={3}>
          <StatCell label="Promises kept" value={projected.score == null ? "–" : pct(projected.score)} hint={`${projected.kept} of ${projected.counted} decided`} />
          <StatCell
            label={
              <>
                <QuadrantDot q={2} /> Quadrant II time
              </>
            }
            value={hoursLabel(review.q2.doneMinutes)}
            hint={`of ${hoursLabel(review.q2.plannedMinutes)} planned`}
          />
          <StatCell label="Rocks done" value={`${kept.length}/${review.goals.length}`} hint={undecided ? `${undecided} still to decide` : "All decided"} />
        </StatStrip>

        {kept.length > 0 && <KeptList goals={kept} rolesById={rolesById} />}

        {openGoals.length > 0 && (
          <section>
            <SectionHeader as="h3" title="Decide on the rest" count={openGoals.length} />
            <ul>
              {openGoals.map((g) => {
                const d = decisions[g.id];
                const role = g.roleId ? rolesById.get(g.roleId) : undefined;
                return (
                  <li key={g.id} className="border-t border-border-subtle py-4 first:border-t-0 first:pt-1">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <div className="flex min-w-0 flex-1 basis-56 items-center gap-2.5">
                        <RoleDot color={role?.color} />
                        <span className="min-w-0 text-sm font-medium text-foreground">{g.title}</span>
                        {g.carryCount > 0 && (
                          <Chip size="sm" icon={<Repeat aria-hidden />} className="tabular-nums">
                            carried {g.carryCount}×
                          </Chip>
                        )}
                      </div>
                      <Segmented
                        size="sm"
                        aria-label={`Outcome for ${g.title}`}
                        value={d ? (d.outcome === "done" ? "done" : "missed") : null}
                        onChange={(v) => decide(g, { outcome: v === "done" ? "done" : "missed" })}
                        options={[
                          {
                            value: "done",
                            label: (
                              <>
                                <Check aria-hidden /> Done after all
                              </>
                            ),
                          },
                          { value: "missed", label: "Not done" },
                        ]}
                      />
                    </div>
                    {d && d.outcome !== "done" && (
                      <div className="mt-4 grid gap-4 sm:pl-4.5">
                        <div role="group" aria-label={`Why ${g.title} wasn't done`} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {MISS_REASONS.map((r) => {
                            const active = (d.outcome === "dropped" && r.value === "no_longer_relevant") || (d.outcome === "missed" && d.reason === r.value);
                            return (
                              <OptionButton
                                key={r.value}
                                pressed={active}
                                title={r.label}
                                description={r.description}
                                mark={
                                  r.value === "higher_value" ? (
                                    <>
                                      <CircleCheck aria-hidden className="size-3.5 shrink-0 text-success" />
                                      <span className="sr-only">(counts as kept)</span>
                                    </>
                                  ) : undefined
                                }
                                onClick={() =>
                                  decide(g, {
                                    outcome: r.value === "no_longer_relevant" ? "dropped" : "missed",
                                    reason: r.value === "no_longer_relevant" ? null : r.value,
                                    carry: r.value !== "no_longer_relevant",
                                  })
                                }
                              />
                            );
                          })}
                        </div>
                        {g.carryCount >= 1 && d.carry && (
                          <PrincipleNote>
                            This has been carried before. Before carrying it again: can you break it into a smaller first step, give it a
                            specific time, or let it go?
                          </PrincipleNote>
                        )}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                          <Input
                            placeholder="Note (optional): what happened?"
                            aria-label={`Note for ${g.title}`}
                            value={d.note}
                            onChange={(e) => decide(g, { note: e.target.value })}
                            className="sm:flex-1"
                          />
                          {d.outcome !== "dropped" && (
                            <label className="flex items-center gap-2.5 text-sm whitespace-nowrap text-foreground">
                              <Checkbox checked={d.carry} onCheckedChange={(v) => decide(g, { carry: v === true })} />
                              Carry into this week
                            </label>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {closed.length > 0 && <p className="-mt-4 text-sm text-muted-foreground">Already decided: {closed.map((g) => g.title).join(", ")}.</p>}

        <section className="space-y-6">
          <div>
            <h3 id={ratingId} className="voice text-foreground">
              How well did your plan turn your deepest values into your days?
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <Segmented
                aria-label="Rating"
                aria-describedby={ratingId}
                value={currentRating != null ? (String(currentRating) as RatingValue) : null}
                onChange={(v) => setRating(Number(v))}
                options={RATING_OPTIONS}
              />
              <span className="text-xs text-muted-foreground">1 = barely · 5 = fully</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="grid content-start gap-2">
              <Label htmlFor={winsId}>Three wins</Label>
              <Textarea id={winsId} rows={3} voice="sm" className="min-h-26" value={wins ?? review.week.wins} onChange={(e) => setWins(e.target.value)} placeholder={"1.\n2.\n3."} />
            </div>
            <div className="grid content-start gap-2">
              <Label htmlFor={lessonsId}>What will you do differently?</Label>
              <Textarea
                id={lessonsId}
                rows={3}
                voice="sm"
                className="min-h-26"
                value={lessons ?? review.week.lessons}
                onChange={(e) => setLessons(e.target.value)}
                placeholder="One lesson for next week"
              />
            </div>
          </div>
        </section>

        <BalanceStrip review={review} />
      </div>
      </StepBody>

      <ActionBar
        onBack={onBack}
        backDisabled={backDisabled}
        persistentHint={undecided > 0}
        hint={
          undecided > 0
            ? `Decide on ${undecided} more rock${undecided === 1 ? "" : "s"}: done after all, or not done (a reason is optional).`
            : STEP_LABELS.review.hint
        }
      >
        <Button
          size="xl"
          onClick={() => submit.mutate(false)}
          disabled={submit.isPending || undecided > 0}
          pending={saving}
          // A step smaller on phones, so it keeps its line beside the icon-only Back even at 320px.
          className="max-sm:text-sm max-[359px]:px-3 min-[360px]:max-sm:px-4"
        >
          Save review & plan this week
          {/* No leading icon to swap, so the spinner takes the arrow's place (same footprint). */}
          {saving ? (
            <Spinner aria-hidden role={undefined} aria-label={undefined} className="size-4.5 text-current max-sm:size-4" />
          ) : (
            <ArrowRight className="size-4.5 max-sm:size-4" />
          )}
        </Button>
      </ActionBar>
    </>
  );
}

type RatingValue = "1" | "2" | "3" | "4" | "5";
const RATING_OPTIONS: { value: RatingValue; label: string; className: string }[] = (["1", "2", "3", "4", "5"] as const).map((n) => ({
  value: n,
  label: n,
  className: "w-9 px-0 tabular-nums pointer-coarse:w-11",
}));

/** Kept promises enter once, each with the success check. */
function KeptList({ goals, rolesById }: { goals: WeekGoal[]; rolesById: Map<string, Role> }) {
  const enter = useEnterOnce();
  return (
    <section>
      <SectionHeader as="h3" title="Kept" count={goals.length} />
      <ul className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        {goals.map((g, i) => {
          const e = enter(i);
          return (
            <li key={g.id} className={cn("flex min-h-9 items-start gap-2.5 py-1.5 text-sm text-foreground", e.className)} style={e.style}>
              <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
              <RoleDot color={g.roleId ? rolesById.get(g.roleId)?.color : null} className="mt-1.5" />
              <span className="min-w-0">{g.title}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Balance is judged over weeks, not days: roles and renewal over the last four weeks. */
function BalanceStrip({ review }: { review: WeekReview }) {
  const roles = review.roles.filter((r) => !r.isSaw && !r.archivedAt);
  return (
    <section>
      <SectionHeader as="h3" title="Balance over the last four weeks" />
      <Card variant="flush" className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th scope="col" className="py-2.5 pr-3 pl-4 text-left font-medium">
                Role
              </th>
              {review.balance.map((b) => (
                <th key={b.weekStart} scope="col" className="px-2 py-2.5 text-center font-medium whitespace-nowrap tabular-nums last:pr-4 sm:px-3">
                  {fmtDate(b.weekStart, "d MMM")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} className="border-t border-border-subtle">
                <th scope="row" className="py-2 pr-2 pl-4 text-left font-normal text-foreground sm:pr-3">
                  <span className="flex items-center gap-2">
                    <RoleDot color={r.color} /> {r.name}
                  </span>
                </th>
                {review.balance.map((b) => {
                  const had = b.roleIds.includes(r.id);
                  return (
                    <td key={b.weekStart} className="px-2 py-2 text-center last:pr-4 sm:px-3">
                      <CoverageDot color={r.color} covered={had} />
                      <span className="sr-only">{had ? "Had a rock" : "No rock"}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t border-border-subtle">
              <th scope="row" className="py-2 pr-2 pl-4 text-left font-normal text-foreground sm:pr-3">
                <span className="flex items-center gap-2">
                  <QuadrantDot q={2} /> Sharpen the saw
                </span>
              </th>
              {review.balance.map((b) => {
                const covered = SAW_DIMENSIONS.filter((d) => b.saw.includes(d.key));
                return (
                  <td key={b.weekStart} className="px-2 py-2 text-center last:pr-4 sm:px-3">
                    <span aria-hidden className="inline-flex gap-0.5 align-middle">
                      {SAW_DIMENSIONS.map((d) => (
                        <span key={d.key} className={cn("h-3 w-1.5 rounded-xs", b.saw.includes(d.key) ? "bg-q2" : "bg-muted")} />
                      ))}
                    </span>
                    <span className="sr-only">{covered.length ? covered.map((d) => d.label).join(", ") : "No rock"}</span>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border-subtle px-4 py-2.5 text-xs text-muted-foreground" aria-hidden>
          <span className="inline-flex items-center gap-1.5">
            <CoverageDot covered /> Had a rock
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CoverageDot covered={false} /> No rock
          </span>
        </div>
      </Card>
    </section>
  );
}

/** Covered: a filled role dot. Uncovered: a hollow ring in the role's legible ink. */
function CoverageDot({ color, covered }: { color?: string | null; covered: boolean }) {
  if (covered) return <RoleDot color={color} className="size-2.5 align-middle" />;
  return (
    <span
      aria-hidden
      className="role-scope inline-block size-2.5 rounded-full align-middle ring-1 ring-(--role-ink) ring-inset"
      style={color ? ({ "--role": color } as CSSProperties) : ({ "--role": "var(--muted-foreground)" } as CSSProperties)}
    />
  );
}
