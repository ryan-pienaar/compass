import type { WeekStartsOn } from "./dates.ts";

export type LanguageCoachMode = "off" | "strong" | "all";
export type ThemePreference = "system" | "light" | "dark";

export interface Settings {
  displayName: string;
  /** 0 = Sunday ... 6 = Saturday */
  weekStartsOn: WeekStartsOn;
  /** The day you do your weekly planning (0 = Sunday). */
  planningDay: number;
  /** Calendar grid bounds (hours, 0-24). Also the "waking hours" used for capacity. */
  dayStartHour: number;
  dayEndHour: number;
  defaultBlockMinutes: number;
  /** A task due within this many days (0 = today only) counts as urgent unless you say otherwise. */
  urgentWithinDays: number;
  /** Share of waking hours you aim to plan; the rest is room for people and the unexpected. */
  capacityTarget: number;
  languageCoach: LanguageCoachMode;
  theme: ThemePreference;
  onboarded: boolean;
  /** Answers to the two opening questions of Habit 3. */
  openingPersonal: string;
  openingProfessional: string;
}

export const DEFAULT_SETTINGS: Settings = {
  displayName: "",
  weekStartsOn: 1,
  planningDay: 0,
  dayStartHour: 6,
  dayEndHour: 22,
  defaultBlockMinutes: 60,
  urgentWithinDays: 1,
  capacityTarget: 0.6,
  languageCoach: "strong",
  theme: "system",
  onboarded: false,
  openingPersonal: "",
  openingProfessional: "",
};

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
