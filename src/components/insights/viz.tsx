import { Table2, ChartColumn } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Width of an element, kept current with a ResizeObserver. */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** A "nice" axis maximum and step (1, 2 or 5 × 10^k) giving about `target` ticks. */
export function niceScale(max: number, target = 4): { max: number; step: number } {
  if (max <= 0) return { max: target, step: 1 };
  const raw = max / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  return { max: Math.ceil(max / step) * step, step };
}

/** Rect path with only the top corners rounded (data end), square at the baseline. */
export function topRoundedRect(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export interface LegendItem {
  label: string;
  swatch: string; // CSS color
}

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm" style={{ background: i.swatch }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Card with title, optional legend, and a chart ⇄ table toggle (the table is the accessible twin). */
export function ChartCard({
  title,
  subtitle,
  legend,
  table,
  children,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  legend?: LegendItem[];
  table: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={cn("rounded-2xl border bg-card p-4", className)}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <Button variant="ghost" size="xs" onClick={() => setAsTable((t) => !t)} aria-pressed={asTable}>
          {asTable ? <ChartColumn /> : <Table2 />} {asTable ? "Chart" : "Table"}
        </Button>
      </header>
      {legend && !asTable && (
        <div className="mb-2">
          <Legend items={legend} />
        </div>
      )}
      {asTable ? <div className="overflow-x-auto">{table}</div> : children}
    </section>
  );
}

export function DataTable({ head, rows }: { head: ReactNode[]; rows: ReactNode[][] }) {
  return (
    <table className="w-full text-xs tabular-nums">
      <thead>
        <tr className="border-b text-muted-foreground">
          {head.map((h, i) => (
            <th key={i} className={cn("py-1.5 pr-3 font-medium", i === 0 ? "text-left" : "text-right")}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-border/50 last:border-0">
            {r.map((c, j) => (
              <td key={j} className={cn("py-1.5 pr-3", j === 0 ? "text-left" : "text-right")}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export interface TipRow {
  label: string;
  value: string;
  swatch?: string;
}

/** Floating tooltip positioned inside a relative chart container. */
export function ChartTooltip({ x, y, title, rows, containerWidth }: { x: number; y: number; title: string; rows: TipRow[]; containerWidth: number }) {
  const left = Math.min(Math.max(8, x + 12), Math.max(8, containerWidth - 190));
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 w-44 rounded-lg border bg-popover px-2.5 py-2 text-xs text-popover-foreground shadow-md"
      style={{ left, top: Math.max(0, y) }}
    >
      <div className="mb-1 font-semibold">{title}</div>
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {r.swatch && <span aria-hidden className="size-2 rounded-sm" style={{ background: r.swatch }} />}
              {r.label}
            </span>
            <span className="font-medium tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatTile({ label, value, sub, children }: { label: string; value: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      {children}
    </div>
  );
}
