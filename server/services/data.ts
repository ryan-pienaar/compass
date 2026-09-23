import type { DatabaseSync } from "node:sqlite";
import type { DB } from "../db/client.ts";
import * as s from "../db/schema.ts";

/** Parent tables before children, so inserts satisfy foreign keys. */
const TABLES = {
  settings: s.settings,
  roles: s.roles,
  goals: s.goals,
  missions: s.missions,
  missionVersions: s.missionVersions,
  affirmations: s.affirmations,
  weeks: s.weeks,
  weekRoles: s.weekRoles,
  delegations: s.delegations,
  delegationCheckins: s.delegationCheckins,
  tasks: s.tasks,
  blocks: s.blocks,
  concerns: s.concerns,
  challenges: s.challenges,
  challengeDays: s.challengeDays,
  journal: s.journal,
  timeAudits: s.timeAudits,
  timeEntries: s.timeEntries,
  assessments: s.assessments,
} as const;

type TableName = keyof typeof TABLES;
export const EXPORT_FORMAT = "compass-export";
export const EXPORT_VERSION = 1;

export function exportAll(db: DB) {
  const tables: Record<string, unknown[]> = {};
  for (const [name, table] of Object.entries(TABLES)) {
    tables[name] = db.select().from(table).all();
  }
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: new Date().toISOString(), tables };
}

export function countAll(db: DB): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [name, table] of Object.entries(TABLES)) out[name] = db.select().from(table).all().length;
  return out;
}

/**
 * Replaces everything with the contents of an export. Runs in one transaction
 * with foreign-key checks deferred to commit (tasks reference other tasks).
 */
export function importAll(db: DB, client: DatabaseSync, payload: { format?: string; version?: number; tables?: Record<string, unknown[]> }) {
  if (payload.format !== EXPORT_FORMAT || !payload.tables) throw new Error("This file is not a Compass export.");
  if ((payload.version ?? 0) > EXPORT_VERSION) throw new Error("This export was made by a newer version of Compass.");
  const names = Object.keys(TABLES) as TableName[];
  client.exec("BEGIN IMMEDIATE");
  try {
    client.exec("PRAGMA defer_foreign_keys = ON");
    for (const name of [...names].reverse()) db.delete(TABLES[name]).run();
    for (const name of names) {
      const rows = payload.tables[name];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const table = TABLES[name];
      for (let i = 0; i < rows.length; i += 200) {
        db.insert(table)
          .values(rows.slice(i, i + 200) as never)
          .run();
      }
    }
    client.exec("COMMIT");
  } catch (e) {
    client.exec("ROLLBACK");
    throw e;
  }
  return countAll(db);
}
