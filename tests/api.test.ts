import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../server/app.ts";
import { createDb } from "../server/db/client.ts";
import { addDaysISO, addWeeksISO, todayISO, weekStartFor } from "../shared/dates.ts";

type Json = Record<string, any>;

function setup() {
  const { db, client } = createDb(":memory:");
  const app = createApp({ db, client, dbPath: ":memory:", dev: true }, { serveStatic: false });
  const call = async (method: string, path: string, body?: unknown): Promise<Json> => {
    const res = await app.request(`/api${path}`, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as Json;
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
    return json;
  };
  return { app, call };
}

describe("API", () => {
  let call: ReturnType<typeof setup>["call"];
  beforeEach(() => {
    call = setup().call;
  });

  async function onboard() {
    return call("POST", "/onboarding", {
      displayName: "Test",
      weekStartsOn: 1,
      planningDay: 0,
      dayStartHour: 6,
      dayEndHour: 22,
      roles: [{ name: "Parent" }, { name: "Manager" }],
      openingPersonal: "Exercise three times a week",
      openingPersonalRole: 0,
      openingProfessional: "Weekly one-on-ones",
      openingProfessionalRole: 1,
      mission: "I live with integrity.",
    });
  }

  it("onboards: roles + Sharpen the Saw, opening answers become Q2 goals, mission saved", async () => {
    const res = await onboard();
    expect(res.settings.onboarded).toBe(true);
    const roles = (await call("GET", "/roles")) as unknown as Json[];
    expect(roles.map((r) => r.name)).toEqual(["Parent", "Manager", "Sharpen the Saw"]);
    const goals = (await call("GET", "/goals")) as unknown as Json[];
    expect(goals).toHaveLength(2);
    expect(goals[0].roleId).toBe(roles[0].id);
    const mission = await call("GET", "/mission");
    expect(mission.mission.content).toBe("I live with integrity.");
    const boot = await call("GET", "/bootstrap");
    expect(boot.planTarget).toBe(boot.weekStart);
  });

  it("plans a week: goals, blocks, stats, commit, review with carry-forward", async () => {
    await onboard();
    const roles = (await call("GET", "/roles")) as unknown as Json[];
    const start = weekStartFor(todayISO(), 1);

    const g1 = await call("POST", "/tasks", { title: "Bike ride with Sam", kind: "goal", roleId: roles[0].id, weekStart: start });
    const g2 = await call("POST", "/tasks", { title: "Growth plans", kind: "goal", roleId: roles[1].id, weekStart: start });
    const g3 = await call("POST", "/tasks", { title: "Run 3x", kind: "goal", roleId: roles[2].id, sawDimension: "physical", weekStart: start });
    expect(g1.quadrant).toBe(2);

    await call("POST", "/blocks", { date: start, startMin: 540, endMin: 630, taskId: g1.id });
    const board = await call("GET", `/weeks/${start}`);
    expect(board.goals).toHaveLength(3);
    expect(board.stats.plannedMinutes).toBe(90);
    expect(board.stats.q2Minutes).toBe(90);
    expect(board.stats.rolesWithGoals).toHaveLength(2);
    expect(board.stats.sawCovered).toEqual(["physical"]);
    expect(board.stats.unscheduledGoals).toBe(2);

    const committed = await call("POST", `/weeks/${start}/commit`);
    expect(committed.status).toBe("planned");

    await call("PATCH", `/tasks/${g1.id}`, { status: "done" });
    const review = await call("POST", `/weeks/${start}/review`, {
      dispositions: [
        { taskId: g2.id, outcome: "missed", reason: "higher_value", carry: true },
        // Not done, no reason given: closed without judgement, not carried.
        { taskId: g3.id, outcome: "missed", reason: null, carry: false },
      ],
      rating: 4,
      wins: "Bike ride happened",
    });
    expect(review.carried).toBe(1);
    expect(review.week.status).toBe("reviewed");

    const next = await call("GET", `/weeks/${addWeeksISO(start, 1)}`);
    expect(next.goals).toHaveLength(1);
    expect(next.goals[0].title).toBe("Growth plans");
    expect(next.goals[0].carryCount).toBe(1);

    const rv = await call("GET", `/weeks/${start}/review`);
    expect(rv.integrity.kept).toBe(2); // done + higher value
    expect(rv.integrity.unjudged).toBe(1);
    expect(rv.integrity.score).toBe(1);
  });

  it("rejects impossible dates and weeks that don't start on the configured day", async () => {
    await onboard();
    await expect(call("GET", "/weeks/2026-02-30")).rejects.toThrow("-> 400");
    const wednesday = addDaysISO(weekStartFor(todayISO(), 1), 2);
    await expect(call("POST", "/tasks", { title: "Rock", kind: "goal", weekStart: wednesday })).rejects.toThrow("-> 400");
  });

  it("keeps untriaged captures in the inbox until triaged", async () => {
    await onboard();
    const t = await call("POST", "/tasks", { title: "Look into something", source: "capture" });
    expect(t.inbox).toBe(true);
    expect(((await call("GET", "/tasks?view=inbox")) as unknown as Json[]).map((x) => x.id)).toContain(t.id);
    const triaged = await call("PATCH", `/tasks/${t.id}`, { important: false, urgent: true });
    expect(triaged.quadrant).toBe(3);
    expect(triaged.createdQuadrant).toBe(3);
    expect(triaged.inbox).toBe(false);
  });

  it("creates a Quadrant II prevention follow-up for a crisis", async () => {
    await onboard();
    const crisis = await call("POST", "/tasks", { title: "Server down", important: true, urgent: true });
    expect(crisis.quadrant).toBe(1);
    const prevent = await call("POST", `/tasks/${crisis.id}/prevent`, {});
    expect(prevent.quadrant).toBe(2);
    expect(prevent.preventionForId).toBe(crisis.id);
  });

  it("turns a concern's first step into a Quadrant II task", async () => {
    await onboard();
    const concern = await call("POST", "/concerns", { title: "Boss changes priorities", control: "indirect", firstStep: "Propose a priority check-in" });
    const res = await call("POST", `/concerns/${concern.id}/first-step`, {});
    expect(res.task.quadrant).toBe(2);
    expect(res.concern.status).toBe("acting");
    expect(res.concern.taskId).toBe(res.task.id);
  });

  it("delegating a task takes it off your plate and schedules check-ins", async () => {
    await onboard();
    const roles = (await call("GET", "/roles")) as unknown as Json[];
    const due = addDaysISO(todayISO(), 3);
    const task = await call("POST", "/tasks", { title: "Release notes", important: false, urgent: true, dueDate: due, roleId: roles[1].id });
    const d = await call("POST", "/delegations", { title: "Release notes", delegate: "Ana", checkinEveryDays: 7, taskId: task.id });
    // The stewardship keeps the task's deadline and role, and checks in no later than the deadline.
    expect(d.dueDate).toBe(due);
    expect(d.roleId).toBe(roles[1].id);
    expect(d.nextCheckin).toBe(due);
    const after = await call("GET", `/tasks/${task.id}`);
    expect(after.status).toBe("dropped");
    expect(after.statusReason).toBe("delegated");
    await call("POST", `/delegations/${d.id}/checkins`, { notes: "On track", onTrack: true });
    const list = (await call("GET", "/delegations")) as unknown as Json[];
    expect(list[0].checkins).toHaveLength(1);
  });

  it("today view gathers priorities, rocks, blocks and records moments of choice", async () => {
    await onboard();
    const today = todayISO();
    const start = weekStartFor(today, 1);
    const rock = await call("POST", "/tasks", { title: "Date night", kind: "goal", weekStart: start });
    const task = await call("POST", "/tasks", { title: "Call plumber", important: true, urgent: true, scheduledDate: today, priority: "A" });
    await call("POST", "/blocks", { date: today, startMin: 600, endMin: 660, title: "Dentist", kind: "appointment" });
    const t = await call("GET", `/today?date=${today}`);
    expect(t.priorities.map((x: Json) => x.id)).toEqual([task.id]);
    expect(t.bigRocks.map((x: Json) => x.id)).toContain(rock.id);
    expect(t.blocks).toHaveLength(1);

    await call("POST", `/tasks/${task.id}/reschedule`, { toDate: null, reason: "higher_value", note: "Kid sick" });
    const choices = (await call("GET", "/journal?kind=choice")) as unknown as Json[];
    expect(choices[0].data.reason).toBe("higher_value");
  });

  it("mission keeps one version per day and can be marked reviewed", async () => {
    await onboard();
    await call("PUT", "/mission", { content: "Draft 2" });
    await call("PUT", "/mission", { content: "Draft 3" });
    const m = await call("GET", "/mission");
    expect(m.mission.content).toBe("Draft 3");
    expect(m.versions).toHaveLength(1);
    const reviewed = await call("POST", "/mission/review");
    expect(reviewed.mission.reviewedAt).not.toBeNull();
  });

  it("exports and re-imports everything", async () => {
    await onboard();
    await call("POST", "/tasks", { title: "A task", important: true, urgent: false });
    const exported = await call("GET", "/data/export");
    expect(exported.format).toBe("compass-export");
    const fresh = setup().call;
    const res = await fresh("POST", "/data/import", { confirm: "REPLACE", data: exported });
    expect(res.counts.roles).toBe(3);
    expect(res.counts.tasks).toBe(1);
  });

  it("seeds demo data in dev mode", async () => {
    const res = await call("POST", "/data/demo");
    expect(res.seeded).toBe(true);
    const insights = await call("GET", "/insights");
    expect(insights.weeks).toHaveLength(12);
  });
});
