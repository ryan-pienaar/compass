import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Clock, X } from "lucide-react";
import { useState } from "react";
import { isValidISODate, weekStartFor } from "@shared/dates.ts";
import { Chip } from "@/components/chip";
import { IconButton } from "@/components/icon-button";
import { ActionBar, PlanStepper, StepBody } from "@/components/plan/plan-chrome";
import { StepCommit } from "@/components/plan/step-commit";
import { StepCompass } from "@/components/plan/step-compass";
import { StepGoals } from "@/components/plan/step-goals";
import { StepReview } from "@/components/plan/step-review";
import { StepRoles } from "@/components/plan/step-roles";
import { StepSchedule } from "@/components/plan/step-schedule";
import { PLAN_STEPS, STEP_LABELS, type PlanStep } from "@/components/plan/steps";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

/** Content width per step: a reading column, a wider one for the two-column rocks, the full grid for scheduling. */
const STEP_WIDTH: Record<PlanStep, string> = {
  review: "max-w-3xl",
  compass: "max-w-3xl",
  roles: "max-w-3xl",
  goals: "max-w-5xl",
  schedule: "max-w-8xl lg:px-10",
  commit: "max-w-3xl",
};

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
  const width = STEP_WIDTH[step];

  return (
    <div className="flex min-h-[calc(100svh-3rem)] flex-col">
      <header className="sticky top-12 z-20 border-b border-border-subtle bg-background/85 backdrop-blur-md backdrop-saturate-150">
        <div className="@container/plan mx-auto flex h-14 max-w-8xl items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-10">
          <div className="sr-only @2xl/plan:not-sr-only @2xl/plan:shrink-0">
            <p className="text-xs font-medium text-muted-foreground">
              Weekly planning · {start === weekStart ? "this week" : "week of"}
            </p>
            <h1 className="truncate text-sm font-semibold text-foreground tabular-nums">{formatWeekRange(start)}</h1>
          </div>
          <div className="@container/steps flex min-w-0 flex-1 justify-start @2xl/plan:justify-center">
            <PlanStepper steps={steps} current={step} committed={!!board && board.week.status !== "draft"} onSelect={go} />
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ElapsedTimer start={start} />
            <IconButton label="Leave planning" icon={<X />} tooltipSide="bottom" render={<Link to="/week/$start" params={{ start }} />} />
          </div>
        </div>
      </header>

      {/* Review and commit render their own body and ActionBar (their primary action lives in their state). */}
      {!board ? null : step === "review" ? (
        <StepReview board={board} planStart={start} onDone={next} onBack={back} backDisabled={index === 0} />
      ) : step === "commit" ? (
        <StepCommit board={board} onBack={back} backDisabled={index === 0} />
      ) : (
        <>
          <StepBody className={cn(width, step === "schedule" && "py-4")}>
            {step === "compass" ? (
              <StepCompass board={board} />
            ) : step === "roles" ? (
              <StepRoles board={board} />
            ) : step === "goals" ? (
              <StepGoals board={board} />
            ) : (
              <StepSchedule board={board} />
            )}
          </StepBody>
          <ActionBar onBack={back} backDisabled={index === 0} hint={STEP_LABELS[step].hint} className={width}>
            <Button size="xl" onClick={next}>
              Next: {STEP_LABELS[steps[index + 1]]?.label} <ArrowRight />
            </Button>
          </ActionBar>
        </>
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
    <Tooltip>
      <TooltipTrigger
        render={
          <Chip tone={minutes > 30 ? "warning" : "neutral"} icon={<Clock aria-hidden />} className="tabular-nums max-[359px]:[&>svg]:hidden" />
        }
      >
        <span className="sr-only">Time spent planning: </span>
        {minutes} min
      </TooltipTrigger>
      <TooltipContent side="bottom">Aim for about 30 minutes</TooltipContent>
    </Tooltip>
  );
}
