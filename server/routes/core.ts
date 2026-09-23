import { and, asc, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { ROLE_COLORS } from "../../shared/content.ts";
import type { Settings } from "../../shared/settings.ts";
import { addWeeksISO, weekdayInZone, weekStartFor, type WeekStartsOn } from "../../shared/dates.ts";
import type { ApiEnv, AppContext, Scope } from "../context.ts";
import { delegations, goals, missions, roles, tasks } from "../db/schema.ts";
import { v } from "../lib/validate.ts";
import { countAll, exportAll, importAll } from "../services/data.ts";
import { seedDemo } from "../services/demo.ts";
import { ensureSawRole, listRoles, nextRoleSortOrder } from "../services/roles.ts";
import { getSettings, updateSettings } from "../services/settings.ts";
import { getWeek } from "../services/weeks.ts";

const weekday = z.number().int().min(0).max(6);

const settingsPatch = z
  .object({
    displayName: z.string().max(80),
    weekStartsOn: weekday,
    planningDay: weekday,
    dayStartHour: z.number().int().min(0).max(23),
    dayEndHour: z.number().int().min(1).max(24),
    defaultBlockMinutes: z.number().int().min(15).max(480),
    urgentWithinDays: z.number().int().min(0).max(14),
    capacityTarget: z.number().min(0.2).max(1),
    languageCoach: z.enum(["off", "strong", "all"]),
    theme: z.enum(["system", "light", "dark"]),
    onboarded: z.boolean(),
    openingPersonal: z.string().max(2000),
    openingProfessional: z.string().max(2000),
  })
  .partial();

const onboardingSchema = z.object({
  displayName: z.string().max(80).default(""),
  weekStartsOn: weekday,
  planningDay: weekday,
  dayStartHour: z.number().int().min(0).max(23),
  dayEndHour: z.number().int().min(1).max(24),
  roles: z
    .array(z.object({ name: z.string().trim().min(1).max(60), description: z.string().max(500).optional(), color: z.string().optional() }))
    .max(12),
  openingPersonal: z.string().max(2000).default(""),
  openingPersonalRole: z.number().int().nullable().optional(),
  openingProfessional: z.string().max(2000).default(""),
  openingProfessionalRole: z.number().int().nullable().optional(),
  mission: z.string().max(20000).default(""),
});

async function bootstrap(s: Scope, dev: boolean) {
  const settings = await getSettings(s);
  const today = s.today;
  const weekStart = weekStartFor(today, settings.weekStartsOn);
  const nextWeekStart = addWeeksISO(weekStart, 1);
  const [week, nextWeek, missionRows, inboxRows, checkinRows, roleList] = await Promise.all([
    getWeek(s, weekStart),
    getWeek(s, nextWeekStart),
    s.db
      .select()
      .from(missions)
      .where(and(eq(missions.userId, s.userId), eq(missions.kind, "personal")))
      .orderBy(asc(missions.createdAt))
      .limit(1),
    s.db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, s.userId),
          eq(tasks.status, "open"),
          eq(tasks.kind, "task"),
          isNull(tasks.important),
          isNull(tasks.roleId),
          isNull(tasks.goalId),
        ),
      ),
    s.db
      .select({ id: delegations.id })
      .from(delegations)
      .where(
        and(
          eq(delegations.userId, s.userId),
          eq(delegations.status, "active"),
          isNotNull(delegations.nextCheckin),
          lte(delegations.nextCheckin, today),
        ),
      ),
    listRoles(s),
  ]);
  const mission = missionRows[0];

  // Which week the weekly ritual should target right now.
  const dow = weekdayInZone(s.timeZone);
  const lastDayOfWeek = (settings.weekStartsOn + 6) % 7;
  const currentPlanned = week ? week.status !== "draft" : false;
  const nextPlanned = nextWeek ? nextWeek.status !== "draft" : false;
  let planTarget: string | null = null;
  if (!currentPlanned) planTarget = weekStart;
  else if (!nextPlanned && (dow === settings.planningDay || dow === lastDayOfWeek)) planTarget = nextWeekStart;

  return {
    settings,
    today,
    weekStart,
    weekStatus: week?.status ?? null,
    nextWeekStart,
    nextWeekStatus: nextWeek?.status ?? null,
    planTarget,
    roles: roleList,
    mission: mission
      ? { hasContent: mission.content.trim().length > 0, updatedAt: mission.updatedAt, reviewedAt: mission.reviewedAt }
      : { hasContent: false, updatedAt: null, reviewedAt: null },
    counts: { inbox: inboxRows.length, checkinsDue: checkinRows.length },
    dev,
  };
}

