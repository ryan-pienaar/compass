import { useQuery } from "@tanstack/react-query";
import { Ban, CalendarClock, CircleX, Crosshair, Ellipsis, HeartHandshake, Hourglass, Mountain, Repeat, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { SAW_DIMENSIONS, type SawDimension } from "@shared/content.ts";
import { flagsForQuadrant, QUADRANTS } from "@shared/quadrant.ts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, call, type Task } from "@/lib/api";
import { fmtDate, relativeDay } from "@/lib/format";
import { useAutosave, useBootstrap } from "@/lib/hooks";
import { useApiMutation, useTaskActions, useToggleDone, type TaskPatch } from "@/lib/mutations";
import { taskQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useAppState } from "./app-state";
import { QuadrantBadge } from "./badges";
import { Chip } from "./chip";
import { DoneCheck } from "./done-check";
import { IconButton } from "./icon-button";
import { LanguageHint } from "./language-hint";
import { GroupLabel } from "./page";
import { DateField, EstimateSelect, GoalSelect, RoleSelect } from "./pickers";
import { QuadrantPicker } from "./quadrant-picker";
import { SaveStatus } from "./save-status";
import { Segmented } from "./segmented";
import { Callout } from "./surface";

export function TaskSheet() {
  const { taskId, closeTask } = useAppState();
  return (
    <Sheet open={!!taskId} onOpenChange={(o) => !o && closeTask()}>
      {/* The popup stays put and an inner column scrolls, so the close button (a direct child) never scrolls away; it sits above the sticky header. */}
      <SheetContent className="gap-0 overflow-hidden [&>button]:z-20">{taskId && <TaskEditor key={taskId} id={taskId} />}</SheetContent>
    </Sheet>
  );
}

function TaskEditor({ id }: { id: string }) {
  // Start from a fetch made after opening: the cache of a closed sheet can predate its last save.
  const { data: task, isFetchedAfterMount } = useQuery(taskQuery(id));
  if (!task || !isFetchedAfterMount) return <TaskEditorSkeleton />;
  return <TaskEditorForm task={task} />;
}

function TaskEditorSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="gap-0 border-b border-border-subtle px-5 pt-5 pb-4">
        <SheetTitle className="sr-only">Loading…</SheetTitle>
        <div className="flex items-center gap-3 pr-8">
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <Skeleton className="h-7 w-3/5" />
        </div>
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </SheetHeader>
      <div className="space-y-6 px-5 py-5">
        <Skeleton className="h-4 w-14" />
        <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="contents">
              <Skeleton className="h-4 w-20" />
              <Skeleton className={cn("h-9", i % 2 ? "w-2/5" : "w-3/5")} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The label column of the property grid. */
function PropertyLabel({ htmlFor, id, className, children }: { htmlFor?: string; id?: string; className?: string; children: ReactNode }) {
  return (
    <Label size="sm" htmlFor={htmlFor} id={id} className={cn("min-h-9 py-1", className)}>
      {children}
    </Label>
  );
}

/*
 * Label and value side by side at every width: stacked on a phone, the borderless (ghost) values
 * floated away from their labels. The 7rem label column leaves ~230px for values at 390px.
 */
const propertyGrid = "grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1";

/*
 * Below `sm` the sheet is full-screen and its footer is a phone action bar: Focus plus ⋯, with the
 * secondary actions (same handlers) in the menu, so the bar stays one row instead of stacking four.
 */
const NARROW = "(max-width: 639.98px)";
const subscribeNarrow = (onChange: () => void) => {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const useNarrow = () =>
  useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW).matches,
    () => false,
  );

