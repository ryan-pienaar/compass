import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { URGENCY_ITEMS, URGENCY_SCALE, urgencyBand } from "@shared/content.ts";
import { Meter } from "@/components/meter";
import { PrincipleNote, RailSection, WithRail } from "@/components/page";
import { Segmented } from "@/components/segmented";
import { StatCell } from "@/components/stat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api, call } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { useApiMutation } from "@/lib/mutations";
import { assessmentsQuery } from "@/lib/queries";

const MAX = URGENCY_ITEMS.length * 3;

/** A short, original self-check for the pull of urgency, the thing that makes Habit 3 hard. */
export function UrgencyCheck() {
  const uid = useId();
  const { data: history = [] } = useQuery(assessmentsQuery("urgency"));
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const answered = Object.keys(answers).length;
  const score = Object.values(answers).reduce((s, v) => s + v, 0);
  const band = urgencyBand(score, MAX);
  const complete = answered === URGENCY_ITEMS.length;
  const save = useApiMutation(() => call(api.assessments.$post({ json: { kind: "urgency", answers, score } })), {
    success: "Saved. Try it again in a month or two.",
    onSuccess: () => setAnswers({}),
  });

  return (
    <WithRail
      rail={
        <>
          <PrincipleNote>
            The cure for urgency isn&apos;t willpower; it&apos;s a bigger &ldquo;yes&rdquo;. When your mission and roles are clear, saying
            no to Quadrant III gets easier, and the time for Quadrant II comes from there.
          </PrincipleNote>
          {history.length > 0 && (
            <RailSection title="Your results">
              <ul className="divide-y divide-border-subtle">
                {history.slice(0, 8).map((h) => (
                  <li key={h.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 text-foreground">{urgencyBand(h.score ?? 0, MAX).label}</span>
                      <span className="shrink-0 font-medium text-foreground tabular-nums">
                        {h.score}
                        <span className="font-normal text-muted-foreground">/{MAX}</span>
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">{fmtDate(h.createdAt, "d MMM yyyy")}</div>
                  </li>
                ))}
              </ul>
            </RailSection>
          )}
        </>
      }
    >
      <section>
        <h2 className="voice-display text-2xl text-foreground">How strong is the pull of urgency?</h2>
        <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
          Urgency is addictive: it feels productive and it&apos;s rewarded. Answer honestly for a typical week.
        </p>
        {/* The Your center scale recipe: the answer sits beside its statement and wraps under it when it can't fit. */}
        <Card variant="flush" render={<ol />} className="mt-6 divide-y divide-border-subtle">
          {URGENCY_ITEMS.map((item, i) => (
            <li key={item} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 max-sm:px-4">
              <span id={`${uid}-item-${i}`} className="min-w-0 flex-1 basis-[28ch] text-sm text-foreground">
                {item}
              </span>
              {/* Full width on a phone, so each answer is a wide target. */}
              <Segmented
                aria-labelledby={`${uid}-item-${i}`}
                value={answers[i] != null ? String(answers[i]) : null}
                onChange={(v) => setAnswers({ ...answers, [i]: Number(v) })}
                options={URGENCY_SCALE.map((label, v) => ({ value: String(v), label, className: "max-sm:flex-1 max-sm:px-2" }))}
                className="max-sm:w-full"
              />
            </li>
          ))}
        </Card>
        <div className="mt-6 grid grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <StatCell
            standalone
            label="Your score"
            value={score}
            unit={`/ ${MAX}`}
            hint={complete ? undefined : `${answered} of ${URGENCY_ITEMS.length} answered`}
          >
            {complete ? (
              <>
                <p className="text-sm font-medium text-foreground">{band.label}</p>
                <p className="mt-0.5 max-w-md text-xs text-muted-foreground">{band.description}</p>
              </>
            ) : (
              <Meter size="sm" value={answered / URGENCY_ITEMS.length} label="Statements answered" className="max-w-xs" />
            )}
          </StatCell>
          <Button className="justify-self-end" onClick={() => save.mutate(undefined)} disabled={answered < URGENCY_ITEMS.length || save.isPending}>
            Save result
          </Button>
        </div>
      </section>
    </WithRail>
  );
}
