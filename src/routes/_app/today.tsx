import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, ChevronLeft, ChevronRight, Hand, Quote } from "lucide-react";
import { addDaysISO, isValidISODate, weekStartFor } from "@shared/dates.ts";
import { useAppState } from "@/components/app-state";
import { Page } from "@/components/page";
import { DayTimeline } from "@/components/today/timeline";
import { CheckinsPanel, DueSoonPanel, RocksPanel, UnfinishedPanel } from "@/components/today/panels";
import { Priorities } from "@/components/today/priorities";
import { ChallengeCheckin, EveningReflection } from "@/components/today/reflection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtDate, greeting, relativeDay } from "@/lib/format";
import { useBootstrap } from "@/lib/hooks";
import { todayQuery } from "@/lib/queries";

export const Route = createFileRoute("/_app/today")({
  validateSearch: (search: Record<string, unknown>): { date?: string } => ({
    date: isValidISODate(search.date) ? search.date : undefined,
  }),
  component: TodayPage,
});

function TodayPage() {
  const boot = useBootstrap();
  const search = Route.useSearch();
  const date = search.date ?? boot.today;
  const isToday = date === boot.today;
  // The check-in and reflection copy their text once: mount them only from a fetch made after this page mounted.
  const { data, isFetchedAfterMount } = useQuery(todayQuery(date));
  const { openCapture } = useAppState();
  const name = boot.settings.displayName;

  const weekStart = weekStartFor(date, boot.settings.weekStartsOn);
  const weekPlanned = data?.week && data.week.status !== "draft";
  const planningDay = new Date().getDay() === boot.settings.planningDay;
  const nextWeekNeedsPlan = boot.planTarget && boot.planTarget !== boot.weekStart;

  return (
    <Page width="wide">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Button variant="ghost" size="icon-xs" aria-label="Previous day" render={<Link to="/today" search={{ date: addDaysISO(date, -1) }} />}>
              <ChevronLeft />
            </Button>
            <span>{fmtDate(date, "EEEE d MMMM")}</span>
            <Button variant="ghost" size="icon-xs" aria-label="Next day" render={<Link to="/today" search={{ date: addDaysISO(date, 1) }} />}>
              <ChevronRight />
            </Button>
            {!isToday && (
              <Button variant="link" size="xs" className="h-auto" render={<Link to="/today" search={{}} />}>
                Back to today
              </Button>
            )}
          </div>
          <h1 className="compass-display text-3xl sm:text-4xl">
            {isToday ? `${greeting()}${name ? `, ${name}` : ""}.` : relativeDay(date, boot.today)}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openCapture({ mode: "interruption", scheduledDate: date })}>
            <Hand /> Something came up?
          </Button>
        </div>
      </header>

      {!data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="space-y-5">
          {(data.affirmation || data.missionExcerpt || data.week?.intention) && (
            <section className="grid gap-3 rounded-2xl border bg-card p-4 sm:p-5 md:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                {data.affirmation ? (
                  <p className="compass-text flex gap-2 italic">
                    <Quote className="mt-1 size-4 shrink-0 text-primary" />
                    {data.affirmation.text}
                  </p>
                ) : (
                  data.missionExcerpt && <p className="compass-text line-clamp-3">{data.missionExcerpt}</p>
                )}
                {data.week?.intention && (
                  <p className="text-sm text-muted-foreground">
                    This week: <span className="compass-text !text-sm italic">{data.week.intention}</span>
                  </p>
                )}
              </div>
              {data.affirmation && data.missionExcerpt && (
                <Button variant="ghost" size="sm" className="self-start" render={<Link to="/compass" />}>
                  Your mission
                </Button>
              )}
            </section>
          )}

          {!weekPlanned && date >= boot.weekStart && (
            <Banner
              title={weekStart === boot.weekStart ? "This week isn't planned yet" : "That week isn't planned yet"}
              body="Thirty minutes of weekly planning leverages the other 167 hours. Put the big rocks in first, then adapt each day."
              action={
                <Button render={<Link to="/plan/$start" params={{ start: weekStart }} />}>
                  <CalendarCheck /> Plan the week
                </Button>
              }
            />
          )}
          {weekPlanned && isToday && planningDay && nextWeekNeedsPlan && (
            <Banner
              title="It's your planning day"
              body="Close out this week and organize the next one around your roles and goals."
              action={
                <Button render={<Link to="/plan/$start" params={{ start: boot.planTarget! }} />}>
                  <CalendarCheck /> Plan next week
                </Button>
              }
            />
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="space-y-4">
              <DayTimeline
                date={date}
                isToday={isToday}
                blocks={data.blocks}
                dayStartHour={data.settings.dayStartHour}
                dayEndHour={data.settings.dayEndHour}
              />
              <CheckinsPanel checkins={data.checkins} />
              <DueSoonPanel tasks={data.dueSoon} date={date} />
            </div>
            <div className="space-y-4">
              <Priorities date={date} items={data.priorities} />
              <RocksPanel rocks={data.bigRocks} date={date} />
              <UnfinishedPanel tasks={data.unfinished} date={date} />
            </div>
          </div>

          {isFetchedAfterMount && data.challenge && <ChallengeCheckin key={`${data.challenge.id}-${date}`} challenge={data.challenge} date={date} />}
          {isFetchedAfterMount && <EveningReflection key={date} date={date} entry={data.reflection} />}
        </div>
      )}
    </Page>
  );
}

function Banner({ title, body, action }: { title: string; body: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{body}</div>
      </div>
      {action}
    </div>
  );
}
