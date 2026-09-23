import { eq } from "drizzle-orm";
import { addDaysISO, addWeeksISO, weekDays, weekStartFor } from "../../shared/dates.ts";
import type { Scope } from "../context.ts";
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

type TaskExtra = Partial<Omit<typeof tasks.$inferInsert, "userId">>;
type BlockExtra = Partial<Omit<typeof blocks.$inferInsert, "userId">>;

/** Development-only sample data so every screen has something to show. */
export async function seedDemo(s: Scope) {
  const existing = await s.db.select({ id: roles.id }).from(roles).where(eq(roles.userId, s.userId)).limit(1);
  if (existing.length > 0) return { seeded: false, reason: "You already have data." };

  const settings = await getSettings(s);
  const today = s.today;
  const userId = s.userId;
  const thisWeek = weekStartFor(today, settings.weekStartsOn);
  const lastWeek = addWeeksISO(thisWeek, -1);
  const days = weekDays(thisWeek);
  const lastDays = weekDays(lastWeek);
  const now = new Date().toISOString();

  await s.db.transaction(async (tx) => {
    const role = async (name: string, description: string, color: string, sortOrder: number) =>
      (await tx.insert(roles).values({ userId, name, description, color, sortOrder }).returning())[0];
    const me = await role("Personal growth", "Curious, fit and calm. I learn something every week.", "#4f46e5", 1);
    const partner = await role("Partner", "A present, patient partner who listens first.", "#db2777", 2);
    const parent = await role("Parent", "I teach by example and make time for each child alone.", "#16a34a", 3);
    const manager = await role("Engineering manager", "I grow my team and prevent crises instead of fighting them.", "#0891b2", 4);
    const friend = await role("Friend", "I show up, especially when it's inconvenient.", "#ea580c", 5);
    const community = await role("Community", "I give back through mentoring.", "#9333ea", 6);
    const saw = await ensureSawRole({ ...s, db: tx });

    const [mission] = await tx
      .insert(missions)
      .values({ userId, kind: "personal", title: "My mission", content: SAMPLE_MISSION, reviewedAt: now })
      .returning();
    await tx.insert(missionVersions).values({ userId, missionId: mission.id, content: SAMPLE_MISSION, note: "First full draft" });

    const g = async (roleId: string, title: string, endInMind: string, measure: string, targetDate: string | null) =>
      (await tx.insert(goals).values({ userId, roleId, title, endInMind, measure, targetDate }).returning())[0];
    const gFit = await g(me.id, "Run a half marathon", "I finish a half marathon feeling strong.", "Race day finish under 2:15", addDaysISO(today, 120));
    const gTeam = await g(manager.id, "Every engineer has a growth plan", "Each person on the team knows their next step and feels backed.", "6/6 growth plans agreed", addDaysISO(today, 60));
    const gOnCall = await g(manager.id, "Calm on-call", "Incidents are rare and boring.", "< 2 pages per week for a month", addDaysISO(today, 90));
    const gKids = await g(parent.id, "One-on-one time with each child weekly", "Each child can count on time with me alone.", "52 weeks in a row", null);
    await g(partner.id, "Weekly date night", "We keep investing in us.", "Every week", null);

    await tx.insert(affirmations).values([
      { userId, text: "It is deeply satisfying that I respond with patience and warmth when the kids test me at bedtime.", roleId: parent.id, visualConfirmed: true },
      { userId, text: "I calmly protect my first hour at work for the most important thing, and it feels great.", roleId: manager.id, visualConfirmed: true },
    ]);

    // Last week: planned and partly done, not yet reviewed.
    const [lw] = await tx.insert(weeks).values({ userId, startDate: lastWeek, status: "planned", plannedAt: now }).returning();
    const lwGoal = async (roleId: string, title: string, status: "open" | "done", extra: TaskExtra = {}) =>
      (
        await tx
          .insert(tasks)
          .values({ userId, kind: "goal", title, roleId, weekId: lw.id, status, completedAt: status === "done" ? now : null, ...extra })
          .returning()
      )[0];
    await lwGoal(me.id, "Three runs", "done", { goalId: gFit.id });
    await lwGoal(partner.id, "Date night: dinner out", "done");
    await lwGoal(parent.id, "Saturday bike ride with Sam", "open", { goalId: gKids.id });
    await lwGoal(manager.id, "Draft growth plan template", "open", { goalId: gTeam.id });
    await lwGoal(saw.id, "Read 50 pages", "done", { sawDimension: "mental" });
    await tx
      .insert(blocks)
      .values({ userId, date: lastDays[1], startMin: 6 * 60, endMin: 6 * 60 + 45, title: "Run", roleId: me.id, kind: "focus", quadrant: 2, status: "done" });

    // This week: planned.
    const [tw] = await tx
      .insert(weeks)
      .values({ userId, startDate: thisWeek, status: "planned", plannedAt: now, intention: "Protect the mornings; be fully present at home." })
      .returning();
    const goal = async (roleId: string, title: string, extra: TaskExtra = {}) =>
      (await tx.insert(tasks).values({ userId, kind: "goal", title, roleId, weekId: tw.id, ...extra }).returning())[0];
    const run = await goal(me.id, "Three 40-minute runs", { goalId: gFit.id, estimateMinutes: 120, why: "Half marathon in four months." });
    const course = await goal(me.id, "Finish module 3 of the leadership course", { estimateMinutes: 90 });
    const date = await goal(partner.id, "Date night: cook together", { estimateMinutes: 150 });
    const sam = await goal(parent.id, "Bike ride with Sam", { goalId: gKids.id, estimateMinutes: 90, carryCount: 1 });
    await goal(parent.id, "Help Mia plan her science project", { estimateMinutes: 60, scheduledDate: days[2] });
    const plans = await goal(manager.id, "Growth-plan conversations with Ana and Ben", {
      goalId: gTeam.id,
      estimateMinutes: 120,
      ifThen: "If a meeting gets moved, I rebook it the same day.",
    });
    const postmortem = await goal(manager.id, "Fix the root cause of the weekly deploy failures", { goalId: gOnCall.id, estimateMinutes: 180 });
    await goal(friend.id, "Call Jordan", { estimateMinutes: 30, scheduledDate: days[3] });
    await goal(community.id, "Mentoring session with two students", { estimateMinutes: 60 });
    await goal(saw.id, "Three runs (see Personal growth)", { sawDimension: "physical" });
    await goal(saw.id, "Read 50 pages", { sawDimension: "mental" });
    await goal(saw.id, "Review my mission statement", { sawDimension: "spiritual", status: "done", completedAt: now });
    await goal(saw.id, "Lunch with an old colleague", { sawDimension: "social" });

    const blk = (d: string, startH: number, mins: number, title: string, extra: BlockExtra = {}) => ({
      userId,
      date: d,
      startMin: Math.round(startH * 60),
      endMin: Math.round(startH * 60) + mins,
      title,
      ...extra,
    });
    await tx.insert(blocks).values([
      blk(days[0], 6, 40, run.title, { taskId: run.id, roleId: me.id, kind: "focus" }),
      blk(days[2], 6, 40, run.title, { taskId: run.id, roleId: me.id, kind: "focus" }),
      blk(days[4], 6, 40, run.title, { taskId: run.id, roleId: me.id, kind: "focus" }),
      blk(days[0], 9, 90, postmortem.title, { taskId: postmortem.id, roleId: manager.id, kind: "focus" }),
      blk(days[1], 10, 60, "Ana: growth plan", { taskId: plans.id, roleId: manager.id, kind: "focus" }),
      blk(days[3], 10, 60, "Ben: growth plan", { taskId: plans.id, roleId: manager.id, kind: "focus" }),
      blk(days[1], 14, 60, "Team standup + planning", { roleId: manager.id, kind: "appointment", quadrant: 1 }),
      blk(days[3], 19, 150, date.title, { taskId: date.id, roleId: partner.id, kind: "focus" }),
      blk(days[5], 9, 90, sam.title, { taskId: sam.id, roleId: parent.id, kind: "focus" }),
      blk(days[6], 20, 60, course.title, { taskId: course.id, roleId: me.id, kind: "focus" }),
    ]);

    // Loose tasks in every quadrant (plus an untriaged inbox item).
    const t = (title: string, extra: TaskExtra) => ({ userId, title, ...extra });
    await tx.insert(tasks).values([
      t("Production incident follow-up report", { roleId: manager.id, urgent: true, important: true, dueDate: today, scheduledDate: today, priority: "A", createdQuadrant: 1 }),
      t("Renew car licence", { roleId: me.id, dueDate: addDaysISO(today, 1), createdQuadrant: 2 }),
      t("Book annual health check", { roleId: me.id, important: true, createdQuadrant: 2 }),
      t("Write onboarding guide for new hires", { roleId: manager.id, important: true, createdQuadrant: 2 }),
      t("Reply to vendor survey", { important: false, urgent: true, createdQuadrant: 3, scheduledDate: today, priority: "C" }),
      t("Sort out the photo backlog", { important: false, createdQuadrant: 4 }),
      t("Look into that new framework everyone's talking about", { source: "capture" }),
    ]);

    await tx.insert(concerns).values([
      {
        userId,
        title: "My manager keeps changing priorities mid-sprint",
        control: "indirect",
        approach: "Prepare a strong proposal",
        firstStep: "Propose a fortnightly priority check-in with a one-page trade-off view",
        beStatement: "I can be the one who brings clarity to our planning.",
        status: "open",
      },
      {
        userId,
        title: "I snap at the kids when I'm tired",
        control: "direct",
        approach: "Protect sleep; pause before responding",
        firstStep: "Lights out by 22:30 on weeknights",
        beStatement: "I can be patient and warm even when tired.",
        status: "acting",
      },
      { userId, title: "The economy might slow down next year", control: "none", approach: "Accept it; keep an emergency fund and skills sharp", status: "accepted" },
      { userId, title: "Our team's on-call rota is exhausting", control: null, status: "open" },
    ]);

    await tx.insert(delegations).values({
      userId,
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
    });

    await tx.insert(journal).values([
      {
        userId,
        date: addDaysISO(today, -1),
        kind: "daily",
        body: "Went well: protected my morning run. Reactive moment: snapped in standup when the deploy failed. Acknowledge, correct, learn: apologised to Ben, and I'll put the root-cause fix on this week's plan.",
      },
      { userId, date: addDaysISO(today, -2), kind: "choice", title: "Draft growth plan template", body: "Sam was ill and needed me home.", data: { reason: "higher_value" } },
    ]);
  });

  await updateSettings(s, { onboarded: true, displayName: settings.displayName || "Sam" });
  return { seeded: true };
}
