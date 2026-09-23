import { useQuery } from "@tanstack/react-query";
import { CornerDownLeft, Hand, Mountain } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { effectiveTriage, isDueSoon, QUADRANTS, urgencyToStore, type Quadrant } from "@shared/quadrant.ts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, call } from "@/lib/api";
import { relativeDay } from "@/lib/format";
import { useBootstrap } from "@/lib/hooks";
import { useApiMutation, useTaskActions, type TaskCreate } from "@/lib/mutations";
import { weekQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useAppState } from "./app-state";
import { QUADRANT_CLASSES, QuadrantBadge } from "./badges";
import { LanguageHint } from "./language-hint";
import { DateField, GoalSelect, RoleSelect } from "./pickers";
import { Segmented } from "./segmented";

type YesNo = "yes" | "no" | "unsure";
type Response = "inbox" | "today" | "schedule" | "rock" | "backlog" | "delegate" | "batch" | "decline" | "drop" | "keep";

export function CaptureDialog() {
  const { capture, closeCapture } = useAppState();
  return (
    <Dialog open={capture.open} onOpenChange={(o) => !o && closeCapture()}>
      <DialogContent className="top-[6vh] max-h-[88vh] translate-y-0 overflow-y-auto sm:max-w-2xl" showCloseButton>
        {capture.open && <CaptureForm key={JSON.stringify(capture.prefill)} onDone={closeCapture} />}
      </DialogContent>
    </Dialog>
  );
}

