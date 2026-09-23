import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, History, ListPlus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { FUNERAL_EXERCISE, MISSION_GUIDANCE } from "@shared/content.ts";
import { localDateOf } from "@shared/dates.ts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, call, type MissionVersion } from "@/lib/api";
import { fmtDate, relativeDay } from "@/lib/format";
import { useAutosave, useBootstrap } from "@/lib/hooks";
import { useApiMutation } from "@/lib/mutations";
import { missionQuery } from "@/lib/queries";
import { useSingletonEntry } from "./journal-singleton";

export function MissionTab() {
  // The editor copies the text once, so it must start from a fetch made after mount, not a cache that predates a save.
  const { data, isFetchedAfterMount } = useQuery(missionQuery());
  if (!data || !isFetchedAfterMount) return <Skeleton className="h-96" />;
  return <MissionEditor key={data.mission.id} initial={data.mission.content} reviewedAt={data.mission.reviewedAt} versions={data.versions} />;
}

function MissionEditor({ initial, reviewedAt, versions }: { initial: string; reviewedAt: string | null; versions: MissionVersion[] }) {
  const { roles, today } = useBootstrap();
  const [content, setContent] = useState(initial);
  const [viewing, setViewing] = useState<MissionVersion | null>(null);
  const save = useApiMutation((c: string) => call(api.mission.$put({ json: { content: c } })));
  const pending = useAutosave(content, (c) => save.mutate(c), 1000);
  const review = useApiMutation(() => call(api.mission.review.$post()), { success: "Marked as reviewed" });
  const restore = useApiMutation((id: string) => call(api.mission.versions[":id"].restore.$post({ param: { id } })), {
    success: "Version restored",
    onSuccess: (res) => {
      setContent(res.mission.content);
      setViewing(null);
    },
  });
  const tribute = useSingletonEntry("tribute");
  const reviewedDaysAgo = reviewedAt ? Math.round((Date.parse(today) - Date.parse(localDateOf(reviewedAt))) / 86_400_000) : null;

  const insertOutline = () => {
    const lines = roles.filter((r) => !r.isSaw).map((r) => `As ${/^[aeiou]/i.test(r.name) ? "an" : "a"} ${r.name.toLowerCase()}, I `);
    setContent((c) => `${c.trimEnd()}${c.trim() ? "\n\n" : ""}${lines.join("\n")}`);
  };

  const tributeData = (tribute.entry?.data ?? {}) as Record<string, Record<string, string>>;
  const tributeLines = FUNERAL_EXERCISE.speakers.flatMap((s) =>
    FUNERAL_EXERCISE.lenses.map((l) => tributeData[s.key]?.[l.key]).filter((x): x is string => !!x?.trim()),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Your personal constitution: what you want to be, what you want to do, and the principles underneath.
          </p>
          <Button variant="outline" size="sm" onClick={insertOutline}>
            <ListPlus /> Insert role outline
          </Button>
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="compass-text min-h-[55vh] rounded-2xl bg-card p-5 !text-lg leading-8 sm:p-7"
          placeholder={"I want to be…\n\nI want to contribute…\n\nThe principles I live by…"}
          aria-label="Mission statement"
        />
        <div className="text-xs text-muted-foreground">
          {pending ? "Saving…" : save.isSuccess ? "Saved. Today's edits become today's version." : "Autosaves as you write."}
        </div>
      </div>
      <aside className="space-y-4">
        <section className="rounded-xl border bg-card p-4">
          <div className="text-sm font-semibold">Review</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {reviewedDaysAgo == null
              ? "Not reviewed yet."
              : reviewedDaysAgo === 0
                ? "Reviewed today."
                : `Last reviewed ${reviewedDaysAgo} day${reviewedDaysAgo === 1 ? "" : "s"} ago.`}{" "}
            Reading it during weekly planning counts.
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => review.mutate(undefined)}>
            <CheckCircle2 /> Mark as reviewed
          </Button>
        </section>
        <section className="rounded-xl border bg-card p-4">
          <div className="text-sm font-semibold">Writing it</div>
          <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
            {MISSION_GUIDANCE.map((g) => (
              <li key={g}>· {g}</li>
            ))}
          </ul>
        </section>
        {tributeLines.length > 0 && (
          <section className="rounded-xl border bg-card p-4">
            <div className="text-sm font-semibold">Raw material from your tribute exercise</div>
            <ul className="compass-text mt-2 max-h-56 space-y-1 overflow-y-auto !text-sm text-muted-foreground">
              {tributeLines.map((l, i) => (
                <li key={i}>&ldquo;{l}&rdquo;</li>
              ))}
            </ul>
          </section>
        )}
        <section className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <History className="size-4" /> Versions
          </div>
          {versions.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Each day you edit it becomes a version.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {versions.map((v) => (
                <li key={v.id}>
                  <button type="button" onClick={() => setViewing(v)} className="w-full rounded-md px-2 py-1 text-left text-sm hover:bg-muted">
                    <span className="font-medium">{relativeDay(localDateOf(v.createdAt), today)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{v.note || v.content.split("\n")[0] || "(empty)"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-2xl">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>Version from {fmtDate(viewing.createdAt, "d MMMM yyyy")}</DialogTitle>
                <DialogDescription>{viewing.note || "Your mission as it stood that day."}</DialogDescription>
              </DialogHeader>
              <div className="compass-text max-h-[55vh] overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-4">{viewing.content}</div>
              <DialogFooter>
                <Button variant="outline" onClick={() => restore.mutate(viewing.id)} disabled={restore.isPending}>
                  <RotateCcw /> Restore this version
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
