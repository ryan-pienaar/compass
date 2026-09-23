import { describe, expect, it } from "vitest";
import { checkAffirmation } from "../shared/affirmation.ts";
import { dateInZone, formatWeekRange, isValidTimeZone, startOfDayInZone, weekDays, weekStartFor } from "../shared/dates.ts";
import { integritySummary } from "../shared/integrity.ts";
import { analyzeLanguage } from "../shared/language.ts";
import { effectiveTriage, flagsForQuadrant, isDueSoon, quadrantOf, urgencyToStore } from "../shared/quadrant.ts";

describe("time management matrix", () => {
  it("maps urgent x important to quadrants", () => {
    expect(quadrantOf(true, true)).toBe(1);
    expect(quadrantOf(true, false)).toBe(2);
    expect(quadrantOf(false, true)).toBe(3);
    expect(quadrantOf(false, false)).toBe(4);
    expect(quadrantOf(null, true)).toBeNull();
  });

  const base = { important: null, urgent: null, roleId: null, goalId: null, dueDate: null };

  it("leaves untriaged captures in the inbox", () => {
    expect(effectiveTriage(base, "2026-09-23", 1).quadrant).toBeNull();
  });

  it("infers importance from a role or goal link", () => {
    const t = effectiveTriage({ ...base, roleId: "r1" }, "2026-09-23", 1);
    expect(t.important).toBe(true);
    expect(t.importanceInferred).toBe(true);
    expect(t.quadrant).toBe(2);
  });

  it("makes things urgent only through deadlines or an explicit flag", () => {
    const due = effectiveTriage({ ...base, roleId: "r", dueDate: "2026-09-24" }, "2026-09-23", 1);
    expect(due.quadrant).toBe(1);
    expect(due.urgentReason).toBe("due");
    const later = effectiveTriage({ ...base, roleId: "r", dueDate: "2026-09-30" }, "2026-09-23", 1);
    expect(later.quadrant).toBe(2);
    // An explicit "not urgent" wins over the date.
    const overridden = effectiveTriage({ ...base, roleId: "r", urgent: false, dueDate: "2026-09-24" }, "2026-09-23", 1);
    expect(overridden.quadrant).toBe(2);
  });

  it("stores urgency only when it overrides the deadline", () => {
    const today = "2026-09-23";
    // Placing an item in Quadrant II stays automatic, so a deadline added later can still make it urgent.
    expect(flagsForQuadrant(2, null, today, 1)).toEqual({ important: true, urgent: null });
    const parked = effectiveTriage({ ...base, ...flagsForQuadrant(2, null, today, 1), dueDate: "2026-09-24" }, today, 1);
    expect(parked.quadrant).toBe(1);
    // Saying "not urgent" despite a close deadline is a deliberate override.
    expect(flagsForQuadrant(2, "2026-09-24", today, 1)).toEqual({ important: true, urgent: false });
    // Urgent without a deadline needs the flag; with a close deadline the date already says so.
    expect(flagsForQuadrant(3, null, today, 1)).toEqual({ important: false, urgent: true });
    expect(urgencyToStore(true, "2026-09-24", today, 1)).toBeNull();
    // A planned day is not a deadline.
    expect(isDueSoon(null, today, 1)).toBe(false);
    expect(isDueSoon("2026-09-25", today, 1)).toBe(false);
    expect(isDueSoon("2026-09-20", today, 1)).toBe(true);
  });

  it("respects explicit 'not important' even when linked to a role", () => {
    expect(effectiveTriage({ ...base, roleId: "r", important: false, urgent: true }, "2026-09-23", 1).quadrant).toBe(3);
  });
});

