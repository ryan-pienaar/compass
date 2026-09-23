import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import { z } from "zod";
import { isValidISODate } from "../../shared/dates.ts";

/** zValidator with a consistent 400 error body. */
export function v<T extends z.ZodType, Target extends keyof ValidationTargets>(target: Target, schema: T) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: "Invalid input",
          issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        400,
      );
    }
  });
}

export const isoDate = z.string().refine(isValidISODate, "Expected a real date as YYYY-MM-DD");
export const idParam = z.object({ id: z.string().min(1) });
export const startParam = z.object({ start: isoDate });
export const quadrantNum = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export const minuteOfDay = z.number().int().min(0).max(1440);
export const sawDimension = z.enum(["physical", "mental", "spiritual", "social"]);
