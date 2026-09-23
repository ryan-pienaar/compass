import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CENTERS, LIFE_SUPPORT_FACTORS } from "@shared/content.ts";
import { PrincipleNote } from "@/components/page";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, call } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { useApiMutation } from "@/lib/mutations";
import { assessmentsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="compass-display text-2xl">What&apos;s at your center?</h2>
          <p className="text-sm text-muted-foreground">
            For each, how strongly does it drive your sense of worth and your day-to-day decisions? 0 = not at all, 3 = a lot. Most
            of us have a mix. Be honest; nobody else sees this.
          </p>
        </div>
        <ul className="divide-y rounded-xl border bg-card">
          {CENTERS.map((c) => (
            <li key={c.key} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <div className={cn("text-sm font-medium", c.key === "principles" && "text-primary")}>{c.label}</div>
                <div className="text-xs text-muted-foreground">{c.note}</div>
              </div>
              <Segmented
                size="sm"
                value={scores[c.key] != null ? String(scores[c.key]) : null}
                onChange={(v) => setScores({ ...scores, [c.key]: Number(v) })}
                options={SCALE.map((s) => ({ value: s, label: s }))}
              />
            </li>
          ))}
        </ul>
        <div className="grid gap-3 sm:grid-cols-2">
          {LIFE_SUPPORT_FACTORS.map((f) => (
            <div key={f.key} className="grid gap-1.5">
              <Label className="text-sm">
                {f.label}: <span className="font-normal text-muted-foreground">{f.prompt}</span>
              </Label>
              <Textarea rows={2} value={notes[f.key] ?? ""} onChange={(e) => setNotes({ ...notes, [f.key]: e.target.value })} className="!text-sm" />
            </div>
          ))}
        </div>
        <Button onClick={() => save.mutate(undefined)} disabled={Object.keys(scores).length < 3 || save.isPending}>
          Save reflection
        </Button>
      </section>
      <aside className="space-y-3">
        <PrincipleNote>
          Centers built on people, money, work, possessions or pleasure move when they move. Principles don&apos;t: they give a
          stable place to stand, and they put every other center in perspective.
        </PrincipleNote>
        {latest && (
          <div className="rounded-xl border bg-card p-4">
            <div className="text-sm font-semibold">Last time ({fmtDate(latest.createdAt, "d MMM yyyy")})</div>
            <ul className="mt-2 space-y-1.5">
              {ranked.slice(0, 5).map((c) => (
                <li key={c.key} className="grid grid-cols-[8rem_1fr] items-center gap-2 text-xs">
                  <span className="truncate">{c.label}</span>
                  <span className="h-2 rounded-full bg-muted">
                    <span className={cn("block h-2 rounded-full", c.key === "principles" ? "bg-primary" : "bg-foreground/40")} style={{ width: `${(c.score / 3) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
            {latest.notes && <p className="mt-3 text-xs whitespace-pre-wrap text-muted-foreground">{latest.notes}</p>}
          </div>
        )}
      </aside>
    </div>
  );
}