describe("proactive language coach", () => {
  it("flags reactive phrasing and suggests reframes", () => {
    const m = analyzeLanguage("I have to finish this but I can't, there's nothing I can do. If only I had time.");
    const ids = m.map((x) => x.patternId);
    expect(ids).toEqual(["have-to", "cant", "nothing-i-can-do", "if-only"]);
    expect(m[0].reframes.length).toBeGreaterThan(0);
  });

  it("ignores neutral text", () => {
    expect(analyzeLanguage("Plan the week and call Mom on Sunday")).toEqual([]);
  });

  it("catches emotional hand-offs", () => {
    expect(analyzeLanguage("He makes me so angry")[0]?.patternId).toBe("makes-me");
  });

  it("reads typographic apostrophes like plain ones, keeping the original text", () => {
    const m = analyzeLanguage("Honestly I’m forced to, and that’s just the way I am");
    expect(m.map((x) => x.patternId)).toEqual(["forced", "way-i-am"]);
    expect(m[0].text).toBe("I’m forced to");
  });
});

describe("affirmations", () => {
  it("recognises the five ingredients", () => {
    const r = checkAffirmation("It is deeply satisfying that I respond with wisdom and love when my children misbehave.");
    expect(Object.fromEntries(r.map((x) => [x.key, x.ok]))).toEqual({
      personal: true,
      positive: true,
      present: true,
      visual: true,
      emotional: true,
    });
  });

  it("flags future tense and negatives", () => {
    const r = checkAffirmation("I will not yell anymore.");
    expect(r.find((x) => x.key === "present")?.ok).toBe(false);
    expect(r.find((x) => x.key === "positive")?.ok).toBe(false);
    expect(checkAffirmation("I don’t rush my mornings.").find((x) => x.key === "positive")?.ok).toBe(false);
  });
});

describe("integrity", () => {
  it("counts a conscious higher-value choice as integrity kept", () => {
    const s = integritySummary([
      { status: "done" },
      { status: "missed", statusReason: "higher_value" },
      { status: "missed", statusReason: "integrity" },
      { status: "dropped", statusReason: "no_longer_relevant" },
      { status: "open" },
    ]);
    expect(s.kept).toBe(2);
    expect(s.counted).toBe(3);
    expect(s.score).toBeCloseTo(2 / 3);
  });

  it("has no score until something is countable", () => {
    expect(integritySummary([{ status: "open" }]).score).toBeNull();
  });

  it("makes no judgement about a miss without a reason", () => {
    const s = integritySummary([{ status: "done" }, { status: "missed", statusReason: null }]);
    expect(s.unjudged).toBe(1);
    expect(s.lapsed).toBe(0);
    expect(s.counted).toBe(1);
    expect(s.score).toBe(1);
  });
});

describe("dates", () => {
  it("computes week starts for Monday and Sunday weeks", () => {
    expect(weekStartFor("2026-09-23", 1)).toBe("2026-09-21");
    expect(weekStartFor("2026-09-23", 0)).toBe("2026-09-20");
    expect(weekStartFor("2026-09-21", 1)).toBe("2026-09-21");
  });

  it("lists seven local days across a month boundary", () => {
    expect(weekDays("2026-09-28")).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(formatWeekRange("2026-09-28")).toBe("28 Sep – 4 Oct 2026");
  });

  it("works out dates in the user's time zone, not the server's", () => {
    // 23:30 UTC is already tomorrow in London (BST) but still today in New York.
    expect(dateInZone("2026-09-23T23:30:00Z", "Europe/London")).toBe("2026-09-24");
    expect(dateInZone("2026-09-23T23:30:00Z", "America/New_York")).toBe("2026-09-23");
    expect(startOfDayInZone("2026-09-24", "Europe/London")).toBe("2026-09-23T23:00:00.000Z");
    // Clocks go back at 02:00 on 25 October: that midnight is still BST, the next one is GMT.
    expect(startOfDayInZone("2026-10-25", "Europe/London")).toBe("2026-10-24T23:00:00.000Z");
    expect(startOfDayInZone("2026-10-26", "Europe/London")).toBe("2026-10-26T00:00:00.000Z");
    expect(isValidTimeZone("Africa/Johannesburg")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
  });
});
