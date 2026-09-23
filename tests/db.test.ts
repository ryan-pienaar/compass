import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { openPglite } from "../server/db/pglite.ts";
import { roles, tasks } from "../server/db/schema.ts";

describe("database (Postgres schema on in-memory PGlite)", () => {
  it("migrates, returns ISO timestamps and plain dates, and runs transactions", async () => {
    const { db, close } = await openPglite();
    const [role] = await db.insert(roles).values({ userId: "u1", name: "Parent", color: "#16a34a" }).returning();
    expect(role.id).toHaveLength(16);
    expect(role.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    await db.transaction(async (tx) => {
      await tx.insert(tasks).values({ userId: "u1", title: "Read to the kids", roleId: role.id, important: true, dueDate: "2026-09-24" });
      await tx.insert(tasks).values({ userId: "u1", title: "Plan the week", kind: "goal" });
    });
    const rows = await db.select().from(tasks).where(eq(tasks.roleId, role.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].important).toBe(true);
    expect(rows[0].urgent).toBeNull();
    expect(rows[0].dueDate).toBe("2026-09-24");
    expect(rows[0].status).toBe("open");
    await close();
  });

  it("rolls back a failed transaction", async () => {
    const { db, close } = await openPglite();
    await expect(
      db.transaction(async (tx) => {
        await tx.insert(roles).values({ userId: "u1", name: "Friend" });
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await db.select().from(roles)).toHaveLength(0);
    await close();
  });

  it("has row-level security on every table, so Supabase's public API sees nothing", async () => {
    const { db, close } = await openPglite();
    const res = await db.execute<{ relname: string; relrowsecurity: boolean }>(
      sql`select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relname <> '__drizzle_migrations'`,
    );
    const tables = (res as unknown as { rows: { relname: string; relrowsecurity: boolean }[] }).rows;
    expect(tables.length).toBe(19);
    expect(tables.filter((t) => !t.relrowsecurity).map((t) => t.relname)).toEqual([]);
    await close();
  });
});
