import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useQuery } from "@tanstack/react-query";
import { Check, Hand, Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/format";
import { useBootstrap, useNow } from "@/lib/hooks";
import { useTaskActions } from "@/lib/mutations";
import { goalsQuery, missionQuery, taskQuery } from "@/lib/queries";
import { useAppState } from "./app-state";
import { QuadrantBadge, RoleBadge } from "./badges";
import { MeterRing } from "./meter";

/** One thing, with the "why" chain above it. Everything else can wait. */
export function FocusMode() {
  const { focusId, closeFocus } = useAppState();
  if (!focusId) return null;
  return <FocusView key={focusId} id={focusId} onClose={closeFocus} />;
}

/** "1 hour 5 minutes", "12 minutes", "less than a minute": the ring's reading for screen readers. */
function inWords(seconds: number) {
  const total = Math.floor(seconds / 60);
  if (total < 1) return "less than a minute";
  const h = Math.floor(total / 60);
  const m = total % 60;
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  return [h ? part(h, "hour") : "", m ? part(m, "minute") : ""].filter(Boolean).join(" ");
}

function FocusView({ id, onClose }: { id: string; onClose: () => void }) {
  const { roles } = useBootstrap();
  const { capture, openCapture } = useAppState();
  const { data: task } = useQuery(taskQuery(id));
  const { data: goals = [] } = useQuery(goalsQuery());
  const { data: mission } = useQuery(missionQuery());
  const { update } = useTaskActions();
  const doneRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Opened before the task loaded, the dialog focuses itself (Done doesn't exist yet; see `initialFocus`):
  // hand focus to Done once it does. Focus still outside means the dialog's own initial focus hasn't landed yet.
  // (Unless "Something came up" was opened with N meanwhile: focus is in that dialog then.)
  const loaded = !!task;
  const captureOpen = capture.open;
  useEffect(() => {
    if (!loaded || captureOpen) return;
    const popup = popupRef.current;
    const active = document.activeElement;
    if (active === popup || !popup?.contains(active)) doneRef.current?.focus();
    // Runs only when the task arrives: closing the capture dialog later returns focus to its own trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

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
  const reading = target
    ? elapsed < target
      ? `${inWords(target - elapsed)} left`
      : "Estimate reached"
    : `${inWords(elapsed)} elapsed`;

  return (
    // A modal dialog for the focus trap, initial focus on Done and focus returned on close. It never
    // closes itself: the Esc hotkey, the X and Done stay the only ways out (they also bank the time).
    // Base UI stops Escape at the popup, so let it through to the hotkey on the document.
    <DialogPrimitive.Root
      open
      modal
      disablePointerDismissal
      onOpenChange={(_open, details) => {
        details.cancel();
        if (details.reason === "escape-key") details.allowPropagation();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Popup
          ref={popupRef}
          aria-modal="true"
          aria-label="Focus mode"
          // Done, or the popup itself while the task loads.
          initialFocus={() => doneRef.current ?? popupRef.current}
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto overscroll-contain bg-background outline-hidden animate-in fade-in-0 zoom-in-98 duration-240"
        >
          <div className="flex h-14 shrink-0 items-center justify-between px-5">
            <p className="text-xs font-medium text-muted-foreground">Focus</p>
            <div className="flex items-center gap-2">
              <Kbd aria-hidden className="pointer-coarse:hidden">
                Esc
              </Kbd>
              {/* No tooltip (unlike IconButton): an open tooltip would take the first Esc from the hotkey. */}
              <Button variant="ghost" size="icon" onClick={close} aria-label="Leave focus mode">
                <X />
              </Button>
            </div>
          </div>
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-10 px-6 pb-16 text-center">
            {task ? (
              <>
                <div className="flex flex-col items-center gap-6">
                  <div className="flex flex-col items-center gap-3">
                    {missionLine && <p className="line-clamp-2 max-w-[60ch] voice-sm text-muted-foreground italic">&ldquo;{missionLine}&rdquo;</p>}
                    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                      {role && <RoleBadge role={role} />}
                      {goal && (
                        <span>
                          toward <span className="font-medium text-foreground">{goal.title}</span>
                        </span>
                      )}
                      <QuadrantBadge q={task.quadrant} withLabel />
                    </div>
                  </div>
                  <h1 className="voice-display text-4xl text-foreground sm:text-5xl">{task.title}</h1>
                  {(task.why || task.endInMind) && (
                    <div className="max-w-[60ch] space-y-1 text-md text-muted-foreground">
                      {task.why && <p>Why: {task.why}</p>}
                      {task.endInMind && <p>Done looks like: {task.endInMind}</p>}
                    </div>
                  )}
                </div>

                <MeterRing
                  value={progress ?? 0}
                  size={200}
                  className="max-sm:size-40"
                  label={target ? "Time against the estimate" : "Time spent"}
                  valueText={reading}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-semibold text-foreground tabular-nums sm:text-4xl">
                      {mm}:{ss}
                    </span>
                    {target && <span className="mt-1 text-xs text-muted-foreground tabular-nums">Estimate {formatDuration(task.estimateMinutes ?? 0)}</span>}
                  </div>
                </MeterRing>

                <div className="flex flex-col items-center gap-4">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button variant="outline" size="xl" onClick={toggleRunning}>
                      {running ? <Pause /> : <Play />} {running ? "Pause" : "Resume"}
                    </Button>
                    <Button
                      ref={doneRef}
                      size="xl"
                      onClick={() => {
                        persist({ status: "done" });
                        onClose();
                      }}
                    >
                      <Check /> Done
                    </Button>
                    <Button variant="ghost" size="xl" onClick={() => openCapture({ mode: "interruption" })}>
                      <Hand /> Something came up
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="pointer-coarse:hidden">Esc to leave. </span>Time spent is added to this item.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex w-full flex-col items-center gap-10" aria-hidden>
                <div className="flex w-full flex-col items-center gap-4">
                  <Skeleton className="h-4 w-2/3 max-w-md" />
                  <Skeleton className="h-10 w-4/5 max-w-lg sm:h-12" />
                </div>
                <Skeleton className="size-40 rounded-full border-3 border-muted bg-transparent sm:size-50" />
                <div className="flex gap-2">
                  <Skeleton className="h-11 w-28" />
                  <Skeleton className="h-11 w-28" />
                </div>
              </div>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
