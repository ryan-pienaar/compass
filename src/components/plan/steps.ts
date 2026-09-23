export const PLAN_STEPS = ["review", "compass", "roles", "goals", "schedule", "commit"] as const;
export type PlanStep = (typeof PLAN_STEPS)[number];

export const STEP_LABELS: Record<PlanStep, { label: string; hint: string }> = {
  review: { label: "Review", hint: "Close out last week" },
  compass: { label: "Compass", hint: "Reconnect with what matters" },
  roles: { label: "Roles", hint: "Who you'll be this week" },
  goals: { label: "Big rocks", hint: "1–2 results per role" },
  schedule: { label: "Schedule", hint: "Put the rocks in first" },
  commit: { label: "Commit", hint: "Make it a promise" },
};
