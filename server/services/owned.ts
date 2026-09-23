import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { Scope } from "../context.ts";
import { delegations, goals, roles, tasks, weeks } from "../db/schema.ts";

const REFERENCED = {
  roleId: roles,
  goalId: goals,
  taskId: tasks,
  parentId: tasks,
  delegationId: delegations,
  weekId: weeks,
} as const;

type Reference = keyof typeof REFERENCED;

/**
 * Rejects ids that point at someone else's rows (or at nothing). Ids are unguessable,
 * but the API still never lets one person's task link to another person's role.
 */
export async function assertOwned(s: Scope, refs: Partial<Record<Reference, string | null | undefined>>): Promise<void> {
  for (const [field, id] of Object.entries(refs) as [Reference, string | null | undefined][]) {
    if (!id) continue;
    const table = REFERENCED[field];
    const found = await s.db
      .select({ id: table.id })
      .from(table)
      .where(and(eq(table.id, id), eq(table.userId, s.userId)))
      .limit(1);
    if (found.length === 0) throw new HTTPException(400, { message: `Unknown ${field.replace(/Id$/, "")}: ${id}` });
  }
}
