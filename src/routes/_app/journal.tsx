import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { NotebookPen, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { addDaysISO, localDateOf, todayISO } from "@shared/dates.ts";
import { LanguageHint } from "@/components/language-hint";
import { Page, PageHeader } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, call, type JournalEntry } from "@/lib/api";
import { fmtDate, formatWeekRange } from "@/lib/format";
import { useBootstrap } from "@/lib/hooks";
import { useApiMutation } from "@/lib/mutations";
import { journalQuery, weeksQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

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

const CHOICE_LABELS: Record<string, string> = {
  higher_value: "Someone needed me",
  crisis: "A real crisis",
  interruption: "Others' priorities",
  overplanned: "I overplanned",
  not_today: "It could wait",
  other: "Other",
};

type Filter = "all" | "daily" | "weekly" | "choice" | "note" | "exercise";

function JournalPage() {
  const { today } = useBootstrap();
  const [filter, setFilter] = useState<Filter>("all");
  const [text, setText] = useState("");
  const { data: entries = [] } = useQuery(journalQuery({ limit: 400 }));
  const { data: weeks = [] } = useQuery(weeksQuery(52));
  const add = useApiMutation(() => call(api.journal.$post({ json: { kind: "note", date: todayISO(), body: text.trim() } })), {
    success: "Noted",
    onSuccess: () => setText(""),
  });

  const reviews: JournalEntry[] = weeks
    .filter((w) => w.status === "reviewed")
    .map((w) => ({
      id: `week-${w.weekStart}`,
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

  return (
    <Page width="narrow">
      <PageHeader
        eyebrow="Habit 1 · Self-awareness"
        title="Journal"
        description="Stand apart from yourself and look: what went well, where you reacted, what you chose, what you learned. Self-awareness is where every change starts."
      />
      <section className="mb-6 space-y-2 rounded-2xl border bg-card p-4">
        <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a note to yourself…" className="compass-text" />
        <LanguageHint text={text} onChange={setText} />
        <div className="flex justify-end">
          <Button onClick={() => add.mutate(undefined)} disabled={!text.trim() || add.isPending}>
            <NotebookPen /> Save note
          </Button>
        </div>
      </section>

      {choiceCounts.length > 0 && (
        <section className="mb-6 rounded-2xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Why plans changed in the last 30 days</h2>
          <p className="mb-2 text-xs text-muted-foreground">No judgement, just awareness. People and real crises are good reasons.</p>
          <div className="flex flex-wrap gap-2">
            {choiceCounts.map(([reason, n]) => (
              <span key={reason} className={cn("rounded-full border px-3 py-1 text-sm", reason === "higher_value" && "border-primary/40 bg-primary/5")}>
                {CHOICE_LABELS[reason] ?? reason} · {n}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(
          [
            ["all", "All"],
            ["daily", "Reflections"],
            ["weekly", "Weekly reviews"],
            ["choice", "Choices"],
            ["note", "Notes"],
            ["exercise", "Exercises"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn("rounded-full border px-3 py-1 text-sm", filter === key ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}
          >
            {label}
          </button>
        ))}
      </div>

      {all.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet. Your evening reflections and weekly reviews will collect here.</p>}
      <div className="space-y-8">
        {Object.entries(byMonth).map(([month, list]) => (
          <section key={month}>
            <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{fmtDate(`${month}-01`, "MMMM yyyy")}</h2>
            <ol className="space-y-3 border-l pl-4">
              {list.map((e) => (
                <Entry key={e.id} e={e} />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </Page>
  );
}

function Entry({ e }: { e: JournalEntry }) {
  const remove = useApiMutation(() => call(api.journal[":id"].$delete({ param: { id: e.id } })), { success: "Deleted" });
  const deletable = e.kind === "note" || e.kind === "choice" || e.kind === "daily";
  const data = (e.data ?? {}) as Record<string, unknown>;
  return (
    <li className="group relative">
      <span className="absolute top-2 -left-[21px] size-2.5 rounded-full border-2 border-background bg-primary/60" />
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{fmtDate(e.date, "EEE d MMM")}</span>
        <Badge variant="outline">{KIND_LABELS[e.kind] ?? e.kind}</Badge>
        {e.kind === "choice" && typeof data.reason === "string" && <span>{CHOICE_LABELS[data.reason] ?? data.reason}</span>}
        {e.kind === "weekly" && data.rating != null && <span>rated {String(data.rating)}/5</span>}
        {e.kind === "weekly" && data.goals ? <span>· {String(data.done)}/{String(data.goals)} rocks</span> : null}
        {deletable && (
          <Button variant="ghost" size="icon-xs" className="ml-auto opacity-0 group-hover:opacity-100" onClick={() => remove.mutate(undefined)} aria-label="Delete entry">
            <Trash2 />
          </Button>
        )}
      </div>
      {e.title && <div className="mt-1 text-sm font-medium">{e.title}</div>}
      {e.body && <p className="compass-text mt-1 whitespace-pre-wrap !text-[0.95rem]">{e.body}</p>}
    </li>
  );
}
