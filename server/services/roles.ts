import { asc, eq, isNull } from "drizzle-orm";
import type { DB } from "../db/client.ts";
import { roles } from "../db/schema.ts";

export type RoleRow = typeof roles.$inferSelect;

export const SAW_ROLE_DEFAULTS = {
  name: "Sharpen the Saw",
  description: "Renewal in four dimensions: physical, mental, spiritual and social/emotional.",
  color: "#0f766e",
};

export function listRoles(db: DB, includeArchived = false): RoleRow[] {
  const q = db.select().from(roles);
  const rows = includeArchived ? q.all() : q.where(isNull(roles.archivedAt)).all();
  // The saw role always sits last: renewal "surrounds" the other roles.
  return rows.sort((a, b) => Number(a.isSaw) - Number(b.isSaw) || a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

export function ensureSawRole(db: DB): RoleRow {
  const existing = db.select().from(roles).where(eq(roles.isSaw, true)).orderBy(asc(roles.createdAt)).get();
  if (existing) {
    if (existing.archivedAt) {
      return db.update(roles).set({ archivedAt: null }).where(eq(roles.id, existing.id)).returning().get();
    }
    return existing;
  }
  return db
    .insert(roles)
    .values({ ...SAW_ROLE_DEFAULTS, isSaw: true, sortOrder: 1000 })
    .returning()
    .get();
}

export function nextRoleSortOrder(db: DB): number {
  const rows = db.select({ s: roles.sortOrder, saw: roles.isSaw }).from(roles).all();
  const max = rows.filter((r) => !r.saw).reduce((m, r) => Math.max(m, r.s), 0);
  return max + 1;
}
