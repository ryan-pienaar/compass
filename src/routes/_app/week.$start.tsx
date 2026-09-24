import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CalendarCheck, Check, ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { addDaysISO, addWeeksISO, isValidISODate, weekStartFor } from "@shared/dates.ts";
import { Chip } from "@/components/chip";
import { IconButton } from "@/components/icon-button";
import { Page, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WeekPlanner } from "@/components/week/week-planner";
import { WeekStats } from "@/components/week/week-stats";
import { api, call } from "@/lib/api";
import { formatWeekRange } from "@/lib/format";
import { useBootstrap } from "@/lib/hooks";
import { useApiMutation } from "@/lib/mutations";
import { bootstrapQuery, weekQuery } from "@/lib/queries";

export const Route = createFileRoute("/_app/week/$start")({
  beforeLoad: async ({ params, context }) => {
    const boot = await context.queryClient.ensureQueryData(bootstrapQuery());
    const valid = isValidISODate(params.start) ? weekStartFor(params.start, boot.settings.weekStartsOn) : boot.weekStart;
    if (valid !== params.start) throw redirect({ to: "/week/$start", params: { start: valid } });
  },
  loader: ({ params, context }) => context.queryClient.ensureQueryData(weekQuery(params.start)),
  component: WeekPage,
});

/**
 * At `lg` the planner fills the rest of the viewport. Measured chrome (22.875rem): top bar 3rem,
 * page top 1.5rem, header 4.625rem + 1rem, weekly focus 2rem + 1rem, stats 7.25rem + 1rem,
 * page bottom 1.5rem. The 34rem floor keeps about six hours of the grid in view under its sticky
 * day header, so on a laptop screen the page scrolls a little rather than squeezing the week.
 */
const PLANNER_HEIGHT = "max(calc(100svh - 22.875rem), 34rem)";
/** Below `lg` the tray stacks above the grid and the page scrolls anyway, so the grid takes nearly a full screen. */
const STACKED_GRID_HEIGHT = "calc(100svh - 7rem)";

function WeekPage() {
  const { start } = Route.useParams();
  const { today, weekStart } = useBootstrap();
  const { data: board } = useQuery(weekQuery(start));
  const status = board?.week.status ?? "draft";
  const lastDay = addDaysISO(start, 6);
  const reviewable = status === "planned" && today >= addDaysISO(lastDay, -1);

  return (
    <Page width="full" className="pt-4 pb-6 sm:pt-6">
      <PageHeader
        className="mb-4"
        eyebrow={
          <>
            <IconButton
              label="Previous week"
              icon={<ChevronLeft />}
              className="-ml-2"
              render={<Link to="/week/$start" params={{ start: addWeeksISO(start, -1) }} />}
            />
            <IconButton label="Next week" icon={<ChevronRight />} render={<Link to="/week/$start" params={{ start: addWeeksISO(start, 1) }} />} />
            {start !== weekStart && (
              <Button
                variant="link"
                size="inline"
                // A 44px-tall hit area on touch, level with the chevrons; the sides stop short of them.
                className="ml-1.5 pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1.5 pointer-coarse:after:-inset-y-3"
                render={<Link to="/week/$start" params={{ start: weekStart }} />}
              >
                This week
              </Button>
            )}
          </>
        }
        title={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="tabular-nums">{formatWeekRange(start)}</span>
            <WeekStatusBadge status={status} />
          </span>
        }
        actions={
          <>
            {status === "draft" && (
              <Button size="sm" render={<Link to="/plan/$start" params={{ start }} />}>
                <CalendarCheck /> Plan this week
              </Button>
            )}
            {reviewable && (
              <Button size="sm" variant="outline" render={<Link to="/plan/$start" params={{ start: addWeeksISO(start, 1) }} search={{ step: "review" }} />}>
                <ClipboardCheck /> Review & plan next week
              </Button>
            )}
            {status !== "draft" && (
              <Button size="sm" variant="ghost" render={<Link to="/plan/$start" params={{ start }} search={{ step: "goals" }} />}>
                Replan
              </Button>
            )}
          </>
        }
      />
      {board && <Intention start={start} value={board.week.intention} />}
      {board && <WeekStats board={board} className="mb-4" />}
      <WeekPlanner start={start} height={PLANNER_HEIGHT} stackedHeight={STACKED_GRID_HEIGHT} />
    </Page>
  );
}

/** Draft: an outline chip with a hollow dot. Planned: a teal dot. Reviewed: a check. Set in Geist beside the serif title. */
function WeekStatusBadge({ status }: { status: string }) {
  if (status === "draft") {
    return (
      <Chip tone="outline" className="font-sans">
        <span aria-hidden className="size-2 shrink-0 rounded-full ring-1 ring-control ring-inset" />
        Not planned yet
      </Chip>
    );
  }
  if (status === "planned") {
    return (
      <Chip tone="neutral" className="font-sans">
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-primary ring-1 ring-dot-ring" />
        Planned
      </Chip>
    );
  }
  return (
    <Chip tone="neutral" className="font-sans" icon={<Check aria-hidden />}>
      Reviewed
    </Chip>
  );
}

function Intention({ start, value }: { start: string; value: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const save = useApiMutation((intention: string) => call(api.weeks[":start"].$patch({ param: { start }, json: { intention } })));
  return (
    <Input
      variant="ghost"
      voice="md"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text !== value && save.mutate(text)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      placeholder="Intention for this week: what would make it a good week?"
      // One voice step smaller on phones, so a typical intention fits the line; a longer one (or the
      // placeholder) ends in an ellipsis rather than a clipped letter while the field is at rest.
      className="mb-4 text-ellipsis italic max-sm:voice-sm"
      aria-label="Intention for the week"
    />
  );
}
