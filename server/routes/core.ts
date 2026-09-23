import { and, asc, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { ROLE_COLORS } from "../../shared/content.ts";
import type { Settings } from "../../shared/settings.ts";
import { addWeeksISO, todayISO, weekStartFor, type WeekStartsOn } from "../../shared/dates.ts";
import type { AppContext } from "../context.ts";
import { backupDatabase, listBackups } from "../db/client.ts";
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

export const coreRoutes = (ctx: AppContext) =>
  new Hono()
    .get("/bootstrap", (c) => {
      const { db } = ctx;
      const settings = getSettings(db);
      const today = todayISO();
      const weekStart = weekStartFor(today, settings.weekStartsOn);
      const nextWeekStart = addWeeksISO(weekStart, 1);
      const week = getWeek(db, weekStart);
      const nextWeek = getWeek(db, nextWeekStart);
      const mission = db.select().from(missions).where(eq(missions.kind, "personal")).orderBy(asc(missions.createdAt)).get();
      const inbox = db
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(eq(tasks.status, "open"), eq(tasks.kind, "task"), isNull(tasks.important), isNull(tasks.roleId), isNull(tasks.goalId)),
        )
        .all().length;
      const checkinsDue = db
        .select({ id: delegations.id })
        .from(delegations)
        .where(and(eq(delegations.status, "active"), isNotNull(delegations.nextCheckin), lte(delegations.nextCheckin, today)))
        .all().length;

      // Which week the weekly ritual should target right now.
      const dow = new Date().getDay();
      const lastDayOfWeek = (settings.weekStartsOn + 6) % 7;
      const currentPlanned = week ? week.status !== "draft" : false;
      const nextPlanned = nextWeek ? nextWeek.status !== "draft" : false;
      let planTarget: string | null = null;
      if (!currentPlanned) planTarget = weekStart;
      else if (!nextPlanned && (dow === settings.planningDay || dow === lastDayOfWeek)) planTarget = nextWeekStart;

      return c.json({
        settings,
        today,
        weekStart,
        weekStatus: week?.status ?? null,
        nextWeekStart,
        nextWeekStatus: nextWeek?.status ?? null,
        planTarget,
        roles: listRoles(db),
        mission: mission
          ? { hasContent: mission.content.trim().length > 0, updatedAt: mission.updatedAt, reviewedAt: mission.reviewedAt }
          : { hasContent: false, updatedAt: null, reviewedAt: null },
        counts: { inbox, checkinsDue },
        dev: ctx.dev,
      });
    })
    .get("/settings", (c) => c.json(getSettings(ctx.db)))
    .patch("/settings", v("json", settingsPatch), (c) =>
      c.json(updateSettings(ctx.db, c.req.valid("json") as Partial<Settings>)),
    )
    .post("/onboarding", v("json", onboardingSchema), (c) => {
      const input = c.req.valid("json");
      const { db } = ctx;
      const created = db.transaction((tx) => {
        const txdb = tx as unknown as typeof db;
        let order = nextRoleSortOrder(txdb);
        const existing = new Set(listRoles(txdb).map((r) => r.name.toLowerCase()));
        const roleIds: (string | null)[] = input.roles.map((r, i) => {
          if (existing.has(r.name.toLowerCase())) {
            return listRoles(txdb).find((x) => x.name.toLowerCase() === r.name.toLowerCase())?.id ?? null;
          }
          const row = tx
            .insert(roles)
            .values({
              name: r.name,
              description: r.description ?? "",
              color: r.color ?? ROLE_COLORS[i % ROLE_COLORS.length],
              sortOrder: order++,
            })
            .returning()
            .get();
          return row.id;
        });
        ensureSawRole(txdb);
        const pick = (idx: number | null | undefined) => (idx != null && idx >= 0 ? (roleIds[idx] ?? null) : null);
        if (input.openingPersonal.trim()) {
          tx.insert(goals)
            .values({
              title: input.openingPersonal.trim(),
              roleId: pick(input.openingPersonalRole),
              endInMind: "Done regularly, this would make a tremendous positive difference in my personal life.",
            })
            .run();
        }
        if (input.openingProfessional.trim()) {
          tx.insert(goals)
            .values({
              title: input.openingProfessional.trim(),
              roleId: pick(input.openingProfessionalRole),
              endInMind: "Done regularly, this would make a tremendous positive difference in my work.",
            })
            .run();
        }
        const mission = tx.select().from(missions).where(eq(missions.kind, "personal")).get();
        if (!mission) {
          tx.insert(missions).values({ kind: "personal", title: "My mission", content: input.mission }).run();
        } else if (input.mission.trim() && !mission.content.trim()) {
          tx.update(missions).set({ content: input.mission }).where(eq(missions.id, mission.id)).run();
        }
        return roleIds.length;
      });
      const settings = updateSettings(db, {
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
    .get("/data/info", (c) =>
      c.json({
        dbPath: ctx.dbPath,
        dev: ctx.dev,
        counts: countAll(ctx.db),
        backups: listBackups(ctx.dbPath).slice(0, 20),
      }),
    )
    .get("/data/export", (c) => {
      const data = exportAll(ctx.db);
      const stamp = todayISO();
      c.header("Content-Disposition", `attachment; filename="compass-export-${stamp}.json"`);
      return c.json(data);
    })
    .post("/data/import", v("json", z.object({ confirm: z.literal("REPLACE"), data: z.record(z.string(), z.unknown()) })), (c) => {
      const { data } = c.req.valid("json");
      const backup = ctx.dbPath === ":memory:" ? null : backupDatabase(ctx.client, ctx.dbPath, { label: "pre-import" });
      try {
        const counts = importAll(ctx.db, ctx.client, data as Parameters<typeof importAll>[2]);
        return c.json({ ok: true as const, counts, backup });
      } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : "Import failed", backup }, 400);
      }
    })
    .post("/data/backup", (c) => {
      if (ctx.dbPath === ":memory:") return c.json({ error: "In-memory database" }, 400);
      return c.json({ file: backupDatabase(ctx.client, ctx.dbPath, { label: "manual" }) });
    })
    .post("/data/demo", (c) => {
      if (!ctx.dev) return c.json({ error: "Sample data is only available in development mode." }, 403);
      return c.json(seedDemo(ctx.db));
    });
