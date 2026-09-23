import { useState } from "react";
import { QUADRANTS } from "@shared/quadrant.ts";
import type { Insights, Role } from "@/lib/api";
import { fmtDate, formatWeekRange, hoursLabel, pct } from "@/lib/format";
import { ChartCard, ChartTooltip, DataTable, niceScale, topRoundedRect, useElementWidth, type TipRow } from "./viz";

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

function weekLabel(ws: string) {
  return fmtDate(ws, "d MMM");
}

/* ------------------------------------------------------------------ */
/* Planned time by quadrant (stacked columns)                           */
/* ------------------------------------------------------------------ */

export function QuadrantColumns({ weeks }: { weeks: Week[] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const hours = (m: number) => m / 60;
  const totals = weeks.map((w) => SERIES.reduce((s, k) => s + w.byQuadrant[k], 0));
  const { max, step } = niceScale(Math.max(1, ...totals.map(hours)));
  const labelW = 92;
  const plotW = Math.max(120, width - AXIS_W - labelW);
  const band = plotW / weeks.length;
  const barW = Math.min(24, band * 0.56);
  const y = (h: number) => PLOT_H - (h / max) * PLOT_H;
  const lastIdx = [...weeks.keys()].reverse().find((i) => totals[i] > 0) ?? -1;
  const everyNth = band < 40 ? Math.ceil(40 / band) : 1;

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
      <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={PLOT_H + X_BAND + 8} role="img" aria-label="Stacked columns of planned hours by quadrant per week">
            <g transform={`translate(${AXIS_W},4)`}>
              {Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step).map((t) => (
                <g key={t}>
                  <line x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--viz-axis)" : "var(--viz-grid)"} strokeWidth={1} />
                  <text x={-6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">
                    {t}h
                  </text>
                </g>
              ))}
              {weeks.map((w, i) => {
                const cx = i * band + band / 2;
                let acc = 0;
                const segs = SERIES.map((k) => ({ k, h: hours(w.byQuadrant[k]) })).filter((s) => s.h > 0);
                return (
                  <g key={w.weekStart}>
                    {segs.map((s, j) => {
                      const top = y(acc + s.h);
                      const bottom = y(acc);
                      acc += s.h;
                      const isTop = j === segs.length - 1;
                      const hgt = Math.max(1, bottom - top - (j > 0 ? 2 : 0)); // 2px surface gap between segments
                      const yTop = top;
                      return isTop ? (
                        <path key={s.k} d={topRoundedRect(cx - barW / 2, yTop, barW, hgt, 4)} fill={Q_COLORS[s.k]} opacity={hover === null || hover === i ? 1 : 0.45} />
                      ) : (
                        <rect key={s.k} x={cx - barW / 2} y={yTop} width={barW} height={hgt} fill={Q_COLORS[s.k]} opacity={hover === null || hover === i ? 1 : 0.45} />
                      );
                    })}
                    {i % everyNth === 0 && (
                      <text x={cx} y={PLOT_H + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]">
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
                      className="outline-none focus-visible:stroke-ring"
                    />
                  </g>
                );
              })}
              {/* Endpoint direct labels on the latest week with data */}
              {lastIdx >= 0 &&
                (() => {
                  const w = weeks[lastIdx];
                  let acc = 0;
                  const x = lastIdx * band + band / 2 + barW / 2 + 6;
                  return SERIES.map((k) => {
                    const h = hours(w.byQuadrant[k]);
                    const mid = y(acc + h / 2);
                    const tall = y(acc) - y(acc + h) >= 12;
                    acc += h;
                    if (!h || !tall) return null;
                    return (
                      <text key={k} x={x} y={mid} dy="0.32em" className="fill-muted-foreground text-[10px]">
                        {Q_SHORT[k]} {hoursLabel(w.byQuadrant[k])}
                      </text>
                    );
                  });
                })()}
            </g>
          </svg>
        )}
        {hover !== null && (
          <ChartTooltip
            x={AXIS_W + hover * band + band / 2}
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
  const plotW = Math.max(120, width - AXIS_W - 40);
  const band = plotW / weeks.length;
  const H = 140;
  const y = (v: number) => H - v * H;
  const x = (i: number) => i * band + band / 2;
  const everyNth = band < 40 ? Math.ceil(40 / band) : 1;

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
      <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={H + X_BAND + 10} role="img" aria-label="Line of the share of weekly promises kept">
            <g transform={`translate(${AXIS_W},6)`}>
              {[0, 0.5, 1].map((t) => (
                <g key={t}>
                  <line x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--viz-axis)" : "var(--viz-grid)"} strokeWidth={1} />
                  <text x={-6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">
                    {t * 100}%
                  </text>
                </g>
              ))}
              {segments.map((seg, si) => (
                <path
                  key={si}
                  d={seg.map((p, j) => `${j ? "L" : "M"}${x(p.i)},${y(p.v)}`).join("")}
                  fill="none"
                  stroke="var(--viz-series-1)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
              {segments.flat().map((p) => (
                <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={hover === p.i ? 5 : 4} fill="var(--viz-series-1)" stroke="var(--card)" strokeWidth={2} />
              ))}
              {last && (
                <text x={x(last.i) + 9} y={y(last.v)} dy="0.32em" className="fill-foreground text-[11px] font-medium">
                  {pct(last.v)}
                </text>
              )}
              {weeks.map((w, i) => (
                <g key={w.weekStart}>
                  {i % everyNth === 0 && (
                    <text x={x(i)} y={H + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]">
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
                    className="outline-none"
                  />
                </g>
              ))}
              {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="var(--viz-axis)" strokeWidth={1} />}
            </g>
          </svg>
        )}
        {hover !== null && (
          <ChartTooltip
            x={AXIS_W + x(hover)}
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

export function RoleHeatmap({ weeks, roles }: { weeks: Week[]; roles: Role[] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<{ r: number; w: number } | null>(null);
  const shown = roles.filter((r) => !r.archivedAt || weeks.some((w) => (w.byRole[r.id] ?? 0) > 0));
  const max = Math.max(1, ...weeks.flatMap((w) => shown.map((r) => w.byRole[r.id] ?? 0)));
  const labelW = Math.min(150, Math.max(90, width * 0.22));
  const cellW = Math.max(10, (width - labelW) / weeks.length);
  const cellH = 26;
  const step = (m: number) => (m <= 0 ? -1 : Math.min(SEQ.length - 1, Math.floor((m / max) * SEQ.length)));
  const everyNth = cellW < 40 ? Math.ceil(40 / cellW) : 1;

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
        {width > 0 && (
          <svg width={width} height={shown.length * cellH + X_BAND} role="img" aria-label="Heatmap of scheduled hours by role and week">
            {shown.map((r, ri) => (
              <g key={r.id} transform={`translate(0,${ri * cellH})`}>
                <circle cx={6} cy={cellH / 2} r={4} fill={r.color} />
                <text x={16} y={cellH / 2} dy="0.32em" className="fill-foreground text-[11px]">
                  {r.name.length > 18 ? `${r.name.slice(0, 17)}…` : r.name}
                </text>
                {weeks.map((w, wi) => {
                  const m = w.byRole[r.id] ?? 0;
                  const s = step(m);
                  return (
                    <rect
                      key={w.weekStart}
                      x={labelW + wi * cellW + 1}
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
                      className="outline-none"
                    />
                  );
                })}
              </g>
            ))}
            {weeks.map((w, wi) =>
              wi % everyNth === 0 ? (
                <text key={w.weekStart} x={labelW + wi * cellW + cellW / 2} y={shown.length * cellH + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                  {weekLabel(w.weekStart)}
                </text>
              ) : null,
            )}
          </svg>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>None</span>
          <span className="size-3 rounded-sm bg-muted" />
          <span className="ml-2">Less</span>
          {SEQ.map((c) => (
            <span key={c} className="size-3 rounded-sm" style={{ background: c }} />
          ))}
          <span>More ({hoursLabel(max)} max)</span>
        </div>
        {hover && (
          <ChartTooltip
            x={labelW + hover.w * cellW + cellW / 2}
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
