import { and, eq } from "drizzle-orm";
import { effectiveTriage } from "../../shared/quadrant.ts";
import type { DB } from "../db/client.ts";
import { blocks, tasks } from "../db/schema.ts";
import { toTaskDTO, type TaskDTO, type TaskRow, type TriageCtx } from "./dto.ts";

export type TaskInsert = typeof tasks.$inferInsert;
export type TaskPatch = Partial<Omit<TaskInsert, "id" | "createdAt" | "updatedAt">>;

export function getTask(db: DB, id: string): TaskRow | undefined {
  return db.select().from(tasks).where(eq(tasks.id, id)).get();
}

export function createTask(db: DB, input: TaskInsert, ctx: TriageCtx): TaskDTO {
  const triage = effectiveTriage(
    {
      important: input.important ?? null,
      urgent: input.urgent ?? null,
      roleId: input.roleId ?? null,
      goalId: input.goalId ?? null,
      dueDate: input.dueDate ?? null,
      kind: input.kind ?? "task",
    },
    ctx.today,
    ctx.urgentWithinDays,
  );
  const row = db
    .insert(tasks)
    .values({
      ...input,
      createdQuadrant: triage.quadrant,
      completedAt: input.status === "done" ? new Date().toISOString() : null,
    })
    .returning()
    .get();
  return toTaskDTO(row, ctx);
}

export function updateTask(db: DB, id: string, patch: TaskPatch, ctx: TriageCtx): TaskDTO | null {
  const current = getTask(db, id);
  if (!current) return null;
  const next: TaskPatch = { ...patch };
  if (patch.status && patch.status !== current.status) {
    next.completedAt = patch.status === "done" ? new Date().toISOString() : null;
    if (patch.status === "open") {
      next.statusReason = null;
      next.statusNote = "";
    }
  }
  // A task that was never triaged gets its "created quadrant" the first time it is.
  if (current.createdQuadrant == null) {
    const merged = { ...current, ...next } as TaskRow;
    const t = effectiveTriage(
      {
        important: merged.important,
        urgent: merged.urgent,
        roleId: merged.roleId,
        goalId: merged.goalId,
        dueDate: merged.dueDate,
        kind: merged.kind,
      },
      ctx.today,
      ctx.urgentWithinDays,
    );
    if (t.quadrant != null) next.createdQuadrant = t.quadrant;
  }
  const row = db.update(tasks).set(next).where(eq(tasks.id, id)).returning().get();
  return row ? toTaskDTO(row, ctx) : null;
}

export function deleteTask(db: DB, id: string): boolean {
  return db.transaction((tx) => {
    // Focus time reserved for this item goes with it; appointments stay.
    tx.delete(blocks).where(and(eq(blocks.taskId, id), eq(blocks.kind, "focus"))).run();
    const res = tx.delete(tasks).where(eq(tasks.id, id)).run();
    return Number(res.changes ?? 0) > 0;
  });
}

/** Quadrant II follow-up for a Quadrant I problem: work on the root cause. */
export function createPreventionTask(db: DB, sourceId: string, title: string | undefined, ctx: TriageCtx): TaskDTO | null {
  const src = getTask(db, sourceId);
  if (!src) return null;
  return createTask(
    db,
    {
      title: title?.trim() || `Prevent it recurring: ${src.title}`,
      kind: "task",
      roleId: src.roleId,
      goalId: src.goalId,
      important: true,
      urgent: null,
      preventionForId: src.id,
      source: "prevention",
      why: "Fix the screen, not just the flies: stop this crisis coming back.",
    },
    ctx,
  );
}

export function reorderDay(
  db: DB,
  date: string,
  items: { id: string; priority: "A" | "B" | "C" | null; sortOrder: number }[],
): void {
  db.transaction((tx) => {
    for (const it of items) {
      tx.update(tasks)
        .set({ scheduledDate: date, priority: it.priority, sortOrder: it.sortOrder })
        .where(eq(tasks.id, it.id))
        .run();
    }
  });
}
