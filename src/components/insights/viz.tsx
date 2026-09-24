import { ChartColumn, Table2 } from "lucide-react";
import { useCallback, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Segmented } from "@/components/segmented";
import { StatCell } from "@/components/stat";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Width of an element, kept current with a ResizeObserver. The ref is a callback, so it follows
 * the element when it remounts (a chart shown again after the table view).
 */
export function useElementWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState(0);
  const ref = useCallback((el: T | null) => {
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

/** Rect path with only the top corners curved (the data end), square at the baseline. */
export function topRoundedRect(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/* Shared SVG classes. */
/** Axis ticks and chart labels: the 12px floor, muted, tabular. */
export const tickText = "fill-muted-foreground text-2xs tabular-nums";
/** Focusable hit targets: the ring colour traces the target instead of an outline box. */
export const hitTarget = "outline-hidden focus-visible:stroke-ring focus-visible:[stroke-width:2]";
/** A bar (or a stack of them in a `<g>`) growing up from the baseline on first mount, in order (a 12ms stagger, capped at 12). */
export const growBar = "animate-grow-y [transform-box:fill-box] origin-bottom";

/**
 * A plot beside a fixed gutter (the y axis or row labels). When the plot is wider than the space
 * (a phone, a long range) it scrolls sideways inside the card and opens on the latest week.
 * `onScrollX` reports the offset so the caller can place its tooltip.
 */
export function PlotScroller({
  gutter,
  plotWidth,
  onScrollX,
  children,
}: {
  gutter?: ReactNode;
  plotWidth: number;
  onScrollX: (x: number) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
    onScrollX(el.scrollLeft);
  }, [plotWidth, onScrollX]);
  return (
    <div className="flex">
      {gutter}
      <div
        ref={ref}
        onScroll={(e) => onScrollX(e.currentTarget.scrollLeft)}
        className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-fade-x"
      >
        {children}
      </div>
    </div>
  );
}

export interface LegendItem {
  label: string;
  swatch: string; // CSS color
  /** A count shown after the label, in ink. */
  value?: ReactNode;
}

export function Legend({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground", className)}>
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 shrink-0 rounded-xs ring-1 ring-dot-ring" style={{ background: i.swatch }} />
          {i.label}
          {i.value != null && <span className="font-medium text-foreground tabular-nums">{i.value}</span>}
        </li>
      ))}
    </ul>
  );
}

type View = "chart" | "table";

/**
 * A view option's label. The word hides in narrow cards (the name stays for screen readers); the
 * icon-only option then names itself in a Tooltip. The tooltip's trigger is a decorative layer over
 * the whole option (the option button is `relative`), so a click still lands on the button.
 */
function viewLabel(icon: ReactNode, name: string) {
  return (
    <>
      {icon}
      <span className="sr-only @sm/chart:not-sr-only">{name}</span>
      <Tooltip>
        <TooltipTrigger render={<span aria-hidden className="absolute inset-0 @sm/chart:hidden" />} />
        <TooltipContent>{name}</TooltipContent>
      </Tooltip>
    </>
  );
}

// Icon-only options stay 44px wide on touch.
const VIEW_OPTIONS: { value: View; label: ReactNode; className: string }[] = [
  { value: "chart", label: viewLabel(<ChartColumn aria-hidden />, "Chart"), className: "pointer-coarse:min-w-11" },
  { value: "table", label: viewLabel(<Table2 aria-hidden />, "Table"), className: "pointer-coarse:min-w-11" },
];

/**
 * A chart with its title, an optional legend and a Chart/Table switch (the table is the
 * accessible twin). `footer` shows under both views. `bare` drops the card, for a chart that
 * sits inside another card.
 */
export function ChartCard({
  title,
  subtitle,
  legend,
  table,
  footer,
  children,
  className,
  bare = false,
  titleAs = "h2",
}: {
  title: string;
  subtitle?: ReactNode;
  legend?: LegendItem[];
  table: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bare?: boolean;
  titleAs?: "h2" | "h3" | "h4";
}) {
  const [view, setView] = useState<View>("chart");
  const body = (
    <>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {/* Inside another card the title steps down to 14px, under that card's own heading. */}
          <CardTitle as={titleAs} className={cn(bare && "text-sm")}>
            {title}
          </CardTitle>
          {subtitle && <CardDescription className="mt-0.5 max-w-[65ch]">{subtitle}</CardDescription>}
        </div>
        <Segmented size="sm" aria-label="View" value={view} onChange={setView} options={VIEW_OPTIONS} className="shrink-0" />
      </div>
      {/* Both views fill the card, so a footer sits on its bottom edge beside a taller neighbour. */}
      {view === "table" ? (
        <div className="-mx-1 min-w-0 flex-1 overflow-x-auto px-1 scroll-fade-x">{table}</div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col">
          {legend && <Legend items={legend} className="mb-4" />}
          {children}
        </div>
      )}
      {footer}
    </>
  );
  if (bare) return <section className={cn("@container/chart flex min-w-0 flex-col gap-4", className)}>{body}</section>;
  return (
    <Card render={<section />} className={cn("@container/chart min-w-0", className)}>
      {body}
    </Card>
  );
}

export function DataTable({ head, rows }: { head: ReactNode[]; rows: ReactNode[][] }) {
  return (
    <table className="w-full text-xs tabular-nums">
      <thead>
        <tr className="border-b border-border-subtle">
          {head.map((h, i) => (
            <th
              key={i}
              scope="col"
              className={cn("h-8 pr-4 font-medium whitespace-nowrap text-muted-foreground last:pr-0", i === 0 ? "text-left" : "text-right")}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-border-subtle last:border-0">
            {r.map((c, j) => (
              <td key={j} className={cn("h-8 pr-4 whitespace-nowrap text-foreground last:pr-0", j === 0 ? "text-left" : "text-right")}>
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

const TIP_W = 176; // w-44

/**
 * Floating tooltip positioned inside a relative chart container. It sits right of the point, or
 * left of it when there is no room on the right, so it never covers the point it describes.
 */
export function ChartTooltip({ x, y, title, rows, containerWidth }: { x: number; y: number; title: string; rows: TipRow[]; containerWidth: number }) {
  const fitsRight = x + 12 + TIP_W <= containerWidth - 8;
  const left = Math.max(8, fitsRight ? x + 12 : Math.min(x - 12 - TIP_W, containerWidth - 8 - TIP_W));
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 w-44 rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg ring-1 ring-edge transition-opacity duration-120 starting:opacity-0"
      style={{ left, top: Math.max(0, y) }}
    >
      <div className="mb-1.5 font-medium text-foreground">{title}</div>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              {r.swatch && <span aria-hidden className="size-2 shrink-0 rounded-xs ring-1 ring-dot-ring" style={{ background: r.swatch }} />}
              {r.label}
            </span>
            <span className="shrink-0 font-medium text-foreground tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A lone stat on its own raised surface: `StatCell standalone`. */
export function StatTile(props: Omit<ComponentProps<typeof StatCell>, "standalone">) {
  return <StatCell standalone {...props} />;
}
