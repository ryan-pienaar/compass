import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CalendarCheck, ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { addDaysISO, addWeeksISO, isValidISODate, weekStartFor } from "@shared/dates.ts";
import { Page } from "@/components/page";
import { Badge } from "@/components/ui/badge";
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

function WeekPage() {
  const { start } = Route.useParams();
  const { today, weekStart } = useBootstrap();
  const { data: board } = useQuery(weekQuery(start));
  const status = board?.week.status ?? "draft";
  const lastDay = addDaysISO(start, 6);
  const reviewable = status === "planned" && today >= addDaysISO(lastDay, -1);

  return (
    <Page width="full" className="pt-2 pb-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Previous week" render={<Link to="/week/$start" params={{ start: addWeeksISO(start, -1) }} />}>
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Next week" render={<Link to="/week/$start" params={{ start: addWeeksISO(start, 1) }} />}>
            <ChevronRight />
          </Button>
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{formatWeekRange(start)}</h1>
        {start !== weekStart && (
          <Button variant="outline" size="xs" render={<Link to="/week/$start" params={{ start: weekStart }} />}>
            This week
          </Button>
        )}
        <Badge variant={status === "draft" ? "outline" : "secondary"} className="ml-1">
          {status === "draft" ? "Not planned yet" : status === "planned" ? "Planned" : "Reviewed"}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
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
        </div>
      </div>
      {board && <Intention start={start} value={board.week.intention} />}
      {board && <WeekStats board={board} className="mb-3" />}
      <WeekPlanner start={start} height="calc(100svh - 15.5rem)" />
    </Page>
  );
}

function Intention({ start, value }: { start: string; value: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const save = useApiMutation((intention: string) => call(api.weeks[":start"].$patch({ param: { start }, json: { intention } })));
  return (
    <Input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text !== value && save.mutate(text)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      placeholder="Intention for this week: what would make it a good week?"
      className="compass-text mb-3 h-9 border-dashed bg-transparent italic shadow-none dark:bg-transparent"
      aria-label="Intention for the week"
    />
  );
}
