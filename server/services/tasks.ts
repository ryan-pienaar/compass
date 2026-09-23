import { and, eq } from "drizzle-orm";
import { effectiveTriage } from "../../shared/quadrant.ts";
import type { Scope } from "../context.ts";
import { blocks, tasks } from "../db/schema.ts";
import { toTaskDTO, type TaskDTO, type TaskRow, type TriageCtx } from "./dto.ts";

export type TaskInsert = Omit<typeof tasks.$inferInsert, "userId">;
export type TaskPatch = Partial<Omit<TaskInsert, "id" | "createdAt" | "updatedAt">>;

export async function getTask(s: Scope, id: string): Promise<TaskRow | undefined> {
  const [row] = await s.db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, s.userId)))
    .limit(1);
  return row;
}

export async function createTask(s: Scope, input: TaskInsert, ctx: TriageCtx): Promise<TaskDTO> {
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
  const [row] = await s.db
    .insert(tasks)
    .values({
      ...input,
      userId: s.userId,
      createdQuadrant: triage.quadrant,
      completedAt: input.status === "done" ? new Date().toISOString() : null,
    })
    .returning();
  return toTaskDTO(row, ctx);
}

export async function updateTask(s: Scope, id: string, patch: TaskPatch, ctx: TriageCtx): Promise<TaskDTO | null> {
  const current = await getTask(s, id);
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
  const [row] = await s.db
    .update(tasks)
    .set(next)
    .where(and(eq(tasks.id, id), eq(tasks.userId, s.userId)))
    .returning();
  return row ? toTaskDTO(row, ctx) : null;
}

export async function deleteTask(s: Scope, id: string): Promise<boolean> {
  return s.db.transaction(async (tx) => {
    // Focus time reserved for this item goes with it; appointments stay.
    await tx.delete(blocks).where(and(eq(blocks.userId, s.userId), eq(blocks.taskId, id), eq(blocks.kind, "focus")));
    const deleted = await tx
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, s.userId)))
      .returning({ id: tasks.id });
    return deleted.length > 0;
  });
}

/** Quadrant II follow-up for a Quadrant I problem: work on the root cause. */
export async function createPreventionTask(s: Scope, sourceId: string, title: string | undefined, ctx: TriageCtx): Promise<TaskDTO | null> {
  const src = await getTask(s, sourceId);
  if (!src) return null;
  return createTask(
    s,
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

export async function reorderDay(
  s: Scope,
  date: string,
  items: { id: string; priority: "A" | "B" | "C" | null; sortOrder: number }[],
): Promise<void> {
  await s.db.transaction(async (tx) => {
    for (const it of items) {
      await tx
        .update(tasks)
        .set({ scheduledDate: date, priority: it.priority, sortOrder: it.sortOrder })
        .where(and(eq(tasks.id, it.id), eq(tasks.userId, s.userId)));
    }
  });
}
