import type { WeekBoard } from "@/lib/api";
import { StepHeader } from "@/components/page";
import { WeekPlanner } from "@/components/week/week-planner";
import { WeekStats } from "@/components/week/week-stats";

/**
 * On the plan route the step header, lede and stats already take half a laptop screen, so fitting
 * the planner under them would leave it a sliver. Instead it is sized to fill the space between the
 * sticky bars once the page scrolls past the header: top bar 3rem + plan header 3.5rem, 1rem above
 * and below, action bar 4.375rem (≈ 12.9rem).
 */
const PLANNER_HEIGHT = "calc(100svh - 13rem)";

export function StepSchedule({ board }: { board: WeekBoard }) {
  return (
    <div>
      <StepHeader
        className="mb-6"
        title="Schedule your priorities"
        lede={
          <>
            Don&apos;t prioritize your schedule: schedule your priorities. Drag each rock onto a day, or better, onto a time. Then check the
            appointments already there: keep, move or cancel them in light of your goals.
          </>
        }
      />
      <WeekStats board={board} className="mb-4" />
      <WeekPlanner start={board.week.startDate} height={PLANNER_HEIGHT} />
    </div>
  );
}
