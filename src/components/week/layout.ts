/** Vertical scale of the time grid: 56px an hour, so a 15-minute block is 14px and a half hour 28px. */
export const HOUR_PX = 56;
export const PX_PER_MIN = HOUR_PX / 60;
export const SNAP_MIN = 15;
/** The shortest a block is drawn, so a 15-minute block still shows its title (DESIGN.md §10 Week). */
export const MIN_BLOCK_PX = 20;

/** Drawn height of a block of `minutes`: 2px shorter than its slot, so stacked blocks never touch. */
export function blockHeight(minutes: number) {
  return Math.max(MIN_BLOCK_PX, minutes * PX_PER_MIN - 2);
}

export function minuteToY(min: number, dayStartMin: number) {
  return (min - dayStartMin) * PX_PER_MIN;
}

export function yToMinute(y: number, dayStartMin: number, snap = SNAP_MIN) {
  return Math.round((y / PX_PER_MIN + dayStartMin) / snap) * snap;
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export interface Laid<T> {
  item: T;
  lane: number;
  lanes: number;
}

/**
 * Side-by-side layout for overlapping blocks: items in the same overlap cluster
 * share the width; each gets the first free lane.
 */
export function layoutLanes<T extends { startMin: number; endMin: number }>(items: T[]): Laid<T>[] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const out: Laid<T>[] = [];
  let cluster: Laid<T>[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1));
    for (const c of cluster) c.lanes = lanes;
    out.push(...cluster);
    cluster = [];
  };
  for (const item of sorted) {
    if (item.startMin >= clusterEnd && cluster.length) flush();
    const laneEnds: number[] = [];
    for (const c of cluster) laneEnds[c.lane] = Math.max(laneEnds[c.lane] ?? -1, c.item.endMin);
    let lane = 0;
    while (laneEnds[lane] !== undefined && laneEnds[lane] > item.startMin) lane++;
    cluster.push({ item, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  if (cluster.length) flush();
  return out;
}
