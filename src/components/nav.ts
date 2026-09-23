import {
  CalendarDays,
  ChartColumn,
  Compass,
  Grid2x2,
  HeartHandshake,
  ListChecks,
  NotebookPen,
  Orbit,
  Sun,
  Target,
  type LucideIcon,
} from "lucide-react";

export type NavPath =
  | "/today"
  | "/week"
  | "/matrix"
  | "/tasks"
  | "/compass"
  | "/roles"
  | "/influence"
  | "/stewardships"
  | "/journal"
  | "/insights";

export interface NavItem {
  to: NavPath;
  label: string;
  icon: LucideIcon;
  hint: string;
}

export const NAV_GROUPS: { label: string; habit: string; items: NavItem[] }[] = [
  {
    label: "Put first things first",
    habit: "Habit 3",
    items: [
      { to: "/today", label: "Today", icon: Sun, hint: "Daily adapting" },
      { to: "/week", label: "Week", icon: CalendarDays, hint: "Your weekly compass" },
      { to: "/matrix", label: "Matrix", icon: Grid2x2, hint: "Urgent × important" },
      { to: "/tasks", label: "Tasks", icon: ListChecks, hint: "Everything open" },
      { to: "/stewardships", label: "Stewardships", icon: HeartHandshake, hint: "Delegation" },
    ],
  },
  {
    label: "Begin with the end in mind",
    habit: "Habit 2",
    items: [
      { to: "/compass", label: "Compass", icon: Compass, hint: "Mission & affirmations" },
      { to: "/roles", label: "Roles & goals", icon: Target, hint: "Who you are, where you are going" },
    ],
  },
  {
    label: "Be proactive",
    habit: "Habit 1",
    items: [
      { to: "/influence", label: "Influence", icon: Orbit, hint: "Circle of Influence" },
      { to: "/journal", label: "Journal", icon: NotebookPen, hint: "Reflection" },
      { to: "/insights", label: "Insights", icon: ChartColumn, hint: "Where your time goes" },
    ],
  },
];
