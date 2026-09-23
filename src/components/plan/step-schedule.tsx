import type { WeekBoard } from "@/lib/api";
import { WeekPlanner } from "@/components/week/week-planner";
import { WeekStats } from "@/components/week/week-stats";

export function StepSchedule({ board }: { board: WeekBoard }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="compass-display text-2xl">Schedule your priorities</h2>
          <p className="text-sm text-muted-foreground">
            Don&apos;t prioritize your schedule: schedule your priorities. Drag each rock onto a day, or better, onto a time. Then
            check the appointments already there: keep, move or cancel them in light of your goals.
          </p>
        </div>
      </div>
      <WeekStats board={board} />
      <WeekPlanner start={board.week.startDate} height="calc(100svh - 19rem)" />
    </div>
  );
}
