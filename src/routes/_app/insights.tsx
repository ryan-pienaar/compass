import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { useState } from "react";
import { QUADRANTS } from "@shared/quadrant.ts";
import { useAppState } from "@/components/app-state";
import { QUADRANT_CLASSES } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { IntegrityLine, QuadrantColumns, RoleHeatmap } from "@/components/insights/charts";
import { TimeAuditTab } from "@/components/insights/time-audit";
import { UrgencyCheck } from "@/components/insights/urgency-check";
import { ChartCard, DataTable } from "@/components/insights/viz";
import { MeterSegments } from "@/components/meter";
import { Page, PageHeader, SectionHeader } from "@/components/page";
import { Row, RowTitle } from "@/components/row";
import { Segmented } from "@/components/segmented";
import { StatCell, StatStrip } from "@/components/stat";
import { CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Insights } from "@/lib/api";
import { fmtDate, hoursLabel, pct } from "@/lib/format";
import { useBootstrap } from "@/lib/hooks";
import { insightsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Tab = "overview" | "audit" | "urgency";

export const Route = createFileRoute("/_app/insights")({
  validateSearch: (search: Record<string, unknown>): { tab?: Tab } => ({
    tab: ["overview", "audit", "urgency"].includes(search.tab as string) ? (search.tab as Tab) : undefined,
  }),
  component: InsightsPage,
});

function InsightsPage() {
  const { tab = "overview" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <Page width="wide">
      <PageHeader
        habit={1}
        eyebrow="Self-awareness"
        title="Insights"
        description="Stand apart and look at your weeks: where the time went, whether the roles got their share, and how well you kept your promises."
      />
      <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v as Tab } })}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audit">Time audit</TabsTrigger>
          <TabsTrigger value="urgency">Urgency check</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Overview />
        </TabsContent>
        <TabsContent value="audit">
          <TimeAuditTab />
        </TabsContent>
        <TabsContent value="urgency">
          <UrgencyCheck />
        </TabsContent>
      </Tabs>
    </Page>
  );
}

function Overview() {
  const [range, setRange] = useState<"8" | "12" | "26">("12");
  const { data, isPlaceholderData } = useQuery({ ...insightsQuery(Number(range)), placeholderData: (prev) => prev });
  if (!data) return <OverviewSkeleton />;
  return (
    // opacity-60 marks stale data while another range loads (a loading state, not styling).
    <div className={cn("transition-opacity", isPlaceholderData && "opacity-60")}>
      <div className="mb-4 flex justify-end">
        <Segmented
          size="sm"
          aria-label="Range"
          value={range}
          onChange={setRange}
          options={[
            { value: "8", label: "8 weeks" },
            { value: "12", label: "12 weeks" },
            { value: "26", label: "26 weeks" },
          ]}
        />
      </div>
      <div className="space-y-6">
        <Kpis data={data} />
        <QuadrantColumns weeks={data.weeks} />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <IntegrityLine weeks={data.weeks} />
          <FinishedBy data={data} />
        </div>
        <RoleHeatmap weeks={data.weeks} roles={data.roles} />
      </div>
      <Drift data={data} />
    </div>
  );
}

/** The Overview's shape while the first range loads. */
function OverviewSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <Skeleton className="ml-auto h-8 w-56 max-w-full" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl max-xl:hidden" />
      </div>
    </div>
  );
}

