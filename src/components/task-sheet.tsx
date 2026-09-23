import { useQuery } from "@tanstack/react-query";
import { Ban, Crosshair, Mountain, ShieldCheck, Trash2, Users2 } from "lucide-react";
import { useState } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { api, call, type Task } from "@/lib/api";
import { fmtDate, relativeDay } from "@/lib/format";
import { useAutosave, useBootstrap } from "@/lib/hooks";
import { useApiMutation, useTaskActions, useToggleDone, type TaskPatch } from "@/lib/mutations";
import { taskQuery } from "@/lib/queries";
import { useAppState } from "./app-state";
import { QuadrantBadge } from "./badges";
import { LanguageHint } from "./language-hint";
import { DateField, EstimateSelect, GoalSelect, RoleSelect } from "./pickers";
import { QuadrantPicker } from "./quadrant-picker";
import { Segmented } from "./segmented";

export function TaskSheet() {
  const { taskId, closeTask } = useAppState();
  return (
    <Sheet open={!!taskId} onOpenChange={(o) => !o && closeTask()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        {taskId && <TaskEditor key={taskId} id={taskId} />}
      </SheetContent>
    </Sheet>
  );
}

function TaskEditor({ id }: { id: string }) {
  // Start from a fetch made after opening: the cache of a closed sheet can predate its last save.
  const { data: task, isFetchedAfterMount } = useQuery(taskQuery(id));
  if (!task || !isFetchedAfterMount) {
    return (
      <SheetHeader>
        <SheetTitle>Loading…</SheetTitle>
      </SheetHeader>
    );
  }
  return <TaskEditorForm task={task} />;
}

function TaskEditorForm({ task }: { task: Task }) {
  const { today, weekStart, roles, settings } = useBootstrap();
  const { closeTask, openFocus } = useAppState();
  const { update, remove, prevent } = useTaskActions();
  const toggleDone = useToggleDone();
  const patch = (p: TaskPatch) => update.mutate({ id: task.id, ...p });

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

  const delegate = useApiMutation(
    () =>
      call(
        api.delegations.$post({
          json: { title: task.title, delegate: who.trim(), desiredResults: result.trim(), checkinEveryDays: 7, roleId: task.roleId, taskId: task.id },
        }),
      ),
    { success: "Delegated. Track it under Stewardships.", onSuccess: () => closeTask() },
  );

  return (
    <div className="flex flex-col">
      <SheetHeader className="gap-3 border-b pr-12">
        <SheetTitle className="sr-only">Edit {isGoal ? "weekly goal" : "task"}</SheetTitle>
        <SheetDescription className="flex flex-wrap items-center gap-2">
          <QuadrantBadge q={task.quadrant} withLabel />
          {isGoal && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              <Mountain className="size-3" /> Big rock
            </span>
          )}
          {task.urgentReason === "due" && <span className="text-xs">Urgent: due {relativeDay(task.dueDate, today)}</span>}
          {task.carryCount > 0 && <span className="text-xs">Carried {task.carryCount}×</span>}
          {saving && <span className="text-xs">Saving…</span>}
        </SheetDescription>
        <div className="flex items-start gap-3">
          <Checkbox
            className="mt-2 size-5"
            checked={task.status === "done"}
            onCheckedChange={() => toggleDone(task)}
            aria-label={task.status === "done" ? "Mark as not done" : "Mark as done"}
          />
          <Textarea
            value={text.title}
            onChange={(e) => setText({ ...text, title: e.target.value })}
            rows={1}
            className="min-h-0 resize-none border-none bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
            aria-label="Title"
          />
        </div>
        <LanguageHint text={text.title} onChange={(title) => setText({ ...text, title })} />
        {task.status !== "open" && task.status !== "done" && (
          <p className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            {task.status === "dropped" ? "Dropped" : "Missed"}
            {task.statusReason ? ` · ${task.statusReason.replace(/_/g, " ")}` : ""}
            {task.statusNote ? ` · ${task.statusNote}` : ""}
            <button className="ml-2 underline" onClick={() => patch({ status: "open" })}>
              Reopen
            </button>
          </p>
        )}
      </SheetHeader>

      <div className="grid gap-5 p-4">
        <section className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Urgent × important</Label>
            {explicit && (
              <Button variant="link" size="xs" className="h-auto p-0" onClick={() => patch({ important: null, urgent: null })}>
                Reset to automatic
              </Button>
            )}
          </div>
          <QuadrantPicker
            size="sm"
            value={task.quadrant}
            onChange={(q) => patch(flagsForQuadrant(q, task.dueDate, today, settings.urgentWithinDays))}
          />
          <p className="text-xs text-muted-foreground">
            {task.quadrant ? QUADRANTS[task.quadrant].guidance : "Not triaged yet. Pick a quadrant, or link it to a role."}
            {!explicit && task.quadrant && " (Set automatically from its role/goal and deadline.)"}
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <RoleSelect value={task.roleId} onChange={(roleId) => patch({ roleId })} size="sm" className="w-full" />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Long-term goal</Label>
            <GoalSelect value={task.goalId} onChange={(goalId) => patch({ goalId })} roleId={task.roleId} size="sm" className="w-full" />
          </div>
          {role?.isSaw && (
            <div className="grid gap-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Renewal dimension</Label>
              <Segmented<SawDimension>
                size="sm"
                value={task.sawDimension}
                onChange={(sawDimension) => patch({ sawDimension })}
                options={SAW_DIMENSIONS.map((d) => ({ value: d.key, label: d.label }))}
              />
            </div>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Planned for (not a deadline)</Label>
            <DateField value={task.scheduledDate} onChange={(scheduledDate) => patch({ scheduledDate })} placeholder="Unscheduled" size="sm" />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Deadline</Label>
            <DateField value={task.dueDate} onChange={(dueDate) => patch({ dueDate })} placeholder="No deadline" size="sm" />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Daily priority</Label>
            <Segmented<"A" | "B" | "C" | "none">
              size="sm"
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
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Estimate</Label>
            <EstimateSelect value={task.estimateMinutes} onChange={(estimateMinutes) => patch({ estimateMinutes })} size="sm" />
          </div>
        </section>

        <section className="grid gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Why it matters (your bigger yes)</Label>
            <Input value={text.why} onChange={(e) => setText({ ...text, why: e.target.value })} placeholder="What does this serve?" />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">End in mind: what does done look like?</Label>
            <Textarea
              rows={2}
              value={text.endInMind}
              onChange={(e) => setText({ ...text, endInMind: e.target.value })}
              placeholder="Describe the result, not the activity."
            />
          </div>
          {isGoal && (
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">If–then plan (for your most important rocks)</Label>
              <Input
                value={text.ifThen}
                onChange={(e) => setText({ ...text, ifThen: e.target.value })}
                placeholder="If a meeting runs over, then I'll move my run to 18:00."
              />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea rows={4} value={text.notes} onChange={(e) => setText({ ...text, notes: e.target.value })} />
            <LanguageHint text={text.notes} onChange={(notes) => setText({ ...text, notes })} />
          </div>
        </section>

        <Separator />

        <section className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => openFocus(task.id)}>
            <Crosshair /> Focus
          </Button>
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
            <Button variant="outline" size="sm" onClick={() => setDelegating((d) => !d)}>
              <Users2 /> Delegate
            </Button>
          )}
          {task.status === "open" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => patch({ status: "dropped", statusReason: "declined" })}
              title="Say no: drop it with a bigger yes in mind"
            >
              <Ban /> Say no
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="text-destructive" />}>
              <Trash2 /> Delete
            </AlertDialogTrigger>
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
        </section>

        {delegating && (
          <section className="grid gap-2 rounded-xl border p-3">
            <div className="text-sm font-medium">Stewardship delegation</div>
            <p className="text-xs text-muted-foreground">Agree on the result, not the method. Add guidelines, resources and check-ins under Stewardships.</p>
            <Input placeholder="Who will own it?" value={who} onChange={(e) => setWho(e.target.value)} />
            <Textarea rows={2} placeholder="Desired result, and by when" value={result} onChange={(e) => setResult(e.target.value)} />
            <div className="flex justify-end">
              <Button size="sm" disabled={!who.trim() || delegate.isPending} onClick={() => delegate.mutate(undefined)}>
                Delegate
              </Button>
            </div>
          </section>
        )}

        <p className="text-xs text-muted-foreground">
          Created {fmtDate(task.createdAt, "d MMM yyyy")}
          {task.createdQuadrant ? ` in Quadrant ${QUADRANTS[task.createdQuadrant as 1].numeral}` : ""}
          {task.completedAt ? ` · done ${fmtDate(task.completedAt, "d MMM")}` : ""}
          {task.preventionForId ? " · prevention step" : ""}
        </p>
      </div>
    </div>
  );
}
