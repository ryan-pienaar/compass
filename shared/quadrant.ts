/**
 * The time management matrix (Habit 3). Two factors define an activity:
 * urgency (it demands attention now) and importance (it contributes to your
 * mission, roles and goals). Wording below is our own.
 */

export type Quadrant = 1 | 2 | 3 | 4;

export function quadrantOf(important: boolean | null | undefined, urgent: boolean | null | undefined): Quadrant | null {
  if (important == null || urgent == null) return null;
  if (important) return urgent ? 1 : 2;
  return urgent ? 3 : 4;
}

export function flagsOf(q: Quadrant): { important: boolean; urgent: boolean } {
  return { important: q === 1 || q === 2, urgent: q === 1 || q === 3 };
}

/** A deadline within the urgency window (a planned day never counts). */
export function isDueSoon(dueDate: string | null | undefined, today: string, urgentWithinDays: number): boolean {
  return !!dueDate && dayDiff(today, dueDate) <= urgentWithinDays;
}

/**
 * The urgency flag to store for an explicit yes/no. It is stored only when it overrides
 * the deadline; otherwise it stays automatic (null), so "not urgent yet" can still
 * become urgent as a deadline approaches.
 */
export function urgencyToStore(urgent: boolean, dueDate: string | null | undefined, today: string, urgentWithinDays: number): boolean | null {
  return urgent === isDueSoon(dueDate, today, urgentWithinDays) ? null : urgent;
}

/** Flags to store when someone places an item in a quadrant. */
export function flagsForQuadrant(
  q: Quadrant,
  dueDate: string | null | undefined,
  today: string,
  urgentWithinDays: number,
): { important: boolean; urgent: boolean | null } {
  const f = flagsOf(q);
  return { important: f.important, urgent: urgencyToStore(f.urgent, dueDate, today, urgentWithinDays) };
}

export interface QuadrantInfo {
  q: Quadrant;
  numeral: "I" | "II" | "III" | "IV";
  /** What to do with work in this quadrant. */
  verb: string;
  label: string;
  summary: string;
  examples: string[];
  guidance: string;
}

export const QUADRANTS: Record<Quadrant, QuadrantInfo> = {
  1: {
    q: 1,
    numeral: "I",
    verb: "Manage",
    label: "Urgent & important",
    summary: "Real crises, pressing problems and deadlines that matter.",
    examples: ["A production outage", "A sick child", "Tomorrow's filing deadline"],
    guidance:
      "Handle it well, then ask what Quadrant II work would stop it recurring. Quadrant I shrinks only when Quadrant II grows.",
  },
  2: {
    q: 2,
    numeral: "II",
    verb: "Focus",
    label: "Important, not urgent",
    summary: "Planning, prevention, relationships, learning, renewal and new opportunities.",
    examples: ["Weekly planning", "Exercise", "A one-on-one with your partner", "Fixing the root cause"],
    guidance: "Nothing forces this work to happen, so schedule it first. This is where effectiveness lives.",
  },
  3: {
    q: 3,
    numeral: "III",
    verb: "Limit",
    label: "Urgent, not important",
    summary: "Interruptions and other people's priorities that feel pressing but don't serve your mission.",
    examples: ["Most notifications", "Some meetings", "Requests you could decline"],
    guidance: "Delegate it, batch it, or say no pleasantly. It feels important because it's loud.",
  },
  4: {
    q: 4,
    numeral: "IV",
    verb: "Avoid",
    label: "Neither urgent nor important",
    summary: "Busywork, trivia and escapes.",
    examples: ["Aimless scrolling", "Busywork that nobody needs"],
    guidance: "Drop it. Real rest is Quadrant II renewal; mindless drift is not.",
  },
};

export const QUADRANT_ORDER: Quadrant[] = [1, 2, 3, 4];

export interface TriageInput {
  important: boolean | null;
  urgent: boolean | null;
  roleId: string | null;
  goalId: string | null;
  dueDate: string | null;
  kind?: "task" | "goal";
}

export interface EffectiveTriage {
  important: boolean | null;
  urgent: boolean;
  quadrant: Quadrant | null;
  /** Why the item counts as urgent, when it does. */
  urgentReason: "flag" | "due" | null;
  /** Whether importance was inferred from a role/goal link rather than set explicitly. */
  importanceInferred: boolean;
}

/**
 * Importance comes from an explicit choice, or is inferred when the item is
 * linked to a role or goal (it serves something you care about). Urgency comes
 * from an explicit choice, or from a due date that is close. A *planned* day is
 * not a deadline and never makes anything urgent.
 */
export function effectiveTriage(t: TriageInput, today: string, urgentWithinDays: number): EffectiveTriage {
  const importanceInferred = t.important == null && (t.roleId != null || t.goalId != null || t.kind === "goal");
  const important = t.important ?? (importanceInferred ? true : null);

  let urgent = false;
  let urgentReason: EffectiveTriage["urgentReason"] = null;
  if (t.urgent === true) {
    urgent = true;
    urgentReason = "flag";
  } else if (t.urgent == null && isDueSoon(t.dueDate, today, urgentWithinDays)) {
    urgent = true;
    urgentReason = "due";
  }
  const quadrant = important == null ? null : quadrantOf(important, urgent);
  return { important, urgent, quadrant, urgentReason, importanceInferred };
}

/** Whole days from a to b for YYYY-MM-DD strings (b - a). */
function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}
