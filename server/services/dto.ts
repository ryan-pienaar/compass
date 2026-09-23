import { effectiveTriage, type Quadrant } from "../../shared/quadrant.ts";
import type { blocks, tasks } from "../db/schema.ts";

export type TaskRow = typeof tasks.$inferSelect;
export type BlockRow = typeof blocks.$inferSelect;

export interface TriageCtx {
  today: string;
  urgentWithinDays: number;
}

export interface TaskDTO extends TaskRow {
  /** Effective quadrant right now (null = untriaged). */
  quadrant: Quadrant | null;
  importantNow: boolean | null;
  urgentNow: boolean;
  urgentReason: "flag" | "due" | null;
  importanceInferred: boolean;
  /** Captured but not yet triaged. */
  inbox: boolean;
}

export function toTaskDTO(row: TaskRow, ctx: TriageCtx): TaskDTO {
  const t = effectiveTriage(
    {
      important: row.important,
      urgent: row.urgent,
      roleId: row.roleId,
      goalId: row.goalId,
      dueDate: row.dueDate,
      kind: row.kind,
    },
    ctx.today,
    ctx.urgentWithinDays,
  );
  return {
    ...row,
    quadrant: t.quadrant,
    importantNow: t.important,
    urgentNow: t.urgent,
    urgentReason: t.urgentReason,
    importanceInferred: t.importanceInferred,
    inbox: row.status === "open" && row.kind === "task" && t.important == null,
  };
}

export interface BlockDTO extends BlockRow {
  /** Quadrant of the block (its own, or its task's effective quadrant). */
  effectiveQuadrant: Quadrant | null;
  /** Role of the block (its own, or its task's). */
  effectiveRoleId: string | null;
  taskTitle: string | null;
  taskStatus: TaskRow["status"] | null;
  taskKind: TaskRow["kind"] | null;
}

export function toBlockDTO(row: BlockRow, task: TaskDTO | undefined): BlockDTO {
  return {
    ...row,
    effectiveQuadrant: (row.quadrant as Quadrant | null) ?? task?.quadrant ?? null,
    effectiveRoleId: row.roleId ?? task?.roleId ?? null,
    taskTitle: task?.title ?? null,
    taskStatus: task?.status ?? null,
    taskKind: task?.kind ?? null,
  };
}

export const PRIORITY_RANK: Record<string, number> = { A: 0, B: 1, C: 2 };

export function byPriority(a: TaskRow, b: TaskRow): number {
  const pa = a.priority ? PRIORITY_RANK[a.priority] : 3;
  const pb = b.priority ? PRIORITY_RANK[b.priority] : 3;
  return pa - pb || a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt);
}

/**
 * Whether a block's time was (most likely) spent: marked done, its task is done,
 * or it is in the past and was not skipped (people rarely tick off calendar blocks).
 */
export function blockDone(b: BlockDTO, today: string): boolean {
  if (b.status === "done" || b.taskStatus === "done") return true;
  if (b.status === "skipped") return false;
  if (b.taskStatus === "missed" || b.taskStatus === "dropped") return false;
  return b.date < today;
}

export function blockMinutes(b: { startMin: number; endMin: number }): number {
  return Math.max(0, b.endMin - b.startMin);
}