function CaptureForm({ onDone }: { onDone: () => void }) {
  const { capture } = useAppState();
  const prefill = capture.prefill;
  const { today, weekStart, settings } = useBootstrap();
  const { create } = useTaskActions();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(prefill.title ?? "");
  const [roleId, setRoleId] = useState<string | null>(prefill.roleId ?? null);
  const [goalId, setGoalId] = useState<string | null>(prefill.goalId ?? null);
  const [important, setImportant] = useState<YesNo>(prefill.roleId || prefill.goalId ? "yes" : "unsure");
  // Unanswered, urgency follows the deadline; an answer is stored only when it overrides the deadline.
  const [urgentChoice, setUrgentChoice] = useState<"yes" | "no" | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string | null>(prefill.scheduledDate ?? null);
  const [prevent, setPrevent] = useState(true);
  const [declineNote, setDeclineNote] = useState("");
  const [delegate, setDelegate] = useState({ who: "", result: "", checkin: "7" });
  const [panel, setPanel] = useState<"none" | "delegate" | "decline">("none");

  useEffect(() => {
    const t = setTimeout(() => titleRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // Linking to a role or goal answers "is it important?" for you.
  const pickRole = (id: string | null) => {
    setRoleId(id);
    if (id && important === "unsure") setImportant("yes");
  };
  const pickGoal = (id: string | null) => {
    setGoalId(id);
    if (id) setImportant("yes");
  };

  const dueSoon = isDueSoon(dueDate, today, settings.urgentWithinDays);
  const urgent = urgentChoice == null ? null : urgencyToStore(urgentChoice === "yes", dueDate, today, settings.urgentWithinDays);
  const triage = effectiveTriage(
    {
      important: important === "unsure" ? null : important === "yes",
      urgent,
      roleId,
      goalId,
      dueDate,
    },
    today,
    settings.urgentWithinDays,
  );
  const q = triage.quadrant;

  const { data: week } = useQuery({ ...weekQuery(weekStart), enabled: q === 3 || q === 4 });
  const biggerYes = useMemo(() => (week?.goals ?? []).filter((g) => g.status === "open").slice(0, 4), [week]);

  const delegateMutation = useApiMutation(
    async (taskId: string) =>
      call(
        api.delegations.$post({
          json: {
            title: title.trim(),
            delegate: delegate.who.trim(),
            desiredResults: delegate.result.trim(),
            checkinEveryDays: Number(delegate.checkin) || null,
            roleId,
            taskId,
          },
        }),
      ),
    { success: "Delegated as a stewardship" },
  );

  const base: TaskCreate = {
    title: title.trim(),
    roleId,
    goalId,
    important: important === "unsure" ? null : important === "yes",
    urgent,
    dueDate,
    source: prefill.mode === "interruption" ? "interruption" : "capture",
  };

  const submit = async (response: Response) => {
    if (!title.trim()) {
      titleRef.current?.focus();
      return;
    }
    let json: TaskCreate = base;
    let message = "Captured";
    switch (response) {
      case "inbox":
        message = "Saved to your inbox. Triage it when you plan.";
        break;
      case "today":
        json = { ...base, scheduledDate: today, priority: "A" };
        message = "On today's list";
        break;
      case "schedule":
        json = { ...base, scheduledDate: scheduleDate ?? today };
        message = `Scheduled for ${relativeDay(scheduleDate ?? today, today)}`;
        break;
      case "rock":
        json = { ...base, kind: "goal", weekStart };
        message = "Added as a big rock this week";
        break;
      case "backlog":
        message = "Parked for your weekly planning";
        break;
      case "batch":
        json = { ...base, scheduledDate: today, priority: "C" };
        message = "Batched at the bottom of today";
        break;
      case "decline":
      case "drop":
        json = { ...base, status: "dropped", statusReason: "declined", statusNote: declineNote.trim() };
        message = response === "decline" ? "You said no. That's a yes to what matters more." : "Dropped. Good call.";
        break;
      case "delegate":
      case "keep":
        break;
    }
    const task = await create.mutateAsync(json);
    if (response === "today" && q === 1 && prevent) {
      await call(api.tasks[":id"].prevent.$post({ param: { id: task.id }, json: {} }));
      message = "On today's list, plus a Quadrant II prevention step";
    }
    if (response === "delegate") {
      await delegateMutation.mutateAsync(task.id);
    } else {
      toast.success(message);
    }
    onDone();
  };

  const primary: { response: Response; label: string } =
    q == null
      ? { response: "inbox", label: "Save to inbox" }
      : q === 1
        ? { response: "today", label: "Do it today" }
        : q === 2
          ? scheduleDate
            ? { response: "schedule", label: `Schedule for ${relativeDay(scheduleDate, today)}` }
            : { response: "backlog", label: "Park for weekly planning" }
          : q === 3
            ? panel === "delegate"
              ? { response: "delegate", label: "Delegate it" }
              : panel === "decline"
                ? { response: "decline", label: "Say no" }
                : { response: "batch", label: "Batch it for later today" }
            : { response: "drop", label: "Drop it" };

  const busy = create.isPending || delegateMutation.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit(primary.response);
      }}
      className="grid gap-4"
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Hand className="size-4 text-primary" />
          {prefill.mode === "interruption" ? "Something came up. Pause." : "Capture, then choose your response"}
        </DialogTitle>
        <DialogDescription>
          Between what happens and how you respond, you get to choose. Two questions decide where this belongs.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What is it?"
          className="h-10 text-base"
          aria-label="Title"
        />
        <LanguageHint text={title} onChange={setTitle} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Which role does it serve?</Label>
          <RoleSelect value={roleId} onChange={pickRole} placeholder="None / not sure" size="sm" className="w-full" />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Toward a long-term goal?</Label>
          <GoalSelect value={goalId} onChange={pickGoal} roleId={roleId} size="sm" className="w-full" />
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border bg-muted/30 p-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <div className="text-sm font-medium">Is it important?</div>
          <p className="text-xs text-muted-foreground">Does it contribute to your mission, a role or a goal?</p>
          <Segmented
            aria-label="Important"
            size="sm"
            value={important}
            onChange={setImportant}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "unsure", label: "Not sure yet" },
            ]}
          />
        </div>
        <div className="grid gap-1.5">
          <div className="text-sm font-medium">Is it urgent?</div>
          <p className="text-xs text-muted-foreground">Does it truly need attention now, or soon, because of a deadline?</p>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              aria-label="Urgent"
              size="sm"
              value={urgentChoice ?? (dueSoon ? "yes" : "no")}
              onChange={setUrgentChoice}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
            <DateField value={dueDate} onChange={setDueDate} placeholder="Deadline" size="sm" />
          </div>
        </div>
      </div>

      <QuadrantGuidance q={q} urgentReason={triage.urgentReason} />

      {q === 1 && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={prevent} onCheckedChange={(v) => setPrevent(v === true)} />
          Also add a Quadrant II step to stop this happening again
        </label>
      )}

      {q === 2 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Schedule it:</span>
          <DateField value={scheduleDate} onChange={setScheduleDate} placeholder="Pick a day" size="sm" />
          <span className="text-muted-foreground">or</span>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void submit("rock")}>
            <Mountain /> Make it a big rock this week
          </Button>
        </div>
      )}

      {q === 3 && (
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={panel === "delegate" ? "secondary" : "outline"} onClick={() => setPanel(panel === "delegate" ? "none" : "delegate")}>
              Delegate as a stewardship
            </Button>
            <Button type="button" size="sm" variant={panel === "decline" ? "secondary" : "outline"} onClick={() => setPanel(panel === "decline" ? "none" : "decline")}>
              Decline pleasantly
            </Button>
          </div>
          {panel === "delegate" && (
            <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_2fr_auto]">
              <Input placeholder="Who?" value={delegate.who} onChange={(e) => setDelegate({ ...delegate, who: e.target.value })} />
              <Input
                placeholder="Desired result (what, not how) and by when"
                value={delegate.result}
                onChange={(e) => setDelegate({ ...delegate, result: e.target.value })}
              />
              <Input
                type="number"
                min={1}
                className="w-24"
                aria-label="Check in every N days"
                title="Check in every N days"
                value={delegate.checkin}
                onChange={(e) => setDelegate({ ...delegate, checkin: e.target.value })}
              />
              <p className="text-xs text-muted-foreground sm:col-span-3">
                You can add guidelines, resources, accountability and consequences later under Stewardships.
              </p>
            </div>
          )}
        </div>
      )}

      {(q === 3 || q === 4) && (panel === "decline" || q === 4) && (
        <div className="grid gap-2">
          {biggerYes.length > 0 && (
            <div className="rounded-lg bg-accent/50 p-3 text-sm">
              <div className="mb-1 font-medium text-accent-foreground">Your bigger yes this week</div>
              <ul className="list-inside list-disc text-accent-foreground/90">
                {biggerYes.map((g) => (
                  <li key={g.id}>{g.title}</li>
                ))}
              </ul>
            </div>
          )}
          {panel === "decline" && (
            <Textarea
              rows={2}
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
              placeholder="How you'll say no: pleasantly, smilingly, without apology (optional)"
            />
          )}
        </div>
      )}

      <DialogFooter className="items-center sm:justify-between">
        <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          {q != null && <QuadrantBadge q={q} withLabel />}
          {q == null && <span>Not triaged yet: it'll wait in your inbox.</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {q != null && primary.response !== "keep" && (
            <Button type="button" variant="ghost" disabled={busy} onClick={() => void submit(q === 4 ? "keep" : "inbox")}>
              {q === 4 ? "Keep anyway" : "Just save it"}
            </Button>
          )}
          <Button type="submit" disabled={busy || !title.trim()}>
            {primary.label}
            <CornerDownLeft className="opacity-60" />
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

function QuadrantGuidance({ q, urgentReason }: { q: Quadrant | null; urgentReason: "flag" | "due" | null }) {
  if (!q) return null;
  const info = QUADRANTS[q];
  const c = QUADRANT_CLASSES[q];
  return (
    <div className={cn("rounded-xl border p-3", c.bg, c.border)}>
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <span aria-hidden className={cn("size-2 rounded-full", c.solid)} />
        Quadrant {info.numeral} · {info.verb}
        <span className="ml-2 font-normal text-foreground/70">{info.label}</span>
      </div>
      <p className="mt-1 text-sm text-foreground/80">{info.guidance}</p>
      {urgentReason === "due" && <p className="mt-1 text-xs text-foreground/60">Urgent because the deadline is close.</p>}
    </div>
  );
}
