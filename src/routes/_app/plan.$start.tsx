import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Timer, X } from "lucide-react";
import { useState } from "react";
import { isValidISODate, weekStartFor } from "@shared/dates.ts";
import { StepCommit } from "@/components/plan/step-commit";
import { StepCompass } from "@/components/plan/step-compass";
import { StepGoals } from "@/components/plan/step-goals";
import { StepReview } from "@/components/plan/step-review";
import { StepRoles } from "@/components/plan/step-roles";
import { StepSchedule } from "@/components/plan/step-schedule";
import { PLAN_STEPS, STEP_LABELS, type PlanStep } from "@/components/plan/steps";
import { Button } from "@/components/ui/button";
import { formatWeekRange } from "@/lib/format";
import { useBootstrap, useNow } from "@/lib/hooks";
import { bootstrapQuery, weekQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/plan/$start")({
  validateSearch: (search: Record<string, unknown>): { step?: PlanStep } => ({
    step: PLAN_STEPS.includes(search.step as PlanStep) ? (search.step as PlanStep) : undefined,
  }),
  beforeLoad: async ({ params, context }) => {
    const boot = await context.queryClient.ensureQueryData(bootstrapQuery());
    const valid = isValidISODate(params.start) ? weekStartFor(params.start, boot.settings.weekStartsOn) : boot.weekStart;
    if (valid !== params.start) throw redirect({ to: "/plan/$start", params: { start: valid } });
  },
  loader: ({ params, context }) => context.queryClient.ensureQueryData(weekQuery(params.start)),
  component: PlanPage,
});

function PlanPage() {
  const { start } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: board } = useQuery(weekQuery(start));
  const { weekStart } = useBootstrap();

  const hasReview = !!board?.lastUnreviewed;
  const steps = PLAN_STEPS.filter((s) => s !== "review" || hasReview || search.step === "review");
  const step: PlanStep = search.step && steps.includes(search.step) ? search.step : steps[0];
  const index = steps.indexOf(step);
  const go = (s: PlanStep) => navigate({ search: { step: s }, replace: false });
  const next = () => index < steps.length - 1 && go(steps[index + 1]);
  const back = () => index > 0 && go(steps[index - 1]);

  return (
    <div className="flex min-h-[calc(100svh-3rem)] flex-col">
      <div className="border-b bg-background/80 px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Weekly planning · {start === weekStart ? "this week" : "week of"}
            </div>
            <h1 className="text-lg font-semibold tracking-tight">{formatWeekRange(start)}</h1>
          </div>
          <ol className="flex flex-1 flex-wrap items-center gap-1" aria-label="Planning steps">
            {steps.map((s, i) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => go(s)}
                  aria-current={s === step ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors",
                    s === step ? "border-primary bg-primary text-primary-foreground" : i < index ? "border-primary/30 text-foreground hover:bg-muted" : "text-muted-foreground hover:bg-muted",
                  )}
                  title={STEP_LABELS[s].hint}
                >
                  <span className={cn("grid size-4.5 place-items-center rounded-full text-[10px] font-semibold", s === step ? "bg-primary-foreground/20" : "bg-muted")}>
                    {i < index ? <Check className="size-3" /> : i + 1}
                  </span>
                  {STEP_LABELS[s].label}
                </button>
              </li>
            ))}
          </ol>
          <div className="flex items-center gap-2">
            <ElapsedTimer start={start} />
            <Button variant="ghost" size="icon-sm" aria-label="Leave planning" render={<Link to="/week/$start" params={{ start }} />}>
              <X />
            </Button>
          </div>
        </div>
      </div>

      <div className={cn("flex-1 px-4 py-6 sm:px-6 lg:px-8", step === "schedule" && "py-4")}>
        <div className={cn("mx-auto", step === "schedule" ? "max-w-[1500px]" : "max-w-4xl")}>
          {!board ? null : step === "review" ? (
            <StepReview board={board} planStart={start} onDone={next} />
          ) : step === "compass" ? (
            <StepCompass board={board} />
          ) : step === "roles" ? (
            <StepRoles board={board} />
          ) : step === "goals" ? (
            <StepGoals board={board} />
          ) : step === "schedule" ? (
            <StepSchedule board={board} />
          ) : (
            <StepCommit board={board} />
          )}
        </div>
      </div>

      {step !== "review" && step !== "commit" && (
        <div className="sticky bottom-0 border-t bg-background/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className={cn("mx-auto flex items-center justify-between", step === "schedule" ? "max-w-[1500px]" : "max-w-4xl")}>
            <Button variant="ghost" onClick={back} disabled={index === 0}>
              <ArrowLeft /> Back
            </Button>
            <span className="hidden text-sm text-muted-foreground sm:block">{STEP_LABELS[step].hint}</span>
            <Button onClick={next}>
              Next: {STEP_LABELS[steps[index + 1]]?.label} <ArrowRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Sean Covey's advice: about thirty minutes a week. This keeps the ritual honest. */
function ElapsedTimer({ start }: { start: string }) {
  const key = `compass.plan.startedAt.${start}`;
  const [startedAt] = useState(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) return Number(saved);
      const now = Date.now();
      sessionStorage.setItem(key, String(now));
      return now;
    } catch {
      return Date.now();
    }
  });
  const now = useNow(15_000).getTime();
  const minutes = Math.max(0, Math.floor((now - startedAt) / 60_000));
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs tabular-nums", minutes > 30 ? "text-warning" : "text-muted-foreground")}
      title="Aim for about 30 minutes"
    >
      <Timer className="size-3.5" /> {minutes} min
    </span>
  );
}