export const coreRoutes = (ctx: AppContext) =>
  new Hono<ApiEnv>()
    .get("/bootstrap", async (c) => c.json(await bootstrap(c.var.scope, ctx.dev)))
    .get("/settings", async (c) => c.json(await getSettings(c.var.scope)))
    .patch("/settings", v("json", settingsPatch), async (c) =>
      c.json(await updateSettings(c.var.scope, c.req.valid("json") as Partial<Settings>)),
    )
    .post("/onboarding", v("json", onboardingSchema), async (c) => {
      const input = c.req.valid("json");
      const s = c.var.scope;
      const created = await s.db.transaction(async (tx) => {
        const ts: Scope = { ...s, db: tx };
        let order = await nextRoleSortOrder(ts);
        const existing = await listRoles(ts);
        const byName = new Map(existing.map((r) => [r.name.toLowerCase(), r.id]));
        const roleIds: (string | null)[] = [];
        for (const [i, r] of input.roles.entries()) {
          const known = byName.get(r.name.toLowerCase());
          if (known) {
            roleIds.push(known);
            continue;
          }
          const [row] = await tx
            .insert(roles)
            .values({
              userId: s.userId,
              name: r.name,
              description: r.description ?? "",
              color: r.color ?? ROLE_COLORS[i % ROLE_COLORS.length],
              sortOrder: order++,
            })
            .returning();
          byName.set(r.name.toLowerCase(), row.id);
          roleIds.push(row.id);
        }
        await ensureSawRole(ts);
        const pick = (idx: number | null | undefined) => (idx != null && idx >= 0 ? (roleIds[idx] ?? null) : null);
        if (input.openingPersonal.trim()) {
          await tx.insert(goals).values({
            userId: s.userId,
            title: input.openingPersonal.trim(),
            roleId: pick(input.openingPersonalRole),
            endInMind: "Done regularly, this would make a tremendous positive difference in my personal life.",
          });
        }
        if (input.openingProfessional.trim()) {
          await tx.insert(goals).values({
            userId: s.userId,
            title: input.openingProfessional.trim(),
            roleId: pick(input.openingProfessionalRole),
            endInMind: "Done regularly, this would make a tremendous positive difference in my work.",
          });
        }
        const [mission] = await tx
          .select()
          .from(missions)
          .where(and(eq(missions.userId, s.userId), eq(missions.kind, "personal")))
          .limit(1);
        if (!mission) {
          await tx.insert(missions).values({ userId: s.userId, kind: "personal", title: "My mission", content: input.mission });
        } else if (input.mission.trim() && !mission.content.trim()) {
          await tx.update(missions).set({ content: input.mission }).where(eq(missions.id, mission.id));
        }
        return roleIds.length;
      });
      const settings = await updateSettings(s, {
        displayName: input.displayName,
        weekStartsOn: input.weekStartsOn as WeekStartsOn,
        planningDay: input.planningDay,
        dayStartHour: input.dayStartHour,
        dayEndHour: Math.max(input.dayEndHour, input.dayStartHour + 1),
        openingPersonal: input.openingPersonal,
        openingProfessional: input.openingProfessional,
        onboarded: true,
      });
      return c.json({ settings, rolesCreated: created });
    })
    .get("/data/info", async (c) => c.json({ dev: ctx.dev, counts: await countAll(c.var.scope) }))
    .get("/data/export", async (c) => {
      const s = c.var.scope;
      const data = await exportAll(s);
      c.header("Content-Disposition", `attachment; filename="compass-export-${s.today}.json"`);
      return c.json(data);
    })
    .post("/data/import", v("json", z.object({ confirm: z.literal("REPLACE"), data: z.record(z.string(), z.unknown()) })), async (c) => {
      const { data } = c.req.valid("json");
      try {
        const counts = await importAll(c.var.scope, data as Parameters<typeof importAll>[1]);
        return c.json({ ok: true as const, counts });
      } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : "Import failed" }, 400);
      }
    })
    .post("/data/demo", async (c) => {
      if (!ctx.dev) return c.json({ error: "Sample data is only available in development mode." }, 403);
      return c.json(await seedDemo(c.var.scope));
    });
