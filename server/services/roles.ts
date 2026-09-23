import { and, asc, eq, isNull } from "drizzle-orm";
import type { Scope } from "../context.ts";
import { roles } from "../db/schema.ts";

export type RoleRow = typeof roles.$inferSelect;

export const SAW_ROLE_DEFAULTS = {
  name: "Sharpen the Saw",
  description: "Renewal in four dimensions: physical, mental, spiritual and social/emotional.",
  color: "#0f766e",
};

export async function listRoles(s: Scope, includeArchived = false): Promise<RoleRow[]> {
  const mine = eq(roles.userId, s.userId);
  const rows = await s.db
    .select()
    .from(roles)
    .where(includeArchived ? mine : and(mine, isNull(roles.archivedAt)));
  // The saw role always sits last: renewal "surrounds" the other roles.
  return rows.sort((a, b) => Number(a.isSaw) - Number(b.isSaw) || a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

export async function ensureSawRole(s: Scope): Promise<RoleRow> {
  const [existing] = await s.db
    .select()
    .from(roles)
    .where(and(eq(roles.userId, s.userId), eq(roles.isSaw, true)))
    .orderBy(asc(roles.createdAt))
    .limit(1);
  if (existing) {
    if (existing.archivedAt) {
      const [row] = await s.db.update(roles).set({ archivedAt: null }).where(eq(roles.id, existing.id)).returning();
      return row;
    }
    return existing;
  }
  const [row] = await s.db
    .insert(roles)
    .values({ ...SAW_ROLE_DEFAULTS, userId: s.userId, isSaw: true, sortOrder: 1000 })
    .returning();
  return row;
}

export async function nextRoleSortOrder(s: Scope): Promise<number> {
  const rows = await s.db.select({ s: roles.sortOrder, saw: roles.isSaw }).from(roles).where(eq(roles.userId, s.userId));
  const max = rows.filter((r) => !r.saw).reduce((m, r) => Math.max(m, r.s), 0);
  return max + 1;
}