function TaskEditorForm({ task }: { task: Task }) {
  const { today, weekStart, roles, settings } = useBootstrap();
  const { closeTask, openFocus } = useAppState();
  const { update, remove, prevent } = useTaskActions();
  const toggleDone = useToggleDone();
  const patch = (p: TaskPatch) => update.mutate({ id: task.id, ...p });
  const uid = useId();
  const narrow = useNarrow();
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const delegationRef = useRef<HTMLElement>(null);

  const [text, setText] = useState({
    title: task.title,
    why: task.why,
    endInMind: task.endInMind,
    ifThen: task.ifThen,
    notes: task.notes,
  });
  const saving = useAutosave(text, (t) => {
    if (!t.title.trim()) return;
    patch({ title: t.title.trim(), why: t.why, endInMind: t.endInMind, ifThen: t.ifThen, notes: t.notes });
  });

  const role = roles.find((r) => r.id === task.roleId);
  const isGoal = task.kind === "goal";
  const explicit = task.important != null || task.urgent != null;
  const [delegating, setDelegating] = useState(false);
  const [who, setWho] = useState("");
  const [result, setResult] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const delegate = useApiMutation(
    () =>
      call(
        api.delegations.$post({
          json: { title: task.title, delegate: who.trim(), desiredResults: result.trim(), checkinEveryDays: 7, roleId: task.roleId, taskId: task.id },
        }),
      ),
    { success: "Delegated. Track it under Stewardships.", onSuccess: () => closeTask() },
  );

  // The panel opens at the end of the scrolling body, which can be below the fold: bring it into view.
  useEffect(() => {
    if (delegating) delegationRef.current?.scrollIntoView({ block: "nearest" });
  }, [delegating]);

  const done = task.status === "done";
  const pastDue = task.status === "open" && !!task.dueDate && task.dueDate < today;
  const statusIcon = task.status === "dropped" ? task.statusReason === "declined" ? <Ban /> : <CircleX /> : <Hourglass />;

  return (
    // scroll-p* keeps a focused field clear of the sticky header and footer.
    <div className="flex min-h-0 flex-1 scroll-pt-40 scroll-pb-32 flex-col overflow-y-auto overscroll-contain">
      <SheetHeader className="sticky top-0 z-10 shrink-0 gap-0 border-b border-border-subtle bg-popover/95 px-5 pt-5 pb-4 backdrop-blur-md">
        <SheetTitle className="sr-only">Edit {isGoal ? "weekly goal" : "task"}</SheetTitle>
        <div className="flex items-start gap-3 pr-10">
          <DoneCheck
            size="lg"
            className="mt-2"
            done={done}
            color={role?.color}
            celebrate={isGoal && task.quadrant === 2}
            onToggle={() => toggleDone(task)}
            aria-label={done ? "Mark as not done" : "Mark as done"}
          />
          <Textarea
            ref={titleRef}
            variant="ghost"
            value={text.title}
            onChange={(e) => setText({ ...text, title: e.target.value })}
            rows={1}
            className="text-xl font-semibold"
            aria-label="Title"
          />
        </div>
        <LanguageHint className="mt-2" text={text.title} onChange={(title) => setText({ ...text, title })} returnFocusRef={titleRef} />
        <SheetDescription render={<div />} className="mt-3 flex flex-wrap items-center gap-2">
          <QuadrantBadge q={task.quadrant} withLabel />
          {isGoal && <Chip icon={<Mountain aria-hidden />}>Big rock</Chip>}
          {task.urgentReason === "due" && (
            <Chip tone={pastDue ? "warning" : "outline"} icon={<CalendarClock aria-hidden />}>
              Urgent: {pastDue ? "was due" : "due"} {relativeDay(task.dueDate, today)}
            </Chip>
          )}
          {task.carryCount > 0 && <Chip icon={<Repeat aria-hidden />}>Carried {task.carryCount}×</Chip>}
          <SaveStatus saving={saving} className="ml-auto" />
        </SheetDescription>
        {task.status !== "open" && task.status !== "done" && (
          <Callout
            tone="info"
            className="mt-3"
            icon={statusIcon}
            action={
              <Button
                variant="link"
                size="inline"
                className="pointer-coarse:after:absolute pointer-coarse:after:-inset-3"
                onClick={() => patch({ status: "open" })}
              >
                Reopen
              </Button>
            }
          >
            {task.status === "dropped" ? "Dropped" : "Missed"}
            {task.statusReason ? ` · ${task.statusReason.replace(/_/g, " ")}` : ""}
            {task.statusNote ? ` · ${task.statusNote}` : ""}
          </Callout>
        )}
      </SheetHeader>

      <div className="shrink-0 space-y-6 px-5 py-5">
        <section aria-labelledby={`${uid}-triage`}>
          {/* The id sits on the label text alone, so the section isn't named after the Reset button too. */}
          <GroupLabel
            label={<span id={`${uid}-triage`}>Triage</span>}
            action={
              explicit && (
                <Button
                  variant="link"
                  size="inline"
                  className="ml-auto text-xs pointer-coarse:after:absolute pointer-coarse:after:-inset-3.5"
                  onClick={() => patch({ important: null, urgent: null })}
                >
                  Reset to automatic
                </Button>
              )
            }
          />
          <QuadrantPicker
            size="sm"
            value={task.quadrant}
            onChange={(q) => patch(flagsForQuadrant(q, task.dueDate, today, settings.urgentWithinDays))}
          />
          <p className="mt-2 max-w-[60ch] text-xs text-muted-foreground">
            {task.quadrant ? QUADRANTS[task.quadrant].guidance : "Not triaged yet. Pick a quadrant, or link it to a role."}
            {!explicit && task.quadrant && " (Set automatically from its role/goal and deadline.)"}
          </p>
          <div className={cn(propertyGrid, "mt-4")}>
            <PropertyLabel htmlFor={`${uid}-role`}>Role</PropertyLabel>
            <RoleSelect id={`${uid}-role`} variant="ghost" value={task.roleId} onChange={(roleId) => patch({ roleId })} className="w-full" />
            <PropertyLabel htmlFor={`${uid}-goal`}>Long-term goal</PropertyLabel>
            <GoalSelect
              id={`${uid}-goal`}
              variant="ghost"
              value={task.goalId}
              onChange={(goalId) => patch({ goalId })}
              roleId={task.roleId}
              className="w-full"
            />
            {role?.isSaw && (
              <>
                <PropertyLabel id={`${uid}-saw`}>Renewal dimension</PropertyLabel>
                <div className="min-w-0">
                  {/* Four options (one long) outgrow the value column, so they wrap instead of overflowing. */}
                  <Segmented<SawDimension>
                    size="sm"
                    wrap
                    aria-labelledby={`${uid}-saw`}
                    value={task.sawDimension}
                    onChange={(sawDimension) => patch({ sawDimension })}
                    options={SAW_DIMENSIONS.map((d) => ({ value: d.key, label: d.label }))}
                  />
                </div>
              </>
            )}
          </div>
        </section>

        <section aria-labelledby={`${uid}-when`}>
          <GroupLabel id={`${uid}-when`} label="When" />
          <div className={propertyGrid}>
            <PropertyLabel htmlFor={`${uid}-planned`} className="flex-col items-start justify-center gap-0">
              Planned for
              <span className="font-normal">(not a deadline)</span>
            </PropertyLabel>
            <DateField
              id={`${uid}-planned`}
              variant="ghost"
              value={task.scheduledDate}
              onChange={(scheduledDate) => patch({ scheduledDate })}
              placeholder="Unscheduled"
              className="w-full"
            />
            <PropertyLabel htmlFor={`${uid}-due`}>Deadline</PropertyLabel>
            <DateField
              id={`${uid}-due`}
              variant="ghost"
              value={task.dueDate}
              onChange={(dueDate) => patch({ dueDate })}
              placeholder="No deadline"
              className="w-full"
            />
            <PropertyLabel>Daily priority</PropertyLabel>
            <div className="min-w-0">
              <Segmented<"A" | "B" | "C" | "none">
                size="sm"
                aria-label="Daily priority"
                value={task.priority ?? "none"}
                onChange={(p) => patch({ priority: p === "none" ? null : p })}
                options={[
                  { value: "A", label: "A" },
                  { value: "B", label: "B" },
                  { value: "C", label: "C" },
                  { value: "none", label: "–" },
                ]}
              />
            </div>
            <PropertyLabel htmlFor={`${uid}-estimate`}>Estimate</PropertyLabel>
            <EstimateSelect
              id={`${uid}-estimate`}
              variant="ghost"
              value={task.estimateMinutes}
              onChange={(estimateMinutes) => patch({ estimateMinutes })}
              className="w-full"
            />
          </div>
        </section>

        <section aria-labelledby={`${uid}-why`}>
          <GroupLabel id={`${uid}-why`} label="Why" />
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label size="sm" htmlFor={`${uid}-why-input`}>
                Why it matters (your bigger yes)
              </Label>
              <Input
                id={`${uid}-why-input`}
                value={text.why}
                onChange={(e) => setText({ ...text, why: e.target.value })}
                placeholder="What does this serve?"
              />
            </div>
            <div className="grid gap-1.5">
              <Label size="sm" htmlFor={`${uid}-end`}>
                End in mind: what does done look like?
              </Label>
              <Textarea
                id={`${uid}-end`}
                rows={2}
                value={text.endInMind}
                onChange={(e) => setText({ ...text, endInMind: e.target.value })}
                placeholder="Describe the result, not the activity."
              />
            </div>
            {isGoal && (
              <div className="grid gap-1.5">
                <Label size="sm" htmlFor={`${uid}-if-then`}>
                  If–then plan (for your most important rocks)
                </Label>
                <Input
                  id={`${uid}-if-then`}
                  value={text.ifThen}
                  onChange={(e) => setText({ ...text, ifThen: e.target.value })}
                  placeholder="If a meeting runs over, then I'll move my run to 18:00."
                />
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby={`${uid}-notes`}>
          <GroupLabel id={`${uid}-notes`} label="Notes" />
          <div className="grid gap-2">
            <Textarea aria-labelledby={`${uid}-notes`} rows={4} value={text.notes} onChange={(e) => setText({ ...text, notes: e.target.value })} />
            <LanguageHint text={text.notes} onChange={(notes) => setText({ ...text, notes })} />
          </div>
        </section>

        <p className="text-xs text-muted-foreground tabular-nums">
          Created {fmtDate(task.createdAt, "d MMM yyyy")}
          {task.createdQuadrant ? ` in Quadrant ${QUADRANTS[task.createdQuadrant as 1].numeral}` : ""}
          {task.completedAt ? ` · done ${fmtDate(task.completedAt, "d MMM")}` : ""}
          {task.preventionForId ? " · prevention step" : ""}
        </p>
      </div>

      {delegating && (
        <section
          ref={delegationRef}
          aria-labelledby={`${uid}-delegation`}
          className="mx-5 mb-5 grid shrink-0 gap-3 rounded-lg bg-muted p-3"
        >
          <div>
            <h3 id={`${uid}-delegation`} className="text-sm font-medium">
              Stewardship delegation
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Agree on the result, not the method. Add guidelines, resources and check-ins under Stewardships.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label size="sm" htmlFor={`${uid}-who`}>
              Who will own it?
            </Label>
            <Input id={`${uid}-who`} value={who} onChange={(e) => setWho(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label size="sm" htmlFor={`${uid}-result`}>
              Desired result, and by when
            </Label>
            <Textarea id={`${uid}-result`} rows={2} value={result} onChange={(e) => setResult(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button size="sm" disabled={!who.trim() || delegate.isPending} pending={delegate.isPending} onClick={() => delegate.mutate(undefined)}>
              <HeartHandshake /> Delegate
            </Button>
          </div>
        </section>
      )}

      {/* The buttons wrap in their own group so ⋯ stays at the end of the first row. */}
      <SheetFooter className="sticky bottom-0 z-10 shrink-0 items-start bg-popover/95 backdrop-blur-md">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {/* One primary at a time: while the delegation form is open, its Delegate is the primary. */}
          <Button size="sm" variant={delegating ? "outline" : "default"} className={cn(narrow && "flex-1")} onClick={() => openFocus(task.id)}>
            <Crosshair /> Focus
          </Button>
          {!narrow && (
            <>
              {isGoal ? (
                <Button variant="outline" size="sm" onClick={() => patch({ kind: "task", weekStart: null })}>
                  <Mountain /> Not a big rock
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => patch({ kind: "goal", weekStart })}>
                  <Mountain /> Make it a big rock this week
                </Button>
              )}
              {task.quadrant === 1 && (
                <Button variant="outline" size="sm" onClick={() => prevent.mutate({ id: task.id })}>
                  <ShieldCheck /> Prevent it recurring
                </Button>
              )}
              {!isGoal && task.status === "open" && (
                <Button variant="outline" size="sm" aria-expanded={delegating} onClick={() => setDelegating((d) => !d)}>
                  <HeartHandshake /> Delegate
                </Button>
              )}
            </>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<IconButton label="More actions" icon={<Ellipsis />} />} />
          <DropdownMenuContent align="end" side="top" className="w-auto">
            {narrow && (
              <>
                {isGoal ? (
                  <DropdownMenuItem onClick={() => patch({ kind: "task", weekStart: null })}>
                    <Mountain /> Not a big rock
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => patch({ kind: "goal", weekStart })}>
                    <Mountain /> Make it a big rock this week
                  </DropdownMenuItem>
                )}
                {task.quadrant === 1 && (
                  <DropdownMenuItem onClick={() => prevent.mutate({ id: task.id })}>
                    <ShieldCheck /> Prevent it recurring
                  </DropdownMenuItem>
                )}
                {!isGoal && task.status === "open" && (
                  <DropdownMenuItem aria-expanded={delegating} onClick={() => setDelegating((d) => !d)}>
                    <HeartHandshake /> Delegate
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
              </>
            )}
            {task.status === "open" && (
              // The guidance stays visible (it was the old button's title) and is the item's description.
              <DropdownMenuItem
                className="h-auto min-h-9 items-start py-2 pointer-coarse:h-auto pointer-coarse:min-h-11"
                aria-labelledby={`${uid}-say-no`}
                aria-describedby={`${uid}-say-no-hint`}
                onClick={() => patch({ status: "dropped", statusReason: "declined" })}
              >
                <Ban className="mt-0.5" />
                <span className="grid">
                  <span id={`${uid}-say-no`}>Say no</span>
                  <span id={`${uid}-say-no-hint`} className="text-xs text-muted-foreground">
                    Drop it with a bigger yes in mind
                  </span>
                </span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SheetFooter>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{task.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it permanently, including any focus time reserved for it. To keep a record instead, use “Say no”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                remove.mutate(task.id);
                closeTask();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
