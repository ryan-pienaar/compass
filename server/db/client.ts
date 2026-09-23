import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { fileStamp, todayISO } from "../../shared/dates.ts";
import { MIGRATIONS_DIR, backupDirFor } from "../paths.ts";

export type DB = ReturnType<typeof createDb>["db"];

/**
 * Opens (or creates) the SQLite database, applies pending migrations and
 * returns a Drizzle instance. `:memory:` is supported for tests.
 */
export function createDb(dbPath: string) {
  const isNew = dbPath === ":memory:" || !existsSync(dbPath);
  if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true });
  const client = new DatabaseSync(dbPath);
  client.exec("PRAGMA foreign_keys = ON;");
  client.exec("PRAGMA busy_timeout = 5000;");
  if (dbPath !== ":memory:") {
    // WAL keeps reads fast while writing; synchronous=NORMAL is safe with WAL.
    client.exec("PRAGMA journal_mode = WAL;");
    client.exec("PRAGMA synchronous = NORMAL;");
  }
  const db = drizzle({ client });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return { db, client, isNew };
}

/**
 * Consistent snapshot of the database using VACUUM INTO (safe while in WAL mode,
 * unlike copying the file). Keeps the newest `keep` backups.
 */
export function backupDatabase(client: DatabaseSync, dbPath: string, opts: { keep?: number; label?: string } = {}) {
  const keep = opts.keep ?? 14;
  const dir = backupDirFor(dbPath);
  mkdirSync(dir, { recursive: true });
  const stamp = fileStamp();
  const file = join(dir, `compass-${opts.label ?? "auto"}-${stamp}.db`);
  client.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  const files = readdirSync(dir)
    .filter((f) => f.startsWith("compass-") && f.endsWith(".db"))
    .map((f) => ({ f, t: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const old of files.slice(keep)) rmSync(join(dir, old.f), { force: true });
  return file;
}

/** One automatic backup per calendar day, taken at startup. */
export function dailyBackup(client: DatabaseSync, dbPath: string): string | null {
  if (dbPath === ":memory:") return null;
  const dir = backupDirFor(dbPath);
  const today = todayISO();
  try {
    const hasToday = readdirSync(dir).some((f) => f.startsWith("compass-auto-") && f.includes(today));
    if (hasToday) return null;
  } catch {
    // no backups folder yet
  }
  return backupDatabase(client, dbPath, { label: "auto" });
}

export function listBackups(dbPath: string) {
  const dir = backupDirFor(dbPath);
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".db"))
      .map((f) => {
        const s = statSync(join(dir, f));
        return { file: join(dir, f), name: f, size: s.size, createdAt: new Date(s.mtimeMs).toISOString() };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}
