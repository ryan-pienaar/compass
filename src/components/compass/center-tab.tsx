import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CENTERS, LIFE_SUPPORT_FACTORS } from "@shared/content.ts";
import { MeterSegments } from "@/components/meter";
import { PrincipleNote, RailSection, WithRail } from "@/components/page";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, call } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { useApiMutation } from "@/lib/mutations";
import { assessmentsQuery } from "@/lib/queries";

const SCALE = ["0", "1", "2", "3"] as const;

/**
 * Whatever sits at the center of your life becomes your source of security,
 * guidance, wisdom and power. This is a private, honest look at yours.
 */
export function CenterTab() {
  const { data: history = [] } = useQuery(assessmentsQuery("center"));
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const save = useApiMutation(
    () =>
      call(
        api.assessments.$post({
          json: {
            kind: "center",
            answers: scores,
            score: scores.principles ?? null,
            notes: LIFE_SUPPORT_FACTORS.map((f) => (notes[f.key] ? `${f.label}: ${notes[f.key]}` : "")).filter(Boolean).join("\n"),
          },
        }),
      ),
    { success: "Saved. Revisit it in a few months." },
  );
  const latest = history[0];
  const ranked = latest
    ? CENTERS.map((c) => ({ ...c, score: latest.answers[c.key] ?? 0 })).sort((a, b) => b.score - a.score)
    : [];

  const rail = (
    <>
      <PrincipleNote>
        Centers built on people, money, work, possessions or pleasure move when they move. Principles don&apos;t: they give a
        stable place to stand, and they put every other center in perspective.
      </PrincipleNote>
      {latest && (
        <RailSection
          title={
            <>
              Last time <span className="font-normal text-muted-foreground tabular-nums">· {fmtDate(latest.createdAt, "d MMM yyyy")}</span>
            </>
          }
        >
          {/* Principles is the one center to steer by: it alone takes ink and teal; every other center stays neutral. */}
          <ul className="space-y-2.5">
            {ranked.slice(0, 5).map((c) => {
              const principles = c.key === "principles";
              return (
                <li key={c.key} className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] items-center gap-3 text-xs">
                  <span className={principles ? "font-medium text-foreground" : "text-muted-foreground"}>{c.label}</span>
                  <MeterSegments
                    total={3}
                    filled={c.score}
                    tone="primary"
                    label={c.label}
                    segmentClassName={(_, isFilled) => isFilled && !principles && "bg-control"}
                  />
                </li>
              );
            })}
          </ul>
          {latest.notes && <p className="mt-4 text-xs whitespace-pre-wrap text-muted-foreground">{latest.notes}</p>}
        </RailSection>
      )}
    </>
  );

  return (
    <WithRail rail={rail}>
      <div className="space-y-8">
        <header className="space-y-2">
          <h2 className="voice-display text-2xl text-foreground">What&apos;s at your center?</h2>
          <p className="max-w-[60ch] text-sm text-muted-foreground">
            For each, how strongly does it drive your sense of worth and your day-to-day decisions? 0 = not at all, 3 = a lot. Most
            of us have a mix. Be honest; nobody else sees this.
          </p>
        </header>
        <Card variant="flush">
          <ul className="divide-y divide-border-subtle">
            {CENTERS.map((c) => (
              <li key={c.key} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 max-sm:px-4">
                <div className="min-w-0 flex-1 basis-60">
                  <div className="text-sm font-medium text-foreground">{c.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{c.note}</div>
                </div>
                <Segmented
                  aria-label={`${c.label}: from 0, not at all, to 3, a lot`}
                  value={scores[c.key] != null ? String(scores[c.key]) : null}
                  onChange={(v) => setScores({ ...scores, [c.key]: Number(v) })}
                  options={SCALE.map((s) => ({ value: s, label: s, className: "tabular-nums pointer-coarse:min-w-11" }))}
                />
              </li>
            ))}
          </ul>
        </Card>
        {/* Each note spans two rows of a shared grid (subgrid), so the fields line up across columns whatever the prompt's length. */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          {LIFE_SUPPORT_FACTORS.map((f) => (
            <div key={f.key} className="grid content-start gap-1.5 sm:row-span-2 sm:grid-rows-subgrid">
              <Label htmlFor={`center-note-${f.key}`} className="block self-end">
                {f.label}: <span className="font-normal text-muted-foreground">{f.prompt}</span>
              </Label>
              <Textarea id={`center-note-${f.key}`} rows={2} value={notes[f.key] ?? ""} onChange={(e) => setNotes({ ...notes, [f.key]: e.target.value })} />
            </div>
          ))}
        </div>
        <Button onClick={() => save.mutate(undefined)} disabled={Object.keys(scores).length < 3 || save.isPending} pending={save.isPending}>
          Save reflection
        </Button>
      </div>
    </WithRail>
  );
}