function Kpis({ data }: { data: Insights }) {
  const weeks = data.weeks;
  const current = weeks.at(-1)!;
  const prev4 = weeks.slice(-5, -1);
  const avgPrevQ2 = prev4.length ? prev4.reduce((s, w) => s + w.byQuadrant.q2, 0) / prev4.length : 0;
  const delta = current.byQuadrant.q2 - avgPrevQ2;
  const scored = weeks.filter((w) => w.integrity != null).slice(-4);
  const avgIntegrity = scored.length ? scored.reduce((s, w) => s + (w.integrity ?? 0), 0) / scored.length : null;
  const planned = weeks.filter((w) => w.status && w.status !== "draft");
  return (
    // Two across until the content column can hold four readable cells.
    <StatStrip cols={4} className="sm:grid-cols-2 lg:grid-cols-4">
      <StatCell
        label="Quadrant II time this week"
        value={hoursLabel(current.byQuadrant.q2)}
        hint={prev4.length ? `${delta >= 0 ? "+" : "−"}${hoursLabel(Math.abs(Math.round(delta)))} vs previous 4-week average` : "Scheduled in calendar blocks"}
      />
      <StatCell
        label="Promises kept (last 4 reviews)"
        value={avgIntegrity == null ? "–" : pct(avgIntegrity)}
        hint={avgIntegrity == null ? "Review a week to see this" : "Done, or consciously set aside for a higher value"}
      />
      <StatCell label="Weeks planned" value={planned.length} unit={`of ${weeks.length}`}>
        {/* Three levels: reviewed, planned, not planned. */}
        <MeterSegments
          total={weeks.length}
          filled={planned.length}
          tone="primary"
          label="Weeks planned"
          className={cn(weeks.length > 12 && "gap-0.5")}
          // Planned lifts in dark, where 45% teal on the dark card sits too close to the empty pips.
          segmentClassName={(i) =>
            weeks[i].status === "reviewed" ? "bg-primary" : weeks[i].status === "planned" ? "bg-primary/45 dark:bg-primary/65" : "bg-muted"
          }
        />
      </StatCell>
      <StatCell label="Renewal this week" value={current.sawCovered} unit="of 4" hint="Sharpen-the-saw dimensions with a goal" />
    </StatStrip>
  );
}

function FinishedBy({ data }: { data: Insights }) {
  const c = data.completedByCreatedQuadrant;
  const keys = [1, 2, 3, 4] as const;
  const total = keys.reduce((s, q) => s + c[`q${q}`], 0) + c.none;
  const series = [
    ...keys.map((q) => ({ key: `q${q}`, label: `Q${QUADRANTS[q].numeral}`, swatch: `var(--q${q})`, fill: QUADRANT_CLASSES[q].solid, n: c[`q${q}`] })),
    { key: "none", label: "Untriaged", swatch: "var(--viz-axis)", fill: "bg-viz-axis", n: c.none },
  ];
  return (
    <ChartCard
      title="What you finished, by where it started"
      subtitle="Completed items in this period, grouped by the quadrant they were in when you captured them."
      legend={total === 0 ? undefined : series.map((s) => ({ label: s.label, swatch: s.swatch, value: s.n }))}
      table={<DataTable head={["Started in", "Completed"]} rows={series.map((s) => [s.label, s.n])} />}
      // The three counts sit under both views, and only once something has been completed.
      footer={
        total === 0 ? undefined : (
          <CardFooter className="mt-3">
            <dl className="grid w-full grid-cols-3 gap-4">
              {(
                [
                  ["Said no or delegated", data.declined],
                  ["Active stewardships", data.delegations.active],
                  ["Concerns acted on", data.concerns.acting + data.concerns.resolved],
                ] as const
              ).map(([label, n]) => (
                <div key={label} className="flex min-w-0 flex-col justify-between gap-0.5">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-base font-semibold text-foreground tabular-nums">{n}</dd>
                </div>
              ))}
            </dl>
          </CardFooter>
        )
      }
    >
      {total === 0 ? (
        <EmptyState size="compact" title="Nothing completed in this period yet." className="px-0" />
      ) : (
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden>
          {series.map((s) => (s.n ? <div key={s.key} className={s.fill} style={{ width: `${(s.n / total) * 100}%` }} /> : null))}
        </div>
      )}
    </ChartCard>
  );
}

function Drift({ data }: { data: Insights }) {
  const { openTask } = useAppState();
  const { today } = useBootstrap();
  if (data.drift.length === 0) return null;
  return (
    <section className="mt-10 max-w-3xl">
      <SectionHeader
        title="Quadrant II work that has become urgent"
        description="These started as important-but-not-urgent and are now pressing. Schedule Quadrant II work before it turns into a crisis."
      />
      <ul className="-mx-3">
        {data.drift.map((d) => (
          <Row as="li" key={d.id} divided className="before:left-3">
            <RowTitle as="button" onClick={() => openTask(d.id)}>
              {d.title}
            </RowTitle>
            {d.dueDate && (
              <span
                className={cn(
                  "flex shrink-0 items-center gap-1.5 text-xs tabular-nums [&_svg]:size-3.5",
                  d.dueDate < today ? "text-warning" : "text-muted-foreground",
                )}
              >
                <CalendarClock aria-hidden />
                {/* Past due is never colour alone: amber, the icon and "was due". */}
                {d.dueDate < today ? "was due" : "due"} {fmtDate(d.dueDate)}
              </span>
            )}
          </Row>
        ))}
      </ul>
    </section>
  );
}
