import { useQuery } from "@tanstack/react-query";
import { Check, Eraser, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { addDaysISO, formatMinutes } from "@shared/dates.ts";
import { QUADRANTS, type Quadrant } from "@shared/quadrant.ts";
import { QUADRANT_CLASSES } from "@/components/badges";
import { PrincipleNote } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { api, call, type TimeAudit } from "@/lib/api";
import { fmtDate, hoursLabel } from "@/lib/format";
import { useBootstrap } from "@/lib/hooks";
import { useApiMutation } from "@/lib/mutations";
import { auditsQuery, timeEntriesQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { ChartCard, DataTable, useElementWidth } from "./viz";

const QS: Quadrant[] = [1, 2, 3, 4];

/**
 * Habit 3's exercise: estimate how your time splits across the quadrants, then log three days
 * in fifteen-minute intervals and compare.
 */
export function TimeAuditTab() {
  const { data: audits = [] } = useQuery(auditsQuery());
  const current = audits.find((a) => !a.completedAt) ?? null;
  const past = audits.filter((a) => a.completedAt);
  return (
    <div className="space-y-6">
      {current ? <ActiveAudit audit={current} /> : <StartAudit />}
      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Previous audits</h2>
          {past.map((a) => (
            <AuditResult key={a.id} audit={a} />
          ))}
        </section>
      )}
    </div>
  );
}

