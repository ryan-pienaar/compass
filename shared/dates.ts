import { TZDate } from "@date-fns/tz";
import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns";

/** 0 = Sunday ... 6 = Saturday (same convention as Date#getDay and date-fns). */
export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Calendar dates are stored as local "YYYY-MM-DD" strings, never UTC timestamps. */
export type ISODate = string;

export const toISODate = (d: Date): ISODate => format(d, "yyyy-MM-dd");

/** date-fns parses date-only ISO strings as local midnight (unlike `new Date("2026-01-01")`). */
export const fromISODate = (s: ISODate): Date => parseISO(s);

export const todayISO = (): ISODate => toISODate(new Date());

/** The local calendar date of a stored timestamp (timestamps are stored as UTC ISO strings). */
export const localDateOf = (timestamp: string): ISODate => toISODate(new Date(timestamp));

/*
 * Time-zone aware versions for the server, which runs in UTC while each user lives in their
 * own zone. The browser sends its IANA zone with every request.
 */

/** Whether this runtime knows an IANA time zone name. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** The calendar date of an instant in a time zone. */
export const dateInZone = (instant: Date | string | number, timeZone: string): ISODate =>
  toISODate(new TZDate(new Date(instant).getTime(), timeZone));

/** Today's date in a time zone. */
export const todayInZone = (timeZone: string): ISODate => dateInZone(Date.now(), timeZone);

/** Today's day of the week in a time zone (0 = Sunday). */
export const weekdayInZone = (timeZone: string): number => new TZDate(Date.now(), timeZone).getDay();

/** Midnight at the start of `date` in a time zone, as a UTC ISO timestamp for range queries. */
export function startOfDayInZone(date: ISODate, timeZone: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(new TZDate(y, m - 1, d, timeZone).getTime()).toISOString();
}

export function weekStartFor(date: Date | ISODate, weekStartsOn: WeekStartsOn): ISODate {
  const d = typeof date === "string" ? fromISODate(date) : date;
  return toISODate(startOfWeek(d, { weekStartsOn }));
}

export function weekDays(weekStart: ISODate): ISODate[] {
  const start = fromISODate(weekStart);
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(start, i)));
}

export function addDaysISO(date: ISODate, days: number): ISODate {
  return toISODate(addDays(fromISODate(date), days));
}

export function addWeeksISO(weekStart: ISODate, weeks: number): ISODate {
  return addDaysISO(weekStart, weeks * 7);
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return differenceInCalendarDays(fromISODate(b), fromISODate(a));
}

export function isValidISODate(s: unknown): s is ISODate {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(fromISODate(s).getTime());
}

/** Minutes since midnight -> "07:30". */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function snapMinutes(min: number, step = 15): number {
  return Math.round(min / step) * step;
}

export function formatWeekRange(weekStart: ISODate): string {
  const start = fromISODate(weekStart);
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameMonth) return `${format(start, "d")}–${format(end, "d MMM yyyy")}`;
  if (sameYear) return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
  return `${format(start, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`;
}
