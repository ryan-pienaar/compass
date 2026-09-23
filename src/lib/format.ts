import { format, isValid } from "date-fns";
import { addDaysISO, daysBetween, fromISODate } from "@shared/dates.ts";

export { formatDuration, formatMinutes, formatWeekRange } from "@shared/dates.ts";

export function fmtDate(iso: string | null | undefined, pattern = "EEE d MMM"): string {
  if (!iso) return "";
  const d = iso.length > 10 ? new Date(iso) : fromISODate(iso);
  return isValid(d) ? format(d, pattern) : "";
}

/** "Today", "Tomorrow", "Yesterday", weekday within a week, otherwise a date. */
export function relativeDay(iso: string | null | undefined, today: string): string {
  if (!iso) return "";
  if (iso === today) return "Today";
  if (iso === addDaysISO(today, 1)) return "Tomorrow";
  if (iso === addDaysISO(today, -1)) return "Yesterday";
  const diff = daysBetween(today, iso);
  if (diff > 0 && diff < 7) return fmtDate(iso, "EEEE");
  return fmtDate(iso, diff > 300 || diff < -300 ? "d MMM yyyy" : "EEE d MMM");
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function pct(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return "–";
  return `${(n * 100).toFixed(digits)}%`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function hoursLabel(minutes: number): string {
  if (minutes === 0) return "0h";
  const h = minutes / 60;
  return `${h % 1 === 0 ? h.toFixed(0) : h.toFixed(1)}h`;
}
