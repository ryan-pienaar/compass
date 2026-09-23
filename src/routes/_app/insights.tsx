import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { QUADRANTS } from "@shared/quadrant.ts";
import { useAppState } from "@/components/app-state";
import { QUADRANT_CLASSES } from "@/components/badges";
import { IntegrityLine, QuadrantColumns, RoleHeatmap } from "@/components/insights/charts";
import { TimeAuditTab } from "@/components/insights/time-audit";
import { UrgencyCheck } from "@/components/insights/urgency-check";
import { StatTile } from "@/components/insights/viz";
import { Page, PageHeader } from "@/components/page";
import { Segmented } from "@/components/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Insights } from "@/lib/api";
import { hoursLabel, pct } from "@/lib/format";
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
        <TabsContent value="overview" className="pt-4">
          <Overview />
        </TabsContent>
        <TabsContent value="audit" className="pt-4">
          <TimeAuditTab />
        </TabsContent>
        <TabsContent value="urgency" className="pt-4">
          <UrgencyCheck />
        </TabsContent>
      </Tabs>
    </Page>
  );
}

function Overview() {
  const [range, setRange] = useState<"8" | "12" | "26">("12");
  const { data, isPlaceholderData } = useQuery({ ...insightsQuery(Number(range)), placeholderData: (prev) => prev });
  if (!data) return <Skeleton className="h-96" />;
  return (
    <div className={cn("space-y-4 transition-opacity", isPlaceholderData && "opacity-60")}>
      <div className="flex items-center justify-end">
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
      <Kpis data={data} />
      <QuadrantColumns weeks={data.weeks} />
      <div className="grid gap-4 xl:grid-cols-2">
        <IntegrityLine weeks={data.weeks} />
        <FinishedBy data={data} />
      </div>
      <RoleHeatmap weeks={data.weeks} roles={data.roles} />
      <Drift data={data} />
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
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        label="Quadrant II time this week"
        value={hoursLabel(current.byQuadrant.q2)}
        sub={prev4.length ? `${delta >= 0 ? "+" : "−"}${hoursLabel(Math.abs(Math.round(delta)))} vs previous 4-week average` : "Scheduled in calendar blocks"}
      />
      <StatTile
        label="Promises kept (last 4 reviews)"
        value={avgIntegrity == null ? "–" : pct(avgIntegrity)}
        sub={avgIntegrity == null ? "Review a week to see this" : "Done, or consciously set aside for a higher value"}
      />
      <StatTile label="Weeks planned" value={`${planned.length} of ${weeks.length}`}>
        <div className="mt-2 flex gap-1" aria-hidden>
          {weeks.map((w) => (
            <span
              key={w.weekStart}
              className={cn("h-2 flex-1 rounded-full", w.status === "reviewed" ? "bg-primary" : w.status === "planned" ? "bg-primary/50" : "bg-muted")}
            />
          ))}
        </div>
      </StatTile>
      <StatTile label="Renewal this week" value={`${current.sawCovered} of 4`} sub="Sharpen-the-saw dimensions with a goal" />
    </div>
  );
}

function FinishedBy({ data }: { data: Insights }) {
  const c = data.completedByCreatedQuadrant;
  const keys = [1, 2, 3, 4] as const;
  const total = keys.reduce((s, q) => s + c[`q${q}`], 0) + c.none;
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="text-sm font-semibold">What you finished, by where it started</h2>
      <p className="mb-3 text-xs text-muted-foreground">Completed items in this period, grouped by the quadrant they were in when you captured them.</p>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing completed in this period yet.</p>
      ) : (
        <>
          <div className="flex h-4 gap-0.5 overflow-hidden rounded-md" aria-hidden>
            {keys.map((q) =>
              c[`q${q}`] ? <div key={q} className={QUADRANT_CLASSES[q].solid} style={{ width: `${(c[`q${q}`] / total) * 100}%` }} /> : null,
            )}
            {c.none ? <div className="bg-viz-axis" style={{ width: `${(c.none / total) * 100}%` }} /> : null}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
            {keys.map((q) => (
              <li key={q} className="flex items-center gap-1.5">
                <span aria-hidden className={cn("size-2.5 rounded-sm", QUADRANT_CLASSES[q].solid)} />
                Q{QUADRANTS[q].numeral} <span className="text-muted-foreground tabular-nums">{c[`q${q}`]}</span>
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-sm bg-viz-axis" /> Untriaged <span className="text-muted-foreground tabular-nums">{c.none}</span>
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Said no or delegated: <span className="font-medium text-foreground">{data.declined}</span> · Active stewardships:{" "}
            <span className="font-medium text-foreground">{data.delegations.active}</span> · Concerns acted on:{" "}
            <span className="font-medium text-foreground">{data.concerns.acting + data.concerns.resolved}</span>
          </p>
        </>
      )}
    </section>
  );
}

function Drift({ data }: { data: Insights }) {
  const { openTask } = useAppState();
  if (data.drift.length === 0) return null;
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="text-sm font-semibold">Quadrant II work that has become urgent</h2>
      <p className="mb-2 text-xs text-muted-foreground">
        These started as important-but-not-urgent and are now pressing. Schedule Quadrant II work before it turns into a crisis.
      </p>
      <ul className="space-y-1 text-sm">
        {data.drift.map((d) => (
          <li key={d.id}>
            <button type="button" onClick={() => openTask(d.id)} className="hover:underline">
              {d.title}
            </button>
            {d.dueDate && <span className="text-muted-foreground"> · due {d.dueDate}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
