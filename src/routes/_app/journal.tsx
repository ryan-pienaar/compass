import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, CircleCheck, Compass as CompassIcon, Moon, NotebookPen, Scale, Trash2 } from "lucide-react";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { addDaysISO, localDateOf, todayISO } from "@shared/dates.ts";
import { ChoiceChip, Chip } from "@/components/chip";
import { EmptyState } from "@/components/empty-state";
import { IconButton } from "@/components/icon-button";
import { LanguageHint } from "@/components/language-hint";
import { Page, PageHeader, SectionHeader } from "@/components/page";
import { MetaSep, RowActions } from "@/components/row";
import { MetaLine } from "@/components/task-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, call, type JournalEntry } from "@/lib/api";
import { fmtDate, formatWeekRange } from "@/lib/format";
import { useBootstrap } from "@/lib/hooks";
import { useApiMutation } from "@/lib/mutations";
import { journalQuery, weeksQuery } from "@/lib/queries";

export const Route = createFileRoute("/_app/journal")({
  component: JournalPage,
});

const KIND_LABELS: Record<string, string> = {
  daily: "Evening reflection",
  choice: "Moment of choice",
  note: "Note",
  tribute: "Tribute exercise",
  freewrite: "Free-write",
  mission_q: "Mission questions",
  weekly: "Weekly review",
};

/** The pebble on the timeline rail for each kind (DESIGN.md §5). */
const KIND_ICONS: Record<string, ReactNode> = {
  daily: <Moon />,
  weekly: <CalendarCheck />,
  choice: <Scale />,
  note: <NotebookPen />,
  tribute: <CompassIcon />,
  freewrite: <CompassIcon />,
  mission_q: <CompassIcon />,
};

const CHOICE_LABELS: Record<string, string> = {
  higher_value: "Someone needed me",
  crisis: "A real crisis",
  interruption: "Others' priorities",
  overplanned: "I overplanned",
  not_today: "It could wait",
  other: "Other",
};

type Filter = "all" | "daily" | "weekly" | "choice" | "note" | "exercise";

const FILTERS: readonly (readonly [Filter, string])[] = [
  ["all", "All"],
  ["daily", "Reflections"],
  ["weekly", "Weekly reviews"],
  ["choice", "Choices"],
  ["note", "Notes"],
  ["exercise", "Exercises"],
];

