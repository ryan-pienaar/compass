import { useEffect, useState } from "react";
import { QUADRANTS } from "@shared/quadrant.ts";
import type { Insights, Role } from "@/lib/api";
import { fmtDate, formatWeekRange, hoursLabel, pct } from "@/lib/format";
import { RoleDot } from "@/components/badges";
import { cn } from "@/lib/utils";
import {
  ChartCard,
  ChartTooltip,
  DataTable,
  PlotScroller,
  growBar,
  hitTarget,
  niceScale,
  tickText,
  topRoundedRect,
  useElementWidth,
  type TipRow,
} from "./viz";

type Week = Insights["weeks"][number];

const Q_KEYS = ["q1", "q2", "q3", "q4"] as const;
const Q_COLORS: Record<(typeof Q_KEYS)[number] | "none", string> = {
  q1: "var(--q1)",
  q2: "var(--q2)",
  q3: "var(--q3)",
  q4: "var(--q4)",
  none: "var(--viz-axis)",
};
const Q_LABEL: Record<(typeof Q_KEYS)[number] | "none", string> = {
  q1: `Q${QUADRANTS[1].numeral} ${QUADRANTS[1].verb}`,
  q2: `Q${QUADRANTS[2].numeral} ${QUADRANTS[2].verb}`,
  q3: `Q${QUADRANTS[3].numeral} ${QUADRANTS[3].verb}`,
  q4: `Q${QUADRANTS[4].numeral} ${QUADRANTS[4].verb}`,
  none: "Not classified",
};
const Q_SHORT: Record<(typeof Q_KEYS)[number] | "none", string> = { q1: "QI", q2: "QII", q3: "QIII", q4: "QIV", none: "Other" };
const SERIES = [...Q_KEYS, "none"] as const;

const AXIS_W = 36;
const PLOT_H = 190;
const X_BAND = 22;
/** Narrowest week band before a plot scrolls sideways instead of squeezing. */
const MIN_BAND = 14;
/** The line chart's narrowest band: its 8px points need less room than a column. */
const MIN_POINT = 10;

function weekLabel(ws: string) {
  return fmtDate(ws, "d MMM");
}

/**
 * True for the first moments after a chart mounts, so bars grow and lines draw once. Refetches,
 * range changes and the chart ⇄ table switch never replay it.
 */
