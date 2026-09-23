import { and, eq } from "drizzle-orm";
import { newId } from "../../shared/id.ts";
import type { Scope } from "../context.ts";
import * as t from "../db/schema.ts";

/** Parent tables before children, so inserts satisfy foreign keys. */
const TABLES = {
  settings: t.settings,
  roles: t.roles,
  goals: t.goals,
  missions: t.missions,
  missionVersions: t.missionVersions,
  affirmations: t.affirmations,
  weeks: t.weeks,
  weekRoles: t.weekRoles,
  delegations: t.delegations,
  delegationCheckins: t.delegationCheckins,
  tasks: t.tasks,
  blocks: t.blocks,
  concerns: t.concerns,
  challenges: t.challenges,
  challengeDays: t.challengeDays,
  journal: t.journal,
  timeAudits: t.timeAudits,
  timeEntries: t.timeEntries,
  assessments: t.assessments,
} as const;

type TableName = keyof typeof TABLES;
type Row = Record<string, unknown>;

/**
 * Foreign keys per table: field -> [referenced table, required]. Required references
 * that can't be resolved drop the row; optional ones become null.
 */
const REFERENCES: Partial<Record<TableName, Record<string, [TableName, boolean]>>> = {
  goals: { roleId: ["roles", false] },
  missionVersions: { missionId: ["missions", true] },
  affirmations: { roleId: ["roles", false] },
  weekRoles: { weekId: ["weeks", true], roleId: ["roles", true] },
  delegations: { roleId: ["roles", false] },
  delegationCheckins: { delegationId: ["delegations", true] },
  tasks: { roleId: ["roles", false], goalId: ["goals", false], weekId: ["weeks", false], delegationId: ["delegations", false] },
  blocks: { taskId: ["tasks", false], roleId: ["roles", false] },
  concerns: { taskId: ["tasks", false] },
  challengeDays: { challengeId: ["challenges", true] },
  journal: { weekId: ["weeks", false] },
  timeEntries: { roleId: ["roles", false] },
};

/** Tasks that point at other tasks are linked in a second pass, once every task exists. */
const TASK_SELF_REFERENCES = ["parentId", "preventionForId", "carriedFromId"] as const;

export const EXPORT_FORMAT = "compass-export";
export const EXPORT_VERSION = 1;

function mine<N extends TableName>(name: N, userId: string) {
  return eq(TABLES[name].userId, userId);
}

export async function exportAll(s: Scope) {
  const tables: Record<string, Row[]> = {};
  for (const name of Object.keys(TABLES) as TableName[]) {
    const rows = (await s.db.select().from(TABLES[name]).where(mine(name, s.userId))) as Row[];
    // The owner is implied by whoever imports the file.
    tables[name] = rows.map(({ userId: _owner, ...rest }) => rest);
  }
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: new Date().toISOString(), tables };
}

export async function countAll(s: Scope): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const name of Object.keys(TABLES) as TableName[]) {
    out[name] = (await s.db.select({ userId: TABLES[name].userId }).from(TABLES[name]).where(mine(name, s.userId))).length;
  }
  return out;
}

/**
 * Replaces the signed-in person's data with the contents of an export (from this app or
 * the earlier local version). Every row gets a fresh id and references are rewritten, so
 * an export can be imported into any account without colliding with existing rows.
 */
export async function importAll(s: Scope, payload: { format?: string; version?: number; tables?: Record<string, unknown[]> }) {
  if (payload.format !== EXPORT_FORMAT || !payload.tables) throw new Error("This file is not a Compass export.");
  if ((payload.version ?? 0) > EXPORT_VERSION) throw new Error("This export was made by a newer version of Compass.");
  const names = Object.keys(TABLES) as TableName[];
  const idMaps = new Map<TableName, Map<string, string>>(names.map((n) => [n, new Map()]));

  const prepared = new Map<TableName, Row[]>();
  for (const name of names) {
    const input = payload.tables[name];
    const rows = Array.isArray(input) ? (input.filter((r) => r && typeof r === "object") as Row[]) : [];
    const ids = idMaps.get(name)!;
    for (const r of rows) if (typeof r.id === "string") ids.set(r.id, newId());
    prepared.set(name, rows);
  }

  const resolve = (table: TableName, id: unknown) => (typeof id === "string" ? (idMaps.get(table)!.get(id) ?? null) : null);

  await s.db.transaction(async (tx) => {
    for (const name of [...names].reverse()) await tx.delete(TABLES[name]).where(mine(name, s.userId));

    const selfLinks: { id: string; links: Row }[] = [];
    for (const name of names) {
      const refs = REFERENCES[name] ?? {};
      const rows: Row[] = [];
      for (const src of prepared.get(name)!) {
        const row: Row = { ...src, userId: s.userId };
        if (typeof src.id === "string") row.id = idMaps.get(name)!.get(src.id);
        let keep = true;
        for (const [field, [table, required]] of Object.entries(refs)) {
          if (src[field] == null) continue;
          row[field] = resolve(table, src[field]);
          if (row[field] == null && required) keep = false;
        }
        if (name === "tasks") {
          const links: Row = {};
          for (const field of TASK_SELF_REFERENCES) {
            links[field] = resolve("tasks", src[field]);
            row[field] = null;
          }
          if (Object.values(links).some((v) => v != null)) selfLinks.push({ id: row.id as string, links });
        }
        if (keep) rows.push(row);
      }
      for (let i = 0; i < rows.length; i += 200) {
        await tx.insert(TABLES[name]).values(rows.slice(i, i + 200) as never);
      }
    }
    for (const { id, links } of selfLinks) {
      await tx
        .update(t.tasks)
        .set(links)
        .where(and(eq(t.tasks.id, id), eq(t.tasks.userId, s.userId)));
    }
  });
  return countAll(s);
}