function JournalPage() {
  const { today } = useBootstrap();
  const [filter, setFilter] = useState<Filter>("all");
  const [text, setText] = useState("");
  const { data: entries = [], isPending: entriesPending } = useQuery(journalQuery({ limit: 400 }));
  const { data: weeks = [], isPending: weeksPending } = useQuery(weeksQuery(52));
  const add = useApiMutation(() => call(api.journal.$post({ json: { kind: "note", date: todayISO(), body: text.trim() } })), {
    success: "Noted",
    onSuccess: () => setText(""),
  });

  const reviews: JournalEntry[] = weeks
    .filter((w) => w.status === "reviewed")
    .map((w) => ({
      id: `week-${w.weekStart}`,
      userId: "",
      date: w.reviewedAt ? localDateOf(w.reviewedAt) : w.weekStart,
      kind: "weekly",
      title: `Week of ${formatWeekRange(w.weekStart)}`,
      body: [w.wins && `Wins:\n${w.wins}`, w.lessons && `Lesson: ${w.lessons}`].filter(Boolean).join("\n\n"),
      data: { rating: w.rating, score: w.score, done: w.done, goals: w.goals },
      weekId: null,
      createdAt: w.reviewedAt ?? w.weekStart,
      updatedAt: w.reviewedAt ?? w.weekStart,
    }));

  const all = useMemo(
    () =>
      [...entries.filter((e) => e.kind !== "resource" && (e.body.trim() || e.title)), ...reviews]
        .filter((e) => {
          if (filter === "all") return true;
          if (filter === "exercise") return ["tribute", "freewrite", "mission_q"].includes(e.kind);
          return e.kind === filter;
        })
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [entries, reviews, filter],
  );

  const since = addDaysISO(today, -30);
  const choices = entries.filter((e) => e.kind === "choice" && e.date >= since);
  const choiceCounts = Object.entries(
    choices.reduce<Record<string, number>>((acc, e) => {
      const r = String((e.data as { reason?: string } | null)?.reason ?? "other");
      acc[r] = (acc[r] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const byMonth = all.reduce<Record<string, JournalEntry[]>>((acc, e) => {
    const key = e.date.slice(0, 7);
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  const loading = entriesPending || weeksPending;

  return (
    <Page width="narrow">
      <PageHeader
        habit={1}
        eyebrow="Self-awareness"
        title="Journal"
        description="Stand apart from yourself and look: what went well, where you reacted, what you chose, what you learned. Self-awareness is where every change starts."
      />
      <div className="space-y-10">
        <Card className="gap-3">
          <Textarea
            variant="ghost"
            voice="md"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a note to yourself…"
            aria-label="Note to yourself"
            className="min-h-24"
          />
          <div className="flex flex-wrap items-end gap-3">
            <LanguageHint text={text} onChange={setText} className="min-w-0 flex-1 basis-64" />
            <Button size="sm" className="ml-auto" onClick={() => add.mutate(undefined)} disabled={!text.trim() || add.isPending} pending={add.isPending}>
              <NotebookPen /> Save note
            </Button>
          </div>
        </Card>

        {choiceCounts.length > 0 && (
          <section>
            <SectionHeader
              title="Why plans changed in the last 30 days"
              description="No judgement, just awareness. People and real crises are good reasons."
            />
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              {choiceCounts.map(([reason, n], i) => (
                <Fragment key={reason}>
                  {i > 0 && <MetaSep />}
                  <span className="inline-flex items-center gap-1.5">
                    {reason === "higher_value" && <CircleCheck aria-hidden className="size-3.5 shrink-0 text-success" />}
                    {CHOICE_LABELS[reason] ?? reason}
                    <span className="font-semibold text-foreground tabular-nums">{n}</span>
                  </span>
                </Fragment>
              ))}
            </p>
          </section>
        )}

        <section>
          <div role="group" aria-label="Filter entries" className="-m-1 mb-5 flex scroll-fade-x gap-2 overflow-x-auto p-1 no-scrollbar sm:flex-wrap">
            {FILTERS.map(([key, label]) => (
              <ChoiceChip key={key} selection="single" pressed={filter === key} onClick={() => setFilter(key)}>
                {label}
              </ChoiceChip>
            ))}
          </div>

          {all.length === 0 ? (
            loading ? (
              <TimelineSkeleton />
            ) : (
              <EmptyState icon={<NotebookPen />} title="Nothing yet" description="Your evening reflections and weekly reviews will collect here." />
            )
          ) : (
            <div className="space-y-6">
              {Object.entries(byMonth).map(([month, list]) => (
                <section key={month}>
                  <h2 className="sticky top-12 z-10 -mx-2 bg-background/90 px-2 py-2 voice-display text-xl text-foreground backdrop-blur-md">
                    {fmtDate(`${month}-01`, "MMMM yyyy")}
                  </h2>
                  <ol className="mt-2 space-y-4">
                    {list.map((e) => (
                      <Entry key={e.id} e={e} />
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </section>
      </div>
    </Page>
  );
}

function TimelineSkeleton() {
  return (
    <div aria-busy className="space-y-6">
      <Skeleton className="h-7 w-40" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-4">
          <Skeleton className="size-6 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Entry({ e }: { e: JournalEntry }) {
  const remove = useApiMutation(() => call(api.journal[":id"].$delete({ param: { id: e.id } })), { success: "Deleted" });
  const deletable = e.kind === "note" || e.kind === "choice" || e.kind === "daily";
  const data = (e.data ?? {}) as Record<string, unknown>;
  return (
    <li className="group/row grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-4">
      {/* The rail runs from under this pebble to the next one; the last entry of a month ends it. */}
      <div className="relative flex justify-center before:absolute before:top-7 before:-bottom-4 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border-subtle group-last/row:before:hidden">
        <span
          aria-hidden
          className="grid size-6 place-items-center rounded-full bg-card ring-1 ring-edge [&_svg]:size-3.5 [&_svg]:text-muted-foreground"
        >
          {KIND_ICONS[e.kind] ?? <NotebookPen />}
        </span>
      </div>
      <div className="min-w-0 pb-1">
        {/* Top-aligned, so the delete action stays on the first meta line when the meta wraps. */}
        <div className="flex min-h-6 items-start gap-x-1.5">
          {/* MetaLine clips the separator that would lead a wrapped line, so none dangles on a phone. */}
          <MetaLine
            className="mt-0 min-h-6 flex-1"
            items={[
              {
                key: "date",
                node: (
                  <time dateTime={e.date} className="tabular-nums">
                    {fmtDate(e.date, "EEE d MMM")}
                  </time>
                ),
              },
              {
                key: "kind",
                node: (
                  <Chip size="sm" tone="outline">
                    {KIND_LABELS[e.kind] ?? e.kind}
                  </Chip>
                ),
              },
              e.kind === "choice" &&
                typeof data.reason === "string" && { key: "reason", node: <span>{CHOICE_LABELS[data.reason] ?? data.reason}</span> },
              e.kind === "weekly" &&
                data.rating != null && { key: "rating", node: <span className="tabular-nums">rated {String(data.rating)}/5</span> },
              e.kind === "weekly" &&
                !!data.goals && {
                  key: "rocks",
                  node: (
                    <span className="tabular-nums">
                      {String(data.done)}/{String(data.goals)} rocks
                    </span>
                  ),
                },
            ]}
          />
          {deletable && (
            <RowActions className="-my-1 ml-auto">
              <IconButton label="Delete entry" icon={<Trash2 />} size="icon-xs" onClick={() => remove.mutate(undefined)} />
            </RowActions>
          )}
        </div>
        {e.title && <p className="mt-1 text-sm font-medium text-foreground">{e.title}</p>}
        {e.body && <p className="mt-1 max-w-[65ch] voice-sm whitespace-pre-wrap text-foreground">{e.body}</p>}
      </div>
    </li>
  );
}