function useFirstMount(ms = 900) {
  const [first, setFirst] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setFirst(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return first;
}

/** Bars grow in order: a 12ms stagger, capped at 12. */
const growDelay = (i: number) => ({ animationDelay: `${Math.min(i, 12) * 12}ms` });

/**
 * Keep an x-axis label inside the plot: a label near either edge anchors to that edge instead
 * of hanging off it (half a "21 Sep" label is about 20px).
 */
function edgeAnchor(x: number, plotRight: number): { x: number; textAnchor: "start" | "middle" | "end" } {
  if (x < 20) return { x: 0, textAnchor: "start" };
  if (x > plotRight - 20) return { x: plotRight, textAnchor: "end" };
  return { x, textAnchor: "middle" };
}

/** Label every nth week (at least 60px apart), counting back from the latest so the current week always has one. */
function labelEvery(band: number, count: number) {
  const nth = band < 60 ? Math.ceil(60 / band) : 1;
  return (i: number) => (count - 1 - i) % nth === 0;
}

/* ------------------------------------------------------------------ */
/* Planned time by quadrant (stacked columns)                           */
/* ------------------------------------------------------------------ */

export function QuadrantColumns({ weeks }: { weeks: Week[] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [scrollX, setScrollX] = useState(0);
  const first = useFirstMount();
  const hours = (m: number) => m / 60;
  const totals = weeks.map((w) => SERIES.reduce((s, k) => s + w.byQuadrant[k], 0));
  const { max, step } = niceScale(Math.max(1, ...totals.map(hours)));
  // Room for the endpoint labels; on a phone the tooltip and the table carry the values.
  const labelW = width >= 480 ? 92 : 8;
  const plotW = Math.max(width - AXIS_W - labelW, weeks.length * MIN_BAND);
  const band = plotW / weeks.length;
  const barW = Math.min(24, band * 0.56);
  const y = (h: number) => PLOT_H - (h / max) * PLOT_H;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const lastIdx = [...weeks.keys()].reverse().find((i) => totals[i] > 0) ?? -1;
  const labelled = labelEvery(band, weeks.length);
  const svgH = PLOT_H + X_BAND + 8;

  const table = (
    <DataTable
      head={["Week", ...SERIES.map((k) => Q_LABEL[k]), "Total"]}
      rows={weeks.map((w, i) => [formatWeekRange(w.weekStart), ...SERIES.map((k) => hoursLabel(w.byQuadrant[k])), hoursLabel(totals[i])])}
    />
  );

  return (
    <ChartCard
      title="Where your planned time went"
      subtitle="Hours in calendar blocks per week, by quadrant. Grow Quadrant II; Quadrant I shrinks as it does."
      legend={SERIES.map((k) => ({ label: Q_LABEL[k], swatch: Q_COLORS[k] }))}
      table={table}
    >
      <div ref={ref} className="relative" style={{ minHeight: svgH }} onMouseLeave={() => setHover(null)}>
        {width > 0 && (
          <PlotScroller
            plotWidth={plotW}
            onScrollX={setScrollX}
            gutter={
              <svg width={AXIS_W} height={svgH} aria-hidden className="block shrink-0">
                <g transform="translate(0,4)">
                  {ticks.map((t) => (
                    <text key={t} x={AXIS_W - 6} y={y(t)} dy="0.32em" textAnchor="end" className={tickText}>
                      {t}h
                    </text>
                  ))}
                </g>
              </svg>
            }
          >
            <svg width={plotW + labelW} height={svgH} role="img" aria-label="Stacked columns of planned hours by quadrant per week" className="block">
              <g transform="translate(0,4)">
                {ticks.map((t) => (
                  <line key={t} x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--viz-axis)" : "var(--viz-grid)"} strokeWidth={1} />
                ))}
                {weeks.map((w, i) => {
                  const cx = i * band + band / 2;
                  let acc = 0;
                  const segs = SERIES.map((k) => ({ k, h: hours(w.byQuadrant[k]) })).filter((s) => s.h > 0);
                  return (
                    <g key={w.weekStart}>
                      {/* The whole stack grows from the baseline, in week order. */}
                      <g
                        opacity={hover === null || hover === i ? 1 : 0.45}
                        className={cn("transition-opacity duration-120", first && growBar)}
                        style={first ? growDelay(i) : undefined}
                      >
                        {segs.map((s, j) => {
                          const top = y(acc + s.h);
                          const bottom = y(acc);
                          acc += s.h;
                          const isTop = j === segs.length - 1;
                          const hgt = Math.max(1, bottom - top - (j > 0 ? 2 : 0)); // 2px surface gap between segments
                          return isTop ? (
                            <path key={s.k} d={topRoundedRect(cx - barW / 2, top, barW, hgt, 4)} fill={Q_COLORS[s.k]} />
                          ) : (
                            <rect key={s.k} x={cx - barW / 2} y={top} width={barW} height={hgt} fill={Q_COLORS[s.k]} />
                          );
                        })}
                      </g>
                      {labelled(i) && (
                        <text {...edgeAnchor(cx, plotW + labelW)} y={PLOT_H + 16} className={tickText}>
                          {weekLabel(w.weekStart)}
                        </text>
                      )}
                      {/* Hit target: the whole band, focusable for keyboard users. */}
                      <rect
                        x={i * band}
                        y={0}
                        width={band}
                        height={PLOT_H}
                        fill="transparent"
                        tabIndex={0}
                        aria-label={`${formatWeekRange(w.weekStart)}: ${hoursLabel(totals[i])} planned`}
                        onMouseEnter={() => setHover(i)}
                        onFocus={() => setHover(i)}
                        onBlur={() => setHover(null)}
                        className={hitTarget}
                      />
                    </g>
                  );
                })}
                {/* Endpoint direct labels on the latest week with data */}
                {labelW > 8 &&
                  lastIdx >= 0 &&
                  (() => {
                    const w = weeks[lastIdx];
                    let acc = 0;
                    const x = lastIdx * band + band / 2 + barW / 2 + 6;
                    return SERIES.map((k) => {
                      const h = hours(w.byQuadrant[k]);
                      const mid = y(acc + h / 2);
                      const tall = y(acc) - y(acc + h) >= 14;
                      acc += h;
                      if (!h || !tall) return null;
                      return (
                        <text key={k} x={x} y={mid} dy="0.32em" className={tickText}>
                          {Q_SHORT[k]} {hoursLabel(w.byQuadrant[k])}
                        </text>
                      );
                    });
                  })()}
              </g>
            </svg>
          </PlotScroller>
        )}
        {hover !== null && (
          <ChartTooltip
            x={AXIS_W + hover * band + band / 2 - scrollX}
            y={8}
            containerWidth={width}
            title={`Week of ${formatWeekRange(weeks[hover].weekStart)}`}
            rows={[
              ...SERIES.filter((k) => weeks[hover].byQuadrant[k] > 0)
                .reverse()
                .map((k): TipRow => ({ label: Q_LABEL[k], value: hoursLabel(weeks[hover].byQuadrant[k]), swatch: Q_COLORS[k] })),
              { label: "Total", value: hoursLabel(totals[hover]) },
            ]}
          />
        )}
      </div>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Promises kept (single-series line)                                   */
/* ------------------------------------------------------------------ */

export function IntegrityLine({ weeks }: { weeks: Week[] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [scrollX, setScrollX] = useState(0);
  const first = useFirstMount();
  const endW = 40; // the latest value's direct label
  // Squeeze down to MIN_POINT first (a desktop half-width card holds 26 weeks). Once the plot must
  // scroll, it takes the column band, so the scroll is worth making rather than a few-pixel sliver.
  const fitW = width - AXIS_W - endW;
  const plotW = fitW >= weeks.length * MIN_POINT ? fitW : weeks.length * MIN_BAND;
  const band = plotW / weeks.length;
  const H = 140;
  const y = (v: number) => H - v * H;
  const x = (i: number) => i * band + band / 2;
  const labelled = labelEvery(band, weeks.length);
  const svgH = H + X_BAND + 10;

  // Break the line where a week has no score.
  const segments: { i: number; v: number }[][] = [];
  let cur: { i: number; v: number }[] = [];
  weeks.forEach((w, i) => {
    if (w.integrity == null) {
      if (cur.length) segments.push(cur);
      cur = [];
    } else cur.push({ i, v: w.integrity });
  });
  if (cur.length) segments.push(cur);
  const last = segments.at(-1)?.at(-1);

  const table = (
    <DataTable
      head={["Week", "Promises kept", "Rocks done", "Review rating"]}
      rows={weeks.map((w) => [formatWeekRange(w.weekStart), w.integrity == null ? "–" : pct(w.integrity), `${w.goalsDone}/${w.goals}`, w.rating ?? "–"])}
    />
  );

  return (
    <ChartCard
      title="Promises kept"
      subtitle="Weekly rocks done, or consciously set aside for a higher value, out of those decided."
      table={table}
    >
      <div ref={ref} className="relative" style={{ minHeight: svgH }} onMouseLeave={() => setHover(null)}>
        {width > 0 && (
          <PlotScroller
            plotWidth={plotW}
            onScrollX={setScrollX}
            gutter={
              <svg width={AXIS_W} height={svgH} aria-hidden className="block shrink-0">
                <g transform="translate(0,6)">
                  {[0, 0.5, 1].map((t) => (
                    <text key={t} x={AXIS_W - 6} y={y(t)} dy="0.32em" textAnchor="end" className={tickText}>
                      {t * 100}%
                    </text>
                  ))}
                </g>
              </svg>
            }
          >
            <svg width={plotW + endW} height={svgH} role="img" aria-label="Line of the share of weekly promises kept" className="block">
              <g transform="translate(0,6)">
                {[0, 0.5, 1].map((t) => (
                  <line key={t} x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--viz-axis)" : "var(--viz-grid)"} strokeWidth={1} />
                ))}
                {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="var(--viz-axis)" strokeWidth={1} />}
                {segments.map((seg, si) => (
                  <path
                    key={si}
                    d={seg.map((p, j) => `${j ? "L" : "M"}${x(p.i)},${y(p.v)}`).join("")}
                    fill="none"
                    stroke="var(--viz-series-1)"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray={1}
                    className={first ? "animate-draw" : undefined}
                  />
                ))}
                {segments.flat().map((p) => (
                  <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={hover === p.i ? 5 : 4} fill="var(--viz-series-1)" stroke="var(--card)" strokeWidth={2} />
                ))}
                {last && (
                  <text x={x(last.i) + 9} y={y(last.v)} dy="0.32em" className="fill-foreground text-2xs font-medium tabular-nums">
                    {pct(last.v)}
                  </text>
                )}
                {weeks.map((w, i) => (
                  <g key={w.weekStart}>
                    {labelled(i) && (
                      <text {...edgeAnchor(x(i), plotW + endW)} y={H + 16} className={tickText}>
                        {weekLabel(w.weekStart)}
                      </text>
                    )}
                    <rect
                      x={i * band}
                      y={0}
                      width={band}
                      height={H}
                      fill="transparent"
                      tabIndex={0}
                      aria-label={`${formatWeekRange(w.weekStart)}: ${w.integrity == null ? "no review" : pct(w.integrity)}`}
                      onMouseEnter={() => setHover(i)}
                      onFocus={() => setHover(i)}
                      onBlur={() => setHover(null)}
                      className={hitTarget}
                    />
                  </g>
                ))}
              </g>
            </svg>
          </PlotScroller>
        )}
        {hover !== null && (
          <ChartTooltip
            x={AXIS_W + x(hover) - scrollX}
            y={4}
            containerWidth={width}
            title={`Week of ${formatWeekRange(weeks[hover].weekStart)}`}
            rows={[
              { label: "Promises kept", value: weeks[hover].integrity == null ? "not reviewed" : pct(weeks[hover].integrity) },
              { label: "Rocks done", value: `${weeks[hover].goalsDone}/${weeks[hover].goals}` },
              { label: "Rating", value: weeks[hover].rating ? `${weeks[hover].rating}/5` : "–" },
            ]}
          />
        )}
      </div>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Role balance heatmap (sequential, one hue)                           */
/* ------------------------------------------------------------------ */

const SEQ = ["var(--viz-seq-1)", "var(--viz-seq-2)", "var(--viz-seq-3)", "var(--viz-seq-4)", "var(--viz-seq-5)", "var(--viz-seq-6)"];
/** Heatmap cells never shrink below this; past it the grid scrolls inside the card. */
const MIN_CELL = 14;
/** Room around the grid for a focused edge cell's ring. */
const RING_PAD = 1;
/**
 * A focused heatmap cell: a card band over the inside of its edge (the stroke's inner half), and a
 * teal ring in the 2px gutter drawn by the sibling below. The teal always meets the card colour,
 * never the blue fill.
 */
const cellFocus = "peer outline-hidden focus-visible:stroke-card focus-visible:[stroke-width:4]";
const cellRing = "pointer-events-none opacity-0 peer-focus-visible:opacity-100";

export function RoleHeatmap({ weeks, roles }: { weeks: Week[]; roles: Role[] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<{ r: number; w: number } | null>(null);
  const [scrollX, setScrollX] = useState(0);
  const shown = roles.filter((r) => !r.archivedAt || weeks.some((w) => (w.byRole[r.id] ?? 0) > 0));
  const max = Math.max(1, ...weeks.flatMap((w) => shown.map((r) => w.byRole[r.id] ?? 0)));
  const labelW = Math.min(160, Math.max(128, width * 0.22));
  const cellW = Math.max(MIN_CELL, (width - labelW - 2 * RING_PAD) / weeks.length);
  const gridW = cellW * weeks.length;
  const cellH = 26;
  const step = (m: number) => (m <= 0 ? -1 : Math.min(SEQ.length - 1, Math.floor((m / max) * SEQ.length)));
  const labelled = labelEvery(cellW, weeks.length);
  const svgH = shown.length * cellH + X_BAND + RING_PAD;

  const table = (
    <DataTable
      head={["Role", ...weeks.map((w) => weekLabel(w.weekStart))]}
      rows={shown.map((r) => [r.name, ...weeks.map((w) => hoursLabel(w.byRole[r.id] ?? 0))])}
    />
  );

  return (
    <ChartCard
      title="Role balance"
      subtitle="Hours scheduled for each role, week by week. Blank weeks are worth a second look: success in one role rarely makes up for neglect in another."
      table={table}
    >
      <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
        <div style={{ minHeight: svgH }}>
          {width > 0 && (
            <PlotScroller
              plotWidth={gridW}
              onScrollX={setScrollX}
              gutter={
                // Role names in HTML, so long names truncate cleanly; a cell's tooltip shows the full name.
                <div aria-hidden className="shrink-0 pr-2" style={{ width: labelW, paddingTop: RING_PAD }}>
                  {shown.map((r) => (
                    <div key={r.id} className="flex items-center gap-2" style={{ height: cellH }}>
                      <RoleDot color={r.color} />
                      <span className="min-w-0 truncate text-xs text-foreground">{r.name}</span>
                    </div>
                  ))}
                </div>
              }
            >
              <svg
                width={gridW + 2 * RING_PAD}
                height={svgH}
                role="img"
                aria-label="Heatmap of scheduled hours by role and week"
                className="block"
              >
                <g transform={`translate(${RING_PAD},${RING_PAD})`}>
                  {shown.map((r, ri) => (
                    <g key={r.id} transform={`translate(0,${ri * cellH})`}>
                      {weeks.map((w, wi) => {
                        const m = w.byRole[r.id] ?? 0;
                        const s = step(m);
                        return (
                          <g key={w.weekStart}>
                            <rect
                              x={wi * cellW + 1}
                              y={1}
                              width={cellW - 2}
                              height={cellH - 2}
                              rx={4}
                              fill={s < 0 ? "var(--muted)" : SEQ[s]}
                              tabIndex={0}
                              aria-label={`${r.name}, week of ${formatWeekRange(w.weekStart)}: ${hoursLabel(m)}`}
                              onMouseEnter={() => setHover({ r: ri, w: wi })}
                              onFocus={() => setHover({ r: ri, w: wi })}
                              onBlur={() => setHover(null)}
                              stroke={hover && hover.r === ri && hover.w === wi ? "var(--foreground)" : "none"}
                              strokeWidth={1.5}
                              className={cellFocus}
                            />
                            {/* The focus ring: centred 1px outside the cell, so it fills the gutter. */}
                            <rect
                              aria-hidden
                              x={wi * cellW}
                              y={0}
                              width={cellW}
                              height={cellH}
                              rx={5}
                              fill="none"
                              stroke="var(--ring)"
                              strokeWidth={2}
                              className={cellRing}
                            />
                          </g>
                        );
                      })}
                    </g>
                  ))}
                  {weeks.map((w, wi) =>
                    labelled(wi) ? (
                      <text key={w.weekStart} {...edgeAnchor(wi * cellW + cellW / 2, gridW)} y={shown.length * cellH + 16} className={tickText}>
                        {weekLabel(w.weekStart)}
                      </text>
                    ) : null,
                  )}
                </g>
              </svg>
            </PlotScroller>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
          <span>None</span>
          <span aria-hidden className="size-2.5 rounded-xs bg-muted ring-1 ring-dot-ring" />
          <span className="ml-3">Less</span>
          {SEQ.map((c) => (
            <span key={c} aria-hidden className="size-2.5 rounded-xs ring-1 ring-dot-ring" style={{ background: c }} />
          ))}
          <span>More ({hoursLabel(max)} max)</span>
        </div>
        {hover && (
          <ChartTooltip
            x={labelW + hover.w * cellW + cellW / 2 - scrollX}
            y={hover.r * cellH + cellH}
            containerWidth={width}
            title={shown[hover.r].name}
            rows={[
              { label: `Week of ${weekLabel(weeks[hover.w].weekStart)}`, value: hoursLabel(weeks[hover.w].byRole[shown[hover.r].id] ?? 0) },
            ]}
          />
        )}
      </div>
    </ChartCard>
  );
}
