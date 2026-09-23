import { DEFAULT_SETTINGS, type Settings } from "../../shared/settings.ts";
import { todayISO } from "../../shared/dates.ts";
import type { DB } from "../db/client.ts";
import { settings } from "../db/schema.ts";

export function getSettings(db: DB): Settings {
  const rows = db.select().from(settings).all();
  const stored: Record<string, unknown> = {};
  for (const r of rows) stored[r.key] = r.value;
  return { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) };
}

export function updateSettings(db: DB, patch: Partial<Settings>): Settings {
  db.transaction((tx) => {
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      tx.insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value } })
        .run();
    }
  });
  return getSettings(db);
}

/** "Now" for triage purposes: today's local date plus the urgency window. */
export function triageContext(db: DB, today = todayISO()) {
  const s = getSettings(db);
  return { today, urgentWithinDays: s.urgentWithinDays, settings: s };
}