function StartAudit() {
  const { today } = useBootstrap();
  const [est, setEst] = useState<Record<Quadrant, number>>({ 1: 30, 2: 20, 3: 35, 4: 15 });
  const total = QS.reduce((s, q) => s + est[q], 0);
  const start = useApiMutation(
    () => call(api.audits.$post({ json: { startDate: today, days: 3, estQ1: est[1], estQ2: est[2], estQ3: est[3], estQ4: est[4] } })),
    { success: "Logging started. Fill in each fifteen minutes as you go, or at the end of the day." },
  );
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
        <h2 className="compass-display text-2xl">Where does your time really go?</h2>
        <p className="text-sm text-muted-foreground">
          First, guess. What share of your waking time goes to each quadrant? Then log three days in fifteen-minute intervals and
          see how close you were.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {QS.map((q) => (
            <div key={q} className="grid gap-2">
              <Label className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className={cn("size-2.5 rounded-full", QUADRANT_CLASSES[q].solid)} />
                  Q{QUADRANTS[q].numeral} · {QUADRANTS[q].label}
                </span>
                <span className="tabular-nums">{est[q]}%</span>
              </Label>
              <Slider value={[est[q]]} min={0} max={100} step={5} onValueChange={(v) => setEst({ ...est, [q]: Array.isArray(v) ? v[0] : v })} />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={cn("text-sm", total === 100 ? "text-muted-foreground" : "font-medium text-warning")}>
            Total {total}% {total !== 100 && "(make it 100%)"}
          </span>
          <Button onClick={() => start.mutate(undefined)} disabled={total !== 100 || start.isPending}>
            <Play /> Start a three-day log
          </Button>
        </div>
      </div>
      <PrincipleNote>
        Most people overestimate their Quadrant II time and underestimate Quadrant III. The point isn&apos;t guilt; it&apos;s an
        accurate map. You can&apos;t change what you can&apos;t see.
      </PrincipleNote>
    </section>
  );
}

function ActiveAudit({ audit }: { audit: TimeAudit }) {
  const { settings, today } = useBootstrap();
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
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="compass-display text-2xl">Three-day time log</h2>
          <p className="text-sm text-muted-foreground">
            Pick a quadrant, then click or drag across the fifteen-minute slots. {hoursLabel(logged * 15)} logged so far.
          </p>
        </div>
        {days.includes(today) && (
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">The last 15 minutes were:</span>
            {QS.map((q) => (
              <Button key={q} size="xs" variant="outline" onClick={() => logLast(q)}>
                <span aria-hidden className={cn("size-2 rounded-full", QUADRANT_CLASSES[q].solid)} /> Q{QUADRANTS[q].numeral}
              </Button>
            ))}
          </div>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-2xl border bg-card p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {days.map((d) => (
              <Button key={d} size="sm" variant={d === day ? "default" : "outline"} onClick={() => setDay(d)}>
                {fmtDate(d, "EEE d MMM")}
              </Button>
            ))}
            <div className="ml-auto flex flex-wrap gap-1" role="radiogroup" aria-label="Brush">
              {QS.map((q) => (
                <button
                  key={q}
                  type="button"
                  role="radio"
                  aria-checked={brush === q}
                  onClick={() => setBrush(q)}
                  className={cn("flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs", brush === q ? "border-foreground bg-muted font-semibold" : "hover:bg-muted")}
                >
                  <span aria-hidden className={cn("size-2.5 rounded-sm", QUADRANT_CLASSES[q].solid)} /> Q{QUADRANTS[q].numeral}
                </button>
              ))}
              <button
                type="button"
                role="radio"
                aria-checked={brush === 0}
                onClick={() => setBrush(0)}
                className={cn("flex items-center gap-1 rounded-md border px-2 py-1 text-xs", brush === 0 ? "border-foreground bg-muted font-semibold" : "hover:bg-muted")}
              >
                <Eraser className="size-3" /> Erase
              </button>
            </div>
          </div>
          <div className="max-h-[60svh] overflow-y-auto pr-1 select-none scrollbar-thin" onPointerLeave={() => painting.current && flush()}>
            {hours.map((h) => (
              <div key={h} className="grid grid-cols-[3rem_repeat(4,minmax(0,1fr))] items-center gap-0.5 py-px">
                <span className="text-[10px] text-muted-foreground tabular-nums">{formatMinutes(h * 60)}</span>
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
                      className={cn("h-5 rounded-sm border", q ? cn(QUADRANT_CLASSES[q].solid, "border-transparent") : "border-dashed border-border bg-muted/30 hover:bg-muted")}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <EstimateVsActual audit={audit} actual={countByQuadrant(Object.values(server))} />
          <div className="grid gap-2 rounded-2xl border bg-card p-4">
            <Label>Are you satisfied with how you spend your time? What will you change?</Label>
            <Textarea rows={4} value={reflection} onChange={(e) => setReflection(e.target.value)} />
            <Button onClick={() => complete.mutate(undefined)} disabled={complete.isPending || logged === 0}>
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
function EstimateVsActual({ audit, actual }: { audit: TimeAudit; actual: Record<Quadrant, number> }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const total = QS.reduce((s, q) => s + actual[q], 0);
  const est: Record<Quadrant, number> = { 1: audit.estQ1, 2: audit.estQ2, 3: audit.estQ3, 4: audit.estQ4 };
  const act = (q: Quadrant) => (total ? Math.round((actual[q] / total) * 100) : null);
  const labelW = 64;
  const plotW = Math.max(100, width - labelW - 16);
  const x = (p: number) => labelW + (p / 100) * plotW;
  const rowH = 30;
  return (
    <ChartCard
      title="Estimate vs actual"
      subtitle={total ? `Share of ${hoursLabel(total * 15)} logged` : "Log some time to compare"}
      legend={[
        { label: "Your estimate", swatch: "var(--viz-seq-2)" },
        { label: "Logged", swatch: "var(--viz-series-1)" },
      ]}
      table={<DataTable head={["Quadrant", "Estimate", "Logged"]} rows={QS.map((q) => [`Q${QUADRANTS[q].numeral}`, `${est[q]}%`, act(q) == null ? "–" : `${act(q)}%`])} />}
    >
      <div ref={ref}>
        {width > 0 && (
          <svg width={width} height={QS.length * rowH + 18} role="img" aria-label="Estimated versus logged share of time by quadrant">
            {[0, 50, 100].map((t) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={0} y2={QS.length * rowH} stroke="var(--viz-grid)" strokeWidth={1} />
                <text x={x(t)} y={QS.length * rowH + 12} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                  {t}%
                </text>
              </g>
            ))}
            {QS.map((q, i) => {
              const cy = i * rowH + rowH / 2;
              const a = act(q);
              return (
                <g key={q}>
                  <text x={0} y={cy} dy="0.32em" className="fill-foreground text-[11px]">
                    Q{QUADRANTS[q].numeral}
                  </text>
                  {a != null && <line x1={x(est[q])} x2={x(a)} y1={cy} y2={cy} stroke="var(--viz-axis)" strokeWidth={2} strokeLinecap="round" />}
                  <circle cx={x(est[q])} cy={cy} r={5} fill="var(--viz-seq-2)" stroke="var(--card)" strokeWidth={2} />
                  {a != null && <circle cx={x(a)} cy={cy} r={5} fill="var(--viz-series-1)" stroke="var(--card)" strokeWidth={2} />}
                  {a != null && (
                    <text x={Math.min(width - 4, Math.max(x(a), x(est[q])) + 10)} y={cy} dy="0.32em" className="fill-muted-foreground text-[10px]" textAnchor={Math.max(x(a), x(est[q])) + 40 > width ? "end" : "start"}>
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
    <div className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[1fr_20rem]">
      <div>
        <div className="text-sm font-medium">
          {fmtDate(audit.startDate, "d MMM")} – {fmtDate(end, "d MMM yyyy")}
        </div>
        {audit.reflection && <p className="compass-text mt-1 !text-[0.95rem] whitespace-pre-wrap text-muted-foreground">{audit.reflection}</p>}
      </div>
      <EstimateVsActual audit={audit} actual={countByQuadrant(entries.map((e) => e.quadrant))} />
    </div>
  );
}
