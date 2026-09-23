import { eq } from "drizzle-orm";
import { DEFAULT_SETTINGS, type Settings } from "../../shared/settings.ts";
import type { Scope } from "../context.ts";
import { settings } from "../db/schema.ts";

export async function getSettings(s: Scope): Promise<Settings> {
  const rows = await s.db.select().from(settings).where(eq(settings.userId, s.userId));
  const stored: Record<string, unknown> = {};
  for (const r of rows) stored[r.key] = r.value;
  return { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) };
}

export async function updateSettings(s: Scope, patch: Partial<Settings>): Promise<Settings> {
  await s.db.transaction(async (tx) => {
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      await tx
        .insert(settings)
        .values({ userId: s.userId, key, value })
        .onConflictDoUpdate({ target: [settings.userId, settings.key], set: { value } });
    }
  });
  return getSettings(s);
}

/** "Now" for triage purposes: the user's local date plus their urgency window. */
export async function triageContext(s: Scope) {
  const st = await getSettings(s);
  return { today: s.today, urgentWithinDays: st.urgentWithinDays, settings: st };
}
