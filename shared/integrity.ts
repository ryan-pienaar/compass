/**
 * Integrity (Habit 1 + Habit 3): keeping the promises you make to yourself.
 *
 * A weekly goal is a promise. Choosing a genuinely higher value (often a
 * person) over the plan is still integrity: it's a conscious, value-based
 * choice. Letting a goal slide without choosing is not.
 */

export type GoalStatus = "open" | "done" | "missed" | "dropped";
export type MissReason = "higher_value" | "integrity" | "overcommitted" | "no_longer_relevant";

export interface GoalLike {
  status: GoalStatus;
  statusReason?: MissReason | string | null;
}

export interface IntegritySummary {
  total: number;
  done: number;
  higherValue: number;
  lapsed: number;
  overcommitted: number;
  dropped: number;
  /** not done, with no reason given: no judgement either way */
  unjudged: number;
  open: number;
  /** done + consciously subordinated to a higher value */
  kept: number;
  /** goals that count toward the score (excludes dropped, unjudged and still-open) */
  counted: number;
  /** 0..1, or null when nothing is countable yet */
  score: number | null;
}

export function integritySummary(goals: GoalLike[]): IntegritySummary {
  const s: IntegritySummary = {
    total: goals.length,
    done: 0,
    higherValue: 0,
    lapsed: 0,
    overcommitted: 0,
    dropped: 0,
    unjudged: 0,
    open: 0,
    kept: 0,
    counted: 0,
    score: null,
  };
  for (const g of goals) {
    if (g.status === "done") s.done++;
    else if (g.status === "open") s.open++;
    else if (g.status === "dropped" || g.statusReason === "no_longer_relevant") s.dropped++;
    else if (g.statusReason == null) s.unjudged++;
    else if (g.statusReason === "higher_value") s.higherValue++;
    else if (g.statusReason === "overcommitted") s.overcommitted++;
    else s.lapsed++;
  }
  s.kept = s.done + s.higherValue;
  s.counted = s.done + s.higherValue + s.lapsed + s.overcommitted;
  s.score = s.counted > 0 ? s.kept / s.counted : null;
  return s;
}

export const MISS_REASONS: { value: MissReason; label: string; description: string }[] = [
  {
    value: "higher_value",
    label: "I chose a higher value",
    description: "Something genuinely more important came up (often a person) and I chose it consciously.",
  },
  {
    value: "integrity",
    label: "I let it slide",
    description: "Nothing more important happened; I didn't act on what I'd decided.",
  },
  {
    value: "overcommitted",
    label: "I planned too much",
    description: "The plan didn't fit the week. A lesson for next week's planning.",
  },
  {
    value: "no_longer_relevant",
    label: "No longer relevant",
    description: "Circumstances changed and the goal no longer makes sense.",
  },
];
