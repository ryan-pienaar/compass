import { useQuery } from "@tanstack/react-query";
import { Check, Hand, Pause, Play, X } from "lucide-react";
import { useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";
import { useBootstrap, useNow } from "@/lib/hooks";
import { useTaskActions } from "@/lib/mutations";
import { goalsQuery, missionQuery, taskQuery } from "@/lib/queries";
import { useAppState } from "./app-state";
import { QuadrantBadge, RoleBadge } from "./badges";

/** One thing, with the "why" chain above it. Everything else can wait. */
export function FocusMode() {
  const { focusId, closeFocus } = useAppState();
  if (!focusId) return null;
  return <FocusView key={focusId} id={focusId} onClose={closeFocus} />;
}

function FocusView({ id, onClose }: { id: string; onClose: () => void }) {
  const { roles } = useBootstrap();
  const { capture, openCapture } = useAppState();
  const { data: task } = useQuery(taskQuery(id));
  const { data: goals = [] } = useQuery(goalsQuery());
  const { data: mission } = useQuery(missionQuery());
  const { update } = useTaskActions();

  // Measured against the wall clock: browsers throttle timers in background tabs, so counting ticks undercounts.
  const [banked, setBanked] = useState(0); // ms from earlier runs
  const [runStart, setRunStart] = useState<number | null>(() => Date.now()); // null while paused
  const running = runStart != null;
  const now = useNow(1000).getTime();
  const elapsedMs = (at: number) => banked + (runStart != null ? Math.max(0, at - runStart) : 0);
  const elapsed = Math.round(elapsedMs(now) / 1000); // seconds; ticks land just under each whole second
  const saved = useRef(false);

  const toggleRunning = () => {
    const at = Date.now();
    if (runStart != null) {
      setBanked(elapsedMs(at));
      setRunStart(null);
    } else {
      setRunStart(at);
    }
  };

  const persist = (extra: { status?: "done" } = {}) => {
    if (!task || saved.current) return;
    const minutes = Math.round(elapsedMs(Date.now()) / 60_000);
    if (minutes >= 1 || extra.status) {
      saved.current = true;
      update.mutate({ id: task.id, actualMinutes: task.actualMinutes + minutes, ...extra });
    }
  };

  const close = () => {
    persist();
    onClose();
  };
  // While "Something came up" is open, Esc belongs to that dialog.
  useHotkeys("escape", close, { enableOnFormTags: true, enabled: !capture.open }, [banked, runStart, task]);

  const role = roles.find((r) => r.id === task?.roleId);
  const goal = goals.find((g) => g.id === task?.goalId);
  const missionLine = mission?.mission.content.trim().split(/\n\s*\n/)[0] ?? "";
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const target = task?.estimateMinutes ? task.estimateMinutes * 60 : null;
  const progress = target ? Math.min(1, elapsed / target) : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/97 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Focus mode">
      <div className="flex items-center justify-between p-4">
        <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Focus</div>
        <Button variant="ghost" size="icon" onClick={close} aria-label="Leave focus mode">
          <X />
        </Button>
      </div>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 pb-16">
        {task ? (
          <>
            <div className="space-y-3 text-sm text-muted-foreground">
              {missionLine && <p className="compass-text line-clamp-2 italic">&ldquo;{missionLine}&rdquo;</p>}
              <div className="flex flex-wrap items-center gap-2">
                {role && <RoleBadge role={role} />}
                {goal && <span>toward <span className="font-medium text-foreground">{goal.title}</span></span>}
                <QuadrantBadge q={task.quadrant} withLabel />
              </div>
            </div>
            <h1 className="compass-display text-4xl leading-tight sm:text-5xl">{task.title}</h1>
            {(task.why || task.endInMind) && (
              <div className="space-y-1 text-muted-foreground">
                {task.why && <p>Why: {task.why}</p>}
                {task.endInMind && <p>Done looks like: {task.endInMind}</p>}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-4">
              <div className="font-mono text-5xl tabular-nums">
                {mm}:{ss}
              </div>
              {target && (
                <div className="min-w-40 flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(progress ?? 0) * 100}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Estimate {formatDuration(task.estimateMinutes ?? 0)}</div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={toggleRunning}>
                {running ? <Pause /> : <Play />} {running ? "Pause" : "Resume"}
              </Button>
              <Button
                onClick={() => {
                  persist({ status: "done" });
                  onClose();
                }}
              >
                <Check /> Done
              </Button>
              <Button variant="ghost" onClick={() => openCapture({ mode: "interruption" })}>
                <Hand /> Something came up
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Esc to leave. Time spent is added to this item.</p>
          </>
        ) : (
          <p className="text-muted-foreground">Loading…</p>
        )}
      </div>
    </div>
  );
}
