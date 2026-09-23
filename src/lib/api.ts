import { hc } from "hono/client";
import type { ApiType } from "../../server/app.ts";
import type { getBoard, getReview, GoalWithTime } from "../../server/services/weeks.ts";
import type { getToday } from "../../server/services/today.ts";
import type { getInsights } from "../../server/services/insights.ts";
import type { BlockDTO, TaskDTO } from "../../server/services/dto.ts";
import type { RoleRow } from "../../server/services/roles.ts";
import type * as schema from "../../server/db/schema.ts";

/** Typed client for the local API (same origin; Vite proxies /api in dev). */
export const api = hc<ApiType>("/api");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Success body of a Hono client response. `c.json(data)` without an explicit status
 * types `ok` as boolean, while explicit error responses (`c.json({ error }, 404)`)
 * type it as `false`, so we drop only the definitely-failing variants.
 */
type OkJson<R> = R extends { ok: false } ? never : R extends { json(): Promise<infer J> } ? J : never;

/** Awaits a client call, throws ApiError on non-2xx, returns the typed JSON body. */
export async function call<R extends { ok: boolean; status: number; json(): Promise<unknown> }>(
  request: Promise<R>,
): Promise<OkJson<R>> {
  const res = await request;
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string; issues?: { path: string; message: string }[] };
      if (body?.error) message = body.issues?.length ? `${body.error}: ${body.issues.map((i) => `${i.path} ${i.message}`).join(", ")}` : body.error;
    } catch {
      // not JSON
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as OkJson<R>;
}

/* Domain types shared with the server. */
export type Task = TaskDTO;
export type Block = BlockDTO;
export type Role = RoleRow;
export type WeekGoal = GoalWithTime;
export type Goal = typeof schema.goals.$inferSelect & {
  stats: { weeklyTotal: number; weeklyDone: number; tasksOpen: number; tasksDone: number; lastProgressAt: string | null };
};
export type Mission = typeof schema.missions.$inferSelect;
export type MissionVersion = typeof schema.missionVersions.$inferSelect;
export type Affirmation = typeof schema.affirmations.$inferSelect;
export type Concern = typeof schema.concerns.$inferSelect;
export type Delegation = typeof schema.delegations.$inferSelect & { checkins: DelegationCheckin[] };
export type DelegationCheckin = typeof schema.delegationCheckins.$inferSelect;
export type JournalEntry = typeof schema.journal.$inferSelect;
export type TimeAudit = typeof schema.timeAudits.$inferSelect;
export type TimeEntry = typeof schema.timeEntries.$inferSelect;
export type Challenge = typeof schema.challenges.$inferSelect;
export type ChallengeDay = typeof schema.challengeDays.$inferSelect;
export type Assessment = typeof schema.assessments.$inferSelect;
export type Week = typeof schema.weeks.$inferSelect;
export type WeekBoard = ReturnType<typeof getBoard>;
export type WeekReview = ReturnType<typeof getReview>;
export type TodayData = ReturnType<typeof getToday>;
export type Insights = ReturnType<typeof getInsights>;
export type Bootstrap = OkJson<Awaited<ReturnType<typeof api.bootstrap.$get>>>;
