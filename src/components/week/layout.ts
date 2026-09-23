/** Vertical scale of the time grid. */
export const HOUR_PX = 40;
export const PX_PER_MIN = HOUR_PX / 60;
export const SNAP_MIN = 15;

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
