import { useQuery } from "@tanstack/react-query";
import { Check, Eraser, Play } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { addDaysISO, formatMinutes } from "@shared/dates.ts";
import { QUADRANTS, type Quadrant } from "@shared/quadrant.ts";
import { QUADRANT_CLASSES, QuadrantDot } from "@/components/badges";
import { PrincipleNote, SectionHeader, WithRail } from "@/components/page";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { api, call, type TimeAudit } from "@/lib/api";
import { fmtDate, hoursLabel } from "@/lib/format";
import { useBootstrap } from "@/lib/hooks";
import { useApiMutation } from "@/lib/mutations";
import { auditsQuery, timeEntriesQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { ChartCard, DataTable, tickText, useElementWidth } from "./viz";

const QS: Quadrant[] = [1, 2, 3, 4];

/** Brush options: ChoiceChip geometry on a radio (role="radio" + aria-checked). */
const brushChip =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-medium text-muted-foreground shadow-xs transition-[background-color,color,border-color,box-shadow,scale] duration-120 ease-out hover:border-border-strong hover:text-foreground active:scale-(--motion-scale-press) pointer-coarse:h-10 dark:bg-muted [&_svg]:size-3.5 aria-checked:border-foreground/40 aria-checked:bg-selected aria-checked:text-foreground dark:aria-checked:bg-selected";

/**
 * Habit 3's exercise: estimate how your time splits across the quadrants, then log three days
 * in fifteen-minute intervals and compare.
 */
export function TimeAuditTab() {
  const { data: audits = [], isPending } = useQuery(auditsQuery());
  const current = audits.find((a) => !a.completedAt) ?? null;
  const past = audits.filter((a) => a.completedAt);
  // Don't offer a new audit while we don't yet know whether one is running.
  if (isPending) {
    return (
      <div aria-hidden className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] xl:gap-12">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-24 max-lg:hidden" />
      </div>
    );
  }
  return (
    <div className="space-y-10">
      {current ? <ActiveAudit audit={current} /> : <StartAudit />}
      {past.length > 0 && (
        <section>
          <SectionHeader title="Previous audits" />
          <div className="space-y-4">
            {past.map((a) => (
              <AuditResult key={a.id} audit={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StartAudit() {
  const { today } = useBootstrap();
  const uid = useId();
  const [est, setEst] = useState<Record<Quadrant, number>>({ 1: 30, 2: 20, 3: 35, 4: 15 });
  const total = QS.reduce((s, q) => s + est[q], 0);
  const start = useApiMutation(
    () => call(api.audits.$post({ json: { startDate: today, days: 3, estQ1: est[1], estQ2: est[2], estQ3: est[3], estQ4: est[4] } })),
    { success: "Logging started. Fill in each fifteen minutes as you go, or at the end of the day." },
  );
  return (
    <WithRail
      rail={
        <PrincipleNote>
          Most people overestimate their Quadrant II time and underestimate Quadrant III. The point isn&apos;t guilt; it&apos;s an
          accurate map. You can&apos;t change what you can&apos;t see.
        </PrincipleNote>
      }
    >
      {/* Heading and lede on paper, the sliders in one card: the same shape as Urgency check and Your center. */}
      <section>
        <h2 className="voice-display text-2xl text-foreground">Where does your time really go?</h2>
        <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
          First, guess. What share of your waking time goes to each quadrant? Then log three days in fifteen-minute intervals and see
          how close you were.
        </p>
        <Card className="mt-6">
          <div className="grid grid-cols-1 gap-x-6 gap-y-6 pb-1 sm:grid-cols-2">
            {QS.map((q) => (
              <div key={q} className="grid min-w-0 grid-cols-1 gap-3">
                <Label className="items-start justify-between gap-3">
                  <span id={`${uid}-q${q}`} className="flex min-w-0 items-start gap-2">
                    <QuadrantDot q={q} className="mt-1.5" />
                    <span>
                      Q{QUADRANTS[q].numeral} · {QUADRANTS[q].label}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">{est[q]}%</span>
                </Label>
                <Slider
                  aria-labelledby={`${uid}-q${q}`}
                  value={[est[q]]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={(v) => setEst({ ...est, [q]: Array.isArray(v) ? v[0] : v })}
                />
              </div>
            ))}
          </div>
          <CardFooter className="flex-wrap justify-between gap-3">
            <span className={cn("text-sm tabular-nums", total === 100 ? "text-muted-foreground" : "font-medium text-warning")}>
              Total {total}% {total !== 100 && "(make it 100%)"}
            </span>
            <Button onClick={() => start.mutate(undefined)} disabled={total !== 100 || start.isPending}>
              <Play /> Start a three-day log
            </Button>
          </CardFooter>
        </Card>
      </section>
    </WithRail>
  );
}

function ActiveAudit({ audit }: { audit: TimeAudit }) {
  const { settings, today } = useBootstrap();
  const uid = useId();
  const days = Array.from({ length: audit.days }, (_, i) => addDaysISO(audit.startDate, i));
  const [day, setDay] = useState(() => (days.includes(today) ? today : days[0]));
  const { data: entries = [] } = useQuery(timeEntriesQuery(days[0], days[days.length - 1]));
  const [brush, setBrush] = useState<Quadrant | 0>(2);
  const [local, setLocal] = useState<Record<string, Quadrant | 0>>({});
  const pending = useRef<Record<string, Quadrant | 0>>({});
  const painting = useRef(false);
  const saveSlots = useApiMutation(
    (items: { date: string; slot: number; quadrant: Quadrant | null }[]) => call(api["time-entries"].$put({ json: { entries: items } })),
    { invalidate: true },
  );
  const [reflection, setReflection] = useState(audit.reflection);
  const complete = useApiMutation(() => call(api.audits[":id"].$patch({ param: { id: audit.id }, json: { reflection, completed: true } })), {
    success: "Audit complete. What will you change?",
  });

  const server = useMemo(() => {
    const m: Record<string, Quadrant> = {};
    for (const e of entries) m[`${e.date}:${e.slot}`] = e.quadrant as Quadrant;
    return m;
  }, [entries]);
  // Once the server has caught up, drop local overrides it now reflects.
  useEffect(() => {
    setLocal((l) => {
      const next = { ...l };
      for (const [k, v] of Object.entries(l)) if ((server[k] ?? 0) === v) delete next[k];
      return next;
    });
  }, [server]);
  const valueAt = (key: string): Quadrant | 0 => (key in local ? local[key] : (server[key] ?? 0));

  const paint = (key: string) => {
    if (valueAt(key) === brush) return;
    pending.current[key] = brush;
    setLocal((l) => ({ ...l, [key]: brush }));
  };
  const flush = () => {
    painting.current = false;
    const items = Object.entries(pending.current).map(([k, q]) => {
      const [date, slot] = k.split(":");
      return { date, slot: Number(slot), quadrant: q === 0 ? null : q };
    });
    pending.current = {};
    if (items.length) saveSlots.mutate(items);
  };
  useEffect(() => {
    window.addEventListener("pointerup", flush);
    return () => window.removeEventListener("pointerup", flush);
  });

  const logLast = (q: Quadrant) => {
    const now = new Date();
    const slot = Math.floor((now.getHours() * 60 + now.getMinutes() - 15) / 15);
    if (!days.includes(today) || slot < 0) return;
    saveSlots.mutate([{ date: today, slot, quadrant: q }]);
  };

  const startSlot = settings.dayStartHour * 4;
  const endSlot = settings.dayEndHour * 4;
  const hours = Array.from({ length: settings.dayEndHour - settings.dayStartHour }, (_, i) => settings.dayStartHour + i);
  const logged = Object.values(server).length;

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h2 className="voice-display text-2xl text-foreground">Three-day time log</h2>
          <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
            Pick a quadrant, then click or drag across the fifteen-minute slots. {hoursLabel(logged * 15)} logged so far.
          </p>
        </div>
        {days.includes(today) && (
          <div role="group" aria-labelledby={`${uid}-last`} className="flex flex-wrap items-center gap-1.5">
            <span id={`${uid}-last`} className="w-full text-sm text-muted-foreground sm:mr-1 sm:w-auto">
              The last 15 minutes were:
            </span>
            {QS.map((q) => (
              <Button key={q} size="xs" variant="outline" onClick={() => logLast(q)}>
                <QuadrantDot q={q} /> Q{QUADRANTS[q].numeral}
              </Button>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="min-w-0 gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              aria-label="Day"
              value={day}
              onChange={setDay}
              options={days.map((d) => ({ value: d, label: fmtDate(d, "EEE d MMM") }))}
            />
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Brush">
              {QS.map((q) => (
                <button key={q} type="button" role="radio" aria-checked={brush === q} onClick={() => setBrush(q)} className={brushChip}>
                  <QuadrantDot q={q} /> Q{QUADRANTS[q].numeral}
                </button>
              ))}
              <button type="button" role="radio" aria-checked={brush === 0} onClick={() => setBrush(0)} className={brushChip}>
                <Eraser aria-hidden /> Erase
              </button>
            </div>
          </div>
          <div
            className="-mx-1 max-h-[60svh] overflow-y-auto px-1 py-px select-none scroll-fade-y"
            onPointerLeave={() => painting.current && flush()}
          >
            {hours.map((h) => (
              <div key={h} className="grid grid-cols-[3rem_repeat(4,minmax(0,1fr))] items-center gap-0.5 py-px">
                <span className="text-2xs text-muted-foreground tabular-nums">{formatMinutes(h * 60)}</span>
                {[0, 1, 2, 3].map((i) => {
                  const slot = h * 4 + i;
                  if (slot < startSlot || slot >= endSlot) return <span key={i} />;
                  const key = `${day}:${slot}`;
                  const q = valueAt(key);
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-label={`${formatMinutes(slot * 15)}: ${q ? `Quadrant ${QUADRANTS[q].numeral}` : "not logged"}`}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        painting.current = true;
                        paint(key);
                      }}
                      onPointerEnter={() => painting.current && paint(key)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          paint(key);
                          flush();
                        }
                      }}
                      // Focus: the outline sits in the 2px gutter with a card band inside it, so the teal
                      // always meets the card colour and never the quadrant fill.
                      className={cn(
                        "h-7 rounded-sm transition-colors duration-120 hover:ring-1 hover:ring-border-strong focus-visible:outline-offset-0 focus-visible:inset-ring-2 focus-visible:inset-ring-card",
                        q ? QUADRANT_CLASSES[q].solid : "bg-muted",
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
        <div className="min-w-0 space-y-6">
          <EstimateVsActual audit={audit} actual={countByQuadrant(Object.values(server))} titleAs="h3" />
          <div className="grid gap-2.5">
            <Label htmlFor={`${uid}-reflection`}>Are you satisfied with how you spend your time? What will you change?</Label>
            <Textarea id={`${uid}-reflection`} voice="sm" rows={4} value={reflection} onChange={(e) => setReflection(e.target.value)} />
            <Button className="mt-1 justify-self-end" onClick={() => complete.mutate(undefined)} disabled={complete.isPending || logged === 0}>
              <Check /> Finish the audit
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function countByQuadrant(values: number[]) {
  const c: Record<Quadrant, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const v of values) if (v >= 1 && v <= 4) c[v as Quadrant]++;
  return c;
}

/** Dumbbell: estimate → actual per quadrant, one hue in two shades. */
function EstimateVsActual({
  audit,
  actual,
  bare,
  titleAs,
  className,
}: {
  audit: TimeAudit;
  actual: Record<Quadrant, number>;
  bare?: boolean;
  titleAs?: "h2" | "h3" | "h4";
  className?: string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const total = QS.reduce((s, q) => s + actual[q], 0);
  const est: Record<Quadrant, number> = { 1: audit.estQ1, 2: audit.estQ2, 3: audit.estQ3, 4: audit.estQ4 };
  const act = (q: Quadrant) => (total ? Math.round((actual[q] / total) * 100) : null);
  const labelW = 48;
  const plotW = Math.max(100, width - labelW - 16);
  const x = (p: number) => labelW + (p / 100) * plotW;
  const rowH = 30;
  const svgH = QS.length * rowH + 20;
  return (
    <ChartCard
      bare={bare}
      titleAs={titleAs}
      // The estimate is the lighter shade of the logged blue in both themes (the dark ramp runs the other way).
      className={cn("[--viz-est:var(--viz-seq-2)] dark:[--viz-est:var(--viz-seq-6)]", className)}
      title="Estimate vs actual"
      subtitle={total ? `Share of ${hoursLabel(total * 15)} logged` : "Log some time to compare"}
      legend={[
        { label: "Your estimate", swatch: "var(--viz-est)" },
        { label: "Logged", swatch: "var(--viz-series-1)" },
      ]}
      table={<DataTable head={["Quadrant", "Estimate", "Logged"]} rows={QS.map((q) => [`Q${QUADRANTS[q].numeral}`, `${est[q]}%`, act(q) == null ? "–" : `${act(q)}%`])} />}
    >
      <div ref={ref} style={{ minHeight: svgH }}>
        {width > 0 && (
          <svg width={width} height={svgH} role="img" aria-label="Estimated versus logged share of time by quadrant" className="block">
            {[0, 50, 100].map((t) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={0} y2={QS.length * rowH} stroke="var(--viz-grid)" strokeWidth={1} />
                <text x={x(t)} y={QS.length * rowH + 14} textAnchor="middle" className={tickText}>
                  {t}%
                </text>
              </g>
            ))}
            {QS.map((q, i) => {
              const cy = i * rowH + rowH / 2;
              const a = act(q);
              return (
                <g key={q}>
                  <circle cx={4} cy={cy} r={4} fill={`var(--q${q})`} stroke="var(--dot-ring)" strokeWidth={1} />
                  <text x={14} y={cy} dy="0.32em" className="fill-foreground text-2xs font-medium">
                    Q{QUADRANTS[q].numeral}
                  </text>
                  {a != null && <line x1={x(est[q])} x2={x(a)} y1={cy} y2={cy} stroke="var(--viz-axis)" strokeWidth={2} strokeLinecap="round" />}
                  <circle cx={x(est[q])} cy={cy} r={5} fill="var(--viz-est)" stroke="var(--card)" strokeWidth={2} />
                  {a != null && <circle cx={x(a)} cy={cy} r={5} fill="var(--viz-series-1)" stroke="var(--card)" strokeWidth={2} />}
                  {a != null && (
                    <text
                      x={Math.min(width - 4, Math.max(x(a), x(est[q])) + 10)}
                      y={cy}
                      dy="0.32em"
                      className={tickText}
                      textAnchor={Math.max(x(a), x(est[q])) + 40 > width ? "end" : "start"}
                    >
                      {a}%
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </ChartCard>
  );
}

function AuditResult({ audit }: { audit: TimeAudit }) {
  const end = addDaysISO(audit.startDate, audit.days - 1);
  const { data: entries = [] } = useQuery(timeEntriesQuery(audit.startDate, end));
  return (
    <Card className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-foreground tabular-nums">
          {fmtDate(audit.startDate, "d MMM")} – {fmtDate(end, "d MMM yyyy")}
        </h3>
        {audit.reflection && <p className="mt-2 max-w-[65ch] voice-sm whitespace-pre-wrap text-foreground">{audit.reflection}</p>}
      </div>
      <EstimateVsActual
        audit={audit}
        actual={countByQuadrant(entries.map((e) => e.quadrant))}
        bare
        titleAs="h4"
        className="max-md:border-t max-md:border-border-subtle max-md:pt-6 md:border-l md:border-border-subtle md:pl-6"
      />
    </Card>
  );
}
