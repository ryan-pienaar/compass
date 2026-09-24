import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, ChevronLeft, ChevronRight, Hand } from "lucide-react";
import { addDaysISO, isValidISODate, weekStartFor } from "@shared/dates.ts";
import { useAppState } from "@/components/app-state";
import { Page, PageHeader } from "@/components/page";
import { Callout } from "@/components/surface";
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
      <PageHeader
        size="hero"
        eyebrow={
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous day"
              className="-ml-2"
              render={<Link to="/today" search={{ date: addDaysISO(date, -1) }} />}
            >
              <ChevronLeft />
            </Button>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">{fmtDate(date, "EEEE d MMMM")}</span>
            <Button variant="ghost" size="icon-sm" aria-label="Next day" render={<Link to="/today" search={{ date: addDaysISO(date, 1) }} />}>
              <ChevronRight />
            </Button>
            {!isToday && (
              <Button variant="link" size="inline" className="ml-1 text-xs" render={<Link to="/today" search={{}} />}>
                Back to today
              </Button>
            )}
          </>
        }
        title={isToday ? `${greeting()}${name ? `, ${name}` : ""}.` : relativeDay(date, boot.today)}
        actions={
          <Button variant="outline" onClick={() => openCapture({ mode: "interruption", scheduledDate: date })}>
            <Hand /> Something came up?
          </Button>
        }
      />

      {!data ? (
        <TodaySkeleton />
      ) : (
        <>
          {(data.affirmation || data.missionExcerpt || data.week?.intention) && (
            <section className="mb-10 grid grid-cols-1 gap-x-8 gap-y-3 border-b border-border-subtle pb-8 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0 space-y-3">
                {data.affirmation ? (
                  <p className="max-w-[65ch] voice-lg sm:-indent-3 text-foreground italic">
                    <span aria-hidden className="mr-1 font-serif text-faint-foreground">
                      “
                    </span>
                    {data.affirmation.text}
                  </p>
                ) : (
                  data.missionExcerpt && <p className="line-clamp-3 max-w-[65ch] voice text-foreground">{data.missionExcerpt}</p>
                )}
                {data.week?.intention && (
                  <p className="max-w-[65ch]">
                    <span className="mr-1.5 text-xs text-muted-foreground">This week:</span>
                    <span className="voice-sm text-foreground italic">{data.week.intention}</span>
                  </p>
                )}
              </div>
              {data.affirmation && data.missionExcerpt && (
                <Button variant="ghost" size="sm" className="-ml-3 self-start justify-self-start md:-mr-3 md:ml-0" render={<Link to="/compass" />}>
                  Your mission
                </Button>
              )}
            </section>
          )}

          <div className="space-y-10">
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

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              <div className="min-w-0 space-y-10">
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
              <div className="min-w-0 space-y-10">
                <Priorities date={date} items={data.priorities} />
                <RocksPanel rocks={data.bigRocks} date={date} />
                <UnfinishedPanel tasks={data.unfinished} date={date} />
              </div>
            </div>

            {isFetchedAfterMount && data.challenge && <ChallengeCheckin key={`${data.challenge.id}-${date}`} challenge={data.challenge} date={date} />}
            {isFetchedAfterMount && <EveningReflection key={date} date={date} entry={data.reflection} />}
          </div>
        </>
      )}
    </Page>
  );
}

/** The page's one Callout: the plan or review invitation. */
function Banner({ title, body, action }: { title: string; body: string; action: React.ReactNode }) {
  return (
    <Callout
      tone="primary"
      icon={<CalendarCheck />}
      title={title}
      action={action}
      // Below `sm` the action drops under the text (aligned with it) instead of squeezing it into a column.
      className="max-sm:[&>div:last-child]:ml-7 max-sm:[&>div:nth-child(2)]:basis-[calc(100%-1.75rem)]"
    >
      <p className="mt-0.5 max-w-[60ch]">{body}</p>
    </Callout>
  );
}

/** The shape of the page while the day loads: epigraph lines, then the 5/7 grid. */
function TodaySkeleton() {
  return (
    <div aria-hidden>
      <div className="mb-10 space-y-3 border-b border-border-subtle pb-8">
        <Skeleton className="h-6 w-full max-w-xl" />
        <Skeleton className="h-4 w-full max-w-72" />
      </div>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="min-w-0 space-y-3">
          <Skeleton className="h-6 w-28" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
        <div className="min-w-0 space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
