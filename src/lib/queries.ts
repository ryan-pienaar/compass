import { queryOptions } from "@tanstack/react-query";
import { api, call } from "./api";

export const qk = {
  bootstrap: ["bootstrap"] as const,
  settings: ["settings"] as const,
  roles: (all = false) => ["roles", { all }] as const,
  goals: ["goals"] as const,
  mission: ["mission"] as const,
  affirmations: ["affirmations"] as const,
  week: (start: string) => ["week", start] as const,
  weekReview: (start: string) => ["weekReview", start] as const,
  weeks: (limit: number) => ["weeks", limit] as const,
  tasks: (params: TaskQuery) => ["tasks", params] as const,
  task: (id: string) => ["task", id] as const,
  today: (date: string) => ["today", date] as const,
  concerns: ["concerns"] as const,
  delegations: ["delegations"] as const,
  journal: (params: JournalQuery) => ["journal", params] as const,
  audits: ["audits"] as const,
  timeEntries: (from: string, to: string) => ["timeEntries", from, to] as const,
  challenge: ["challenge"] as const,
  assessments: (kind?: "urgency" | "center") => ["assessments", kind ?? "all"] as const,
  insights: (weeks: number) => ["insights", weeks] as const,
  dataInfo: ["dataInfo"] as const,
};

export interface TaskQuery {
  view?: "open" | "inbox" | "done" | "all" | "backlog" | "dropped";
  roleId?: string;
  goalId?: string;
  kind?: "task" | "goal";
}

export interface JournalQuery {
  kind?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export const bootstrapQuery = () =>
  queryOptions({ queryKey: qk.bootstrap, queryFn: () => call(api.bootstrap.$get()), staleTime: 5_000 });

export const rolesQuery = (all = false) =>
  queryOptions({ queryKey: qk.roles(all), queryFn: () => call(api.roles.$get({ query: all ? { all: "1" } : {} })) });

export const goalsQuery = () => queryOptions({ queryKey: qk.goals, queryFn: () => call(api.goals.$get()) });

export const missionQuery = () => queryOptions({ queryKey: qk.mission, queryFn: () => call(api.mission.$get()) });

export const affirmationsQuery = () =>
  queryOptions({ queryKey: qk.affirmations, queryFn: () => call(api.affirmations.$get()) });

export const weekQuery = (start: string) =>
  queryOptions({ queryKey: qk.week(start), queryFn: () => call(api.weeks[":start"].$get({ param: { start } })) });

export const weekReviewQuery = (start: string) =>
  queryOptions({
    queryKey: qk.weekReview(start),
    queryFn: () => call(api.weeks[":start"].review.$get({ param: { start } })),
  });

export const weeksQuery = (limit = 12) =>
  queryOptions({ queryKey: qk.weeks(limit), queryFn: () => call(api.weeks.$get({ query: { limit: String(limit) } })) });

export const tasksQuery = (params: TaskQuery = {}) =>
  queryOptions({ queryKey: qk.tasks(params), queryFn: () => call(api.tasks.$get({ query: params })) });

export const taskQuery = (id: string) =>
  queryOptions({ queryKey: qk.task(id), queryFn: () => call(api.tasks[":id"].$get({ param: { id } })) });

export const todayQuery = (date: string) =>
  queryOptions({ queryKey: qk.today(date), queryFn: () => call(api.today.$get({ query: { date } })) });

export const concernsQuery = () => queryOptions({ queryKey: qk.concerns, queryFn: () => call(api.concerns.$get()) });

export const delegationsQuery = () =>
  queryOptions({ queryKey: qk.delegations, queryFn: () => call(api.delegations.$get()) });

export const journalQuery = (params: JournalQuery = {}) =>
  queryOptions({
    queryKey: qk.journal(params),
    queryFn: () =>
      call(
        api.journal.$get({
          query: {
            ...(params.kind ? { kind: params.kind } : {}),
            ...(params.from ? { from: params.from } : {}),
            ...(params.to ? { to: params.to } : {}),
            ...(params.limit ? { limit: String(params.limit) } : {}),
          },
        }),
      ),
  });

export const auditsQuery = () => queryOptions({ queryKey: qk.audits, queryFn: () => call(api.audits.$get()) });

export const timeEntriesQuery = (from: string, to: string) =>
  queryOptions({ queryKey: qk.timeEntries(from, to), queryFn: () => call(api["time-entries"].$get({ query: { from, to } })) });

export const challengeQuery = () => queryOptions({ queryKey: qk.challenge, queryFn: () => call(api.challenge.$get()) });

export const assessmentsQuery = (kind?: "urgency" | "center") =>
  queryOptions({
    queryKey: qk.assessments(kind),
    queryFn: () => call(api.assessments.$get({ query: kind ? { kind } : {} })),
  });

export const insightsQuery = (weeks = 12) =>
  queryOptions({ queryKey: qk.insights(weeks), queryFn: () => call(api.insights.$get({ query: { weeks: String(weeks) } })) });

export const dataInfoQuery = () => queryOptions({ queryKey: qk.dataInfo, queryFn: () => call(api.data.info.$get()) });
