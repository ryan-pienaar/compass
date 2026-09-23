import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { URGENCY_ITEMS, URGENCY_SCALE, urgencyBand } from "@shared/content.ts";
import { PrincipleNote } from "@/components/page";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { api, call } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { useApiMutation } from "@/lib/mutations";
import { assessmentsQuery } from "@/lib/queries";

const MAX = URGENCY_ITEMS.length * 3;

/** A short, original self-check for the pull of urgency, the thing that makes Habit 3 hard. */
export function UrgencyCheck() {
  const { data: history = [] } = useQuery(assessmentsQuery("urgency"));
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const answered = Object.keys(answers).length;
  const score = Object.values(answers).reduce((s, v) => s + v, 0);
  const band = urgencyBand(score, MAX);
  const save = useApiMutation(() => call(api.assessments.$post({ json: { kind: "urgency", answers, score } })), {
    success: "Saved. Try it again in a month or two.",
    onSuccess: () => setAnswers({}),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="compass-display text-2xl">How strong is the pull of urgency?</h2>
          <p className="text-sm text-muted-foreground">
            Urgency is addictive: it feels productive and it&apos;s rewarded. Answer honestly for a typical week.
          </p>
        </div>
        <ol className="divide-y rounded-xl border bg-card">
          {URGENCY_ITEMS.map((item, i) => (
            <li key={item} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
              <span className="max-w-xl text-sm">{item}</span>
              <Segmented
                size="sm"
                value={answers[i] != null ? String(answers[i]) : null}
                onChange={(v) => setAnswers({ ...answers, [i]: Number(v) })}
                options={URGENCY_SCALE.map((label, v) => ({ value: String(v), label }))}
              />
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <div>
            <div className="text-2xl font-semibold">
              {score}
              <span className="text-sm font-normal text-muted-foreground"> / {MAX}</span>
            </div>
            <div className="text-sm font-medium">{answered === URGENCY_ITEMS.length ? band.label : `${answered} of ${URGENCY_ITEMS.length} answered`}</div>
            {answered === URGENCY_ITEMS.length && <p className="max-w-md text-xs text-muted-foreground">{band.description}</p>}
          </div>
          <Button onClick={() => save.mutate(undefined)} disabled={answered < URGENCY_ITEMS.length || save.isPending}>
            Save result
          </Button>
        </div>
      </section>
      <aside className="space-y-3">
        <PrincipleNote>
          The cure for urgency isn&apos;t willpower; it&apos;s a bigger &ldquo;yes&rdquo;. When your mission and roles are clear, saying
          no to Quadrant III gets easier, and the time for Quadrant II comes from there.
        </PrincipleNote>
        {history.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <div className="text-sm font-semibold">Your results</div>
            <ul className="mt-2 space-y-1.5 text-sm">
              {history.slice(0, 8).map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{fmtDate(h.createdAt, "d MMM yyyy")}</span>
                  <span className="tabular-nums">
                    {h.score}/{MAX} · {urgencyBand(h.score ?? 0, MAX).label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
