import { addDaysISO, addWeeksISO, todayISO, weekDays, weekStartFor } from "../../shared/dates.ts";
import type { DB } from "../db/client.ts";
import {
  affirmations,
  blocks,
  concerns,
  delegations,
  goals,
  journal,
  missionVersions,
  missions,
  roles,
  tasks,
  weeks,
} from "../db/schema.ts";
import { ensureSawRole } from "./roles.ts";
import { getSettings, updateSettings } from "./settings.ts";

const SAMPLE_MISSION = `I live with integrity and make a real difference to the people closest to me.

As a partner, I listen first and keep us growing together.
As a parent, I help my children discover who they are and trust them with real responsibility.
As a leader at work, I build people up and fix problems at their roots instead of fighting fires.
As a friend, I show up, especially when it is inconvenient.
For myself, I keep learning, keep moving and protect time to think.

I decide by principles, not moods. I keep the promises I make, starting with the small ones.`;

/** Development-only sample data so every screen has something to show. */
export function seedDemo(db: DB) {
  if (db.select().from(roles).all().length > 0) {
    return { seeded: false, reason: "Database already has data." };
  }
  const settings = getSettings(db);
  const today = todayISO();
  const thisWeek = weekStartFor(today, settings.weekStartsOn);
  const lastWeek = addWeeksISO(thisWeek, -1);
  const days = weekDays(thisWeek);
  const lastDays = weekDays(lastWeek);

  db.transaction((tx) => {
    const role = (name: string, description: string, color: string, sortOrder: number) =>
      tx.insert(roles).values({ name, description, color, sortOrder }).returning().get();
    const me = role("Personal growth", "Curious, fit and calm. I learn something every week.", "#4f46e5", 1);
    const partner = role("Partner", "A present, patient partner who listens first.", "#db2777", 2);
    const parent = role("Parent", "I teach by example and make time for each child alone.", "#16a34a", 3);
    const manager = role("Engineering manager", "I grow my team and prevent crises instead of fighting them.", "#0891b2", 4);
    const friend = role("Friend", "I show up, especially when it's inconvenient.", "#ea580c", 5);
    const community = role("Community", "I give back through mentoring.", "#9333ea", 6);
    const saw = ensureSawRole(tx as unknown as DB);

    const mission = tx.insert(missions).values({ kind: "personal", title: "My mission", content: SAMPLE_MISSION, reviewedAt: new Date().toISOString() }).returning().get();
    tx.insert(missionVersions).values({ missionId: mission.id, content: SAMPLE_MISSION, note: "First full draft" }).run();

    const g = (roleId: string, title: string, endInMind: string, measure: string, targetDate: string | null) =>
      tx.insert(goals).values({ roleId, title, endInMind, measure, targetDate }).returning().get();
    const gFit = g(me.id, "Run a half marathon", "I finish a half marathon feeling strong.", "Race day finish under 2:15", addDaysISO(today, 120));
    const gTeam = g(manager.id, "Every engineer has a growth plan", "Each person on the team knows their next step and feels backed.", "6/6 growth plans agreed", addDaysISO(today, 60));
    const gOnCall = g(manager.id, "Calm on-call", "Incidents are rare and boring.", "< 2 pages per week for a month", addDaysISO(today, 90));
    const gKids = g(parent.id, "One-on-one time with each child weekly", "Each child can count on time with me alone.", "52 weeks in a row", null);
    g(partner.id, "Weekly date night", "We keep investing in us.", "Every week", null);

    tx.insert(affirmations)
      .values([
        { text: "It is deeply satisfying that I respond with patience and warmth when the kids test me at bedtime.", roleId: parent.id, visualConfirmed: true },
        { text: "I calmly protect my first hour at work for the most important thing, and it feels great.", roleId: manager.id, visualConfirmed: true },
      ])
      .run();

    // Last week: planned and partly done, not yet reviewed.
    const lw = tx.insert(weeks).values({ startDate: lastWeek, status: "planned", plannedAt: new Date().toISOString() }).returning().get();
    const lwGoal = (roleId: string, title: string, status: "open" | "done", extra: Partial<typeof tasks.$inferInsert> = {}) =>
      tx.insert(tasks).values({ kind: "goal", title, roleId, weekId: lw.id, status, completedAt: status === "done" ? new Date().toISOString() : null, ...extra }).returning().get();
    lwGoal(me.id, "Three runs", "done", { goalId: gFit.id });
    lwGoal(partner.id, "Date night: dinner out", "done");
    lwGoal(parent.id, "Saturday bike ride with Sam", "open", { goalId: gKids.id });
    lwGoal(manager.id, "Draft growth plan template", "open", { goalId: gTeam.id });
    lwGoal(saw.id, "Read 50 pages", "done", { sawDimension: "mental" });
    tx.insert(blocks).values({ date: lastDays[1], startMin: 6 * 60, endMin: 6 * 60 + 45, title: "Run", roleId: me.id, kind: "focus", quadrant: 2, status: "done" }).run();

    // This week: planned.
    const tw = tx.insert(weeks).values({ startDate: thisWeek, status: "planned", plannedAt: new Date().toISOString(), intention: "Protect the mornings; be fully present at home." }).returning().get();
    const goal = (roleId: string, title: string, extra: Partial<typeof tasks.$inferInsert> = {}) =>
      tx.insert(tasks).values({ kind: "goal", title, roleId, weekId: tw.id, ...extra }).returning().get();
    const run = goal(me.id, "Three 40-minute runs", { goalId: gFit.id, estimateMinutes: 120, why: "Half marathon in four months." });
    const course = goal(me.id, "Finish module 3 of the leadership course", { estimateMinutes: 90 });
    const date = goal(partner.id, "Date night: cook together", { estimateMinutes: 150 });
    const sam = goal(parent.id, "Bike ride with Sam", { goalId: gKids.id, estimateMinutes: 90, carryCount: 1 });
    goal(parent.id, "Help Mia plan her science project", { estimateMinutes: 60, scheduledDate: days[2] });
    const plans = goal(manager.id, "Growth-plan conversations with Ana and Ben", { goalId: gTeam.id, estimateMinutes: 120, ifThen: "If a meeting gets moved, I rebook it the same day." });
    const postmortem = goal(manager.id, "Fix the root cause of the weekly deploy failures", { goalId: gOnCall.id, estimateMinutes: 180 });
    goal(friend.id, "Call Jordan", { estimateMinutes: 30, scheduledDate: days[3] });
    goal(community.id, "Mentoring session with two students", { estimateMinutes: 60 });
    goal(saw.id, "Three runs (see Personal growth)", { sawDimension: "physical" });
    goal(saw.id, "Read 50 pages", { sawDimension: "mental" });
    goal(saw.id, "Review my mission statement", { sawDimension: "spiritual", status: "done", completedAt: new Date().toISOString() });
    goal(saw.id, "Lunch with an old colleague", { sawDimension: "social" });

    const blk = (d: string, startH: number, mins: number, title: string, extra: Partial<typeof blocks.$inferInsert> = {}) =>
      tx.insert(blocks).values({ date: d, startMin: Math.round(startH * 60), endMin: Math.round(startH * 60) + mins, title, ...extra }).run();
    blk(days[0], 6, 40, run.title, { taskId: run.id, roleId: me.id, kind: "focus" });
    blk(days[2], 6, 40, run.title, { taskId: run.id, roleId: me.id, kind: "focus" });
    blk(days[4], 6, 40, run.title, { taskId: run.id, roleId: me.id, kind: "focus" });
    blk(days[0], 9, 90, postmortem.title, { taskId: postmortem.id, roleId: manager.id, kind: "focus" });
    blk(days[1], 10, 60, "Ana: growth plan", { taskId: plans.id, roleId: manager.id, kind: "focus" });
    blk(days[3], 10, 60, "Ben: growth plan", { taskId: plans.id, roleId: manager.id, kind: "focus" });
    blk(days[1], 14, 60, "Team standup + planning", { roleId: manager.id, kind: "appointment", quadrant: 1 });
    blk(days[3], 19, 150, date.title, { taskId: date.id, roleId: partner.id, kind: "focus" });
    blk(days[5], 9, 90, sam.title, { taskId: sam.id, roleId: parent.id, kind: "focus" });
    blk(days[6], 20, 60, course.title, { taskId: course.id, roleId: me.id, kind: "focus" });

    // Loose tasks in every quadrant (plus an untriaged inbox item).
    const t = (title: string, extra: Partial<typeof tasks.$inferInsert>) => tx.insert(tasks).values({ title, ...extra }).returning().get();
    t("Production incident follow-up report", { roleId: manager.id, urgent: true, important: true, dueDate: today, scheduledDate: today, priority: "A", createdQuadrant: 1 });
    t("Renew car licence", { roleId: me.id, dueDate: addDaysISO(today, 1), createdQuadrant: 2 });
    t("Book annual health check", { roleId: me.id, important: true, createdQuadrant: 2 });
    t("Write onboarding guide for new hires", { roleId: manager.id, important: true, createdQuadrant: 2 });
    t("Reply to vendor survey", { important: false, urgent: true, createdQuadrant: 3, scheduledDate: today, priority: "C" });
    t("Sort out the photo backlog", { important: false, createdQuadrant: 4 });
    t("Look into that new framework everyone's talking about", { source: "capture" });

    tx.insert(concerns)
      .values([
        { title: "My manager keeps changing priorities mid-sprint", control: "indirect", approach: "Prepare a strong proposal", firstStep: "Propose a fortnightly priority check-in with a one-page trade-off view", beStatement: "I can be the one who brings clarity to our planning.", status: "open" },
        { title: "I snap at the kids when I'm tired", control: "direct", approach: "Protect sleep; pause before responding", firstStep: "Lights out by 22:30 on weeknights", beStatement: "I can be patient and warm even when tired.", status: "acting" },
        { title: "The economy might slow down next year", control: "none", approach: "Accept it; keep an emergency fund and skills sharp", status: "accepted" },
        { title: "Our team's on-call rota is exhausting", control: null, status: "open" },
      ])
      .run();

    tx.insert(delegations)
      .values({
        title: "Weekly release notes",
        delegate: "Ana",
        desiredResults: "Clear, accurate release notes published every Friday by 15:00 that a customer could read.",
        guidelines: "Keep it under one page. Nothing that exposes security details. Ask product if unsure about wording.",
        resources: "Last quarter's examples, the release board, 1 hour per week of your time.",
        accountability: "We look at the last two editions together at our one-on-one.",
        consequences: "You own the channel with product; it becomes part of your growth plan.",
        checkinEveryDays: 7,
        nextCheckin: today,
        roleId: manager.id,
      })
      .run();

    tx.insert(journal)
      .values([
        { date: addDaysISO(today, -1), kind: "daily", body: "Went well: protected my morning run. Reactive moment: snapped in standup when the deploy failed. Acknowledge, correct, learn: apologised to Ben, and I'll put the root-cause fix on this week's plan." },
        { date: addDaysISO(today, -2), kind: "choice", title: "Draft growth plan template", body: "Sam was ill and needed me home.", data: { reason: "higher_value" } },
      ])
      .run();
  });

  updateSettings(db, { onboarded: true, displayName: settings.displayName || "Sam" });
  return { seeded: true };
}
