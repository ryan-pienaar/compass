import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "../server/db/client.ts";
import { roles, tasks } from "../server/db/schema.ts";

describe("database (node:sqlite + drizzle, migrated in memory)", () => {
  it("migrates and supports sync queries and transactions", () => {
    const { db } = createDb(":memory:");
    const role = db.insert(roles).values({ name: "Parent", color: "#16a34a" }).returning().get();
    expect(role.id).toHaveLength(16);
    expect(role.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    db.transaction((tx) => {
      tx.insert(tasks).values({ title: "Read to the kids", roleId: role.id, important: true, urgent: false }).run();
      tx.insert(tasks).values({ title: "Plan the week", kind: "goal" }).run();
    });
    const rows = db.select().from(tasks).where(eq(tasks.roleId, role.id)).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].important).toBe(true);
    expect(rows[0].status).toBe("open");
  });

  it("rolls back a failed transaction", () => {
    const { db } = createDb(":memory:");
    expect(() =>
      db.transaction((tx) => {
        tx.insert(roles).values({ name: "Friend" }).run();
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(db.select().from(roles).all()).toHaveLength(0);
  });
});
