import { useQuery } from "@tanstack/react-query";
import { BookOpen, CircleCheck, Compass, History, ListPlus, PenLine, RotateCcw } from "lucide-react";
import { useState } from "react";
import { FUNERAL_EXERCISE, MISSION_GUIDANCE } from "@shared/content.ts";
import { localDateOf } from "@shared/dates.ts";
import { RailSection, WithRail } from "@/components/page";
import { Row, RowTitle } from "@/components/row";
import { SaveStatus } from "@/components/save-status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, call, type MissionVersion } from "@/lib/api";
import { fmtDate, relativeDay } from "@/lib/format";
import { useAutosave, useBootstrap } from "@/lib/hooks";
import { useApiMutation } from "@/lib/mutations";
import { missionQuery } from "@/lib/queries";
import { useSingletonEntry } from "./journal-singleton";

const LEDE = "Your personal constitution: what you want to be, what you want to do, and the principles underneath.";

export function MissionTab() {
  // The editor copies the text once, so it must start from a fetch made after mount, not a cache that predates a save.
  const { data, isFetchedAfterMount } = useQuery(missionQuery());
  if (!data || !isFetchedAfterMount) return <MissionSkeleton />;
  return <MissionEditor key={data.mission.id} initial={data.mission.content} reviewedAt={data.mission.reviewedAt} versions={data.versions} />;
}

/** The editor's shape while the mission loads: the lede, the sheet and the rail. */
function MissionSkeleton() {
  return (
    <WithRail
      rail={[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    >
      <p className="mb-4 max-w-[60ch] text-sm text-muted-foreground">{LEDE}</p>
      <Skeleton className="h-[60vh] rounded-xl" />
    </WithRail>
  );
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

  const rail = (
    <>
      <RailSection title="Review" icon={<BookOpen />}>
        <p className="text-muted-foreground">
          {reviewedDaysAgo == null
            ? "Not reviewed yet."
            : reviewedDaysAgo === 0
              ? "Reviewed today."
              : `Last reviewed ${reviewedDaysAgo} day${reviewedDaysAgo === 1 ? "" : "s"} ago.`}{" "}
          Reading it during weekly planning counts.
        </p>
        <Button variant="outline" size="sm" className="mt-3" pending={review.isPending} onClick={() => review.mutate(undefined)}>
          <CircleCheck /> Mark as reviewed
        </Button>
      </RailSection>
      <RailSection title="Writing it" icon={<PenLine />}>
        <ul className="list-disc space-y-1.5 pl-4 text-muted-foreground marker:text-faint-foreground">
          {MISSION_GUIDANCE.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </RailSection>
      {tributeLines.length > 0 && (
        <RailSection title="Raw material from your tribute exercise" icon={<Compass />}>
          <ul className="voice-sm max-h-56 space-y-2 overflow-y-auto text-muted-foreground">
            {tributeLines.map((l, i) => (
              <li key={i}>&ldquo;{l}&rdquo;</li>
            ))}
          </ul>
        </RailSection>
      )}
      <RailSection title="Versions" icon={<History />}>
        {versions.length === 0 ? (
          <p className="text-muted-foreground">Each day you edit it becomes a version.</p>
        ) : (
          <ul className="-mx-3">
            {versions.map((v) => (
              <li key={v.id}>
                <Row as="button" onClick={() => setViewing(v)}>
                  <RowTitle>{v.note || v.content.split("\n")[0] || "(empty)"}</RowTitle>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{relativeDay(localDateOf(v.createdAt), today)}</span>
                </Row>
              </li>
            ))}
          </ul>
        )}
      </RailSection>
    </>
  );

  return (
    <WithRail rail={rail}>
      <p className="mb-4 max-w-[60ch] text-sm text-muted-foreground">{LEDE}</p>
      <Card
        variant="flush"
        className="has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-offset-2 has-[textarea:focus-visible]:outline-ring"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-5 py-2.5 max-sm:px-4">
          <SaveStatus
            saving={pending || save.isPending}
            label={save.isSuccess ? "Saved. Today's edits become today's version." : "Autosaves as you write."}
            className="min-w-0"
          />
          <Button variant="ghost" size="sm" className="-mr-2" onClick={insertOutline}>
            <ListPlus /> Insert role outline
          </Button>
        </div>
        <Textarea
          variant="paper"
          voice="lg"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mx-auto block w-full max-w-[65ch] px-6 py-8 sm:px-12 sm:py-10"
          placeholder={"I want to be…\n\nI want to contribute…\n\nThe principles I live by…"}
          aria-label="Mission statement"
        />
      </Card>
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent size="xl">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>Version from {fmtDate(viewing.createdAt, "d MMMM yyyy")}</DialogTitle>
                <DialogDescription>{viewing.note || "Your mission as it stood that day."}</DialogDescription>
              </DialogHeader>
              <div className="voice max-h-[55vh] overflow-y-auto rounded-lg bg-muted p-4 whitespace-pre-wrap">{viewing.content}</div>
              <DialogFooter>
                <Button variant="outline" onClick={() => restore.mutate(viewing.id)} disabled={restore.isPending} pending={restore.isPending}>
                  <RotateCcw /> Restore this version
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </WithRail>
  );
}
