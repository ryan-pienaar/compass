import { useQuery } from "@tanstack/react-query";
import { Ban, CalendarClock, Hand, HeartHandshake, Mountain } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { effectiveTriage, isDueSoon, QUADRANTS, urgencyToStore, type Quadrant } from "@shared/quadrant.ts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, call } from "@/lib/api";
import { relativeDay } from "@/lib/format";
import { useBootstrap } from "@/lib/hooks";
import { useApiMutation, useTaskActions, type TaskCreate } from "@/lib/mutations";
import { weekQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useAppState } from "./app-state";
import { QuadrantDot } from "./badges";
import { ChoiceChip } from "./chip";
import { LanguageHint } from "./language-hint";
import { DateField, GoalSelect, RoleSelect } from "./pickers";
import { Segmented } from "./segmented";
import { Callout } from "./surface";

type YesNo = "yes" | "no" | "unsure";
type Response = "inbox" | "today" | "schedule" | "rock" | "backlog" | "delegate" | "batch" | "decline" | "drop" | "keep";

export function CaptureDialog() {
  const { capture, closeCapture } = useAppState();
  return (
    <Dialog open={capture.open} onOpenChange={(o) => !o && closeCapture()}>
      <DialogContent size="lg" placement="top" showCloseButton>
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
  const uid = useId();

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
      className="grid gap-5"
    >
      <DialogHeader>
        <DialogTitle className="flex items-start gap-2">
          {/* One line-height tall, so the icon stays on the first line when the title wraps. */}
          <span aria-hidden className="flex h-lh shrink-0 items-center">
            <Hand className="size-4 text-muted-foreground" />
          </span>
          {prefill.mode === "interruption" ? "Something came up. Pause." : "Capture, then choose your response"}
        </DialogTitle>
        <DialogDescription>
          Between what happens and how you respond, you get to choose. Two questions decide where this belongs.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Input ref={titleRef} size="lg" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What is it?" aria-label="Title" />
        <LanguageHint text={title} onChange={setTitle} returnFocusRef={titleRef} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="grid min-w-0 gap-1.5">
          <Label size="sm" htmlFor={`${uid}-role`}>
            Which role does it serve?
          </Label>
          <RoleSelect id={`${uid}-role`} value={roleId} onChange={pickRole} placeholder="None / not sure" className="w-full" />
        </div>
        <div className="grid min-w-0 gap-1.5">
          <Label size="sm" htmlFor={`${uid}-goal`}>
            Toward a long-term goal?
          </Label>
          <GoalSelect id={`${uid}-goal`} value={goalId} onChange={pickGoal} roleId={roleId} className="w-full" />
        </div>
      </div>

      <div className="grid gap-4 border-t border-border-subtle pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1 basis-56">
            <p className="text-sm font-medium">Is it important?</p>
            <p className="text-xs text-muted-foreground">Does it contribute to your mission, a role or a goal?</p>
          </div>
          <Segmented
            aria-label="Important"
            value={important}
            onChange={setImportant}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "unsure", label: "Not sure yet" },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1 basis-56">
            <p className="text-sm font-medium">Is it urgent?</p>
            <p className="text-xs text-muted-foreground">Does it truly need attention now, or soon, because of a deadline?</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              aria-label="Urgent"
              value={urgentChoice ?? (dueSoon ? "yes" : "no")}
              onChange={setUrgentChoice}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
            <DateField value={dueDate} onChange={setDueDate} placeholder="Deadline" />
          </div>
        </div>
      </div>

      <QuadrantGuidance q={q} urgentReason={triage.urgentReason} />

      {q === 1 && (
        <label className="flex items-center gap-2.5 text-sm">
          <Checkbox checked={prevent} onCheckedChange={(v) => setPrevent(v === true)} />
          Also add a Quadrant II step to stop this happening again
        </label>
      )}

      {q === 2 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Schedule it:</span>
          <DateField value={scheduleDate} onChange={setScheduleDate} placeholder="Pick a day" />
          <span className="text-muted-foreground">or</span>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void submit("rock")}>
            <Mountain /> Make it a big rock this week
          </Button>
        </div>
      )}

      {q === 3 && (
        <div className="grid gap-3">
          <div role="group" aria-label="How to respond" className="flex flex-wrap gap-2">
            <ChoiceChip
              pressed={panel === "delegate"}
              icon={<HeartHandshake aria-hidden />}
              onClick={() => setPanel(panel === "delegate" ? "none" : "delegate")}
            >
              Delegate as a stewardship
            </ChoiceChip>
            <ChoiceChip pressed={panel === "decline"} icon={<Ban aria-hidden />} onClick={() => setPanel(panel === "decline" ? "none" : "decline")}>
              Decline pleasantly
            </ChoiceChip>
          </div>
          {panel === "delegate" && (
            <div className="grid gap-3 rounded-lg bg-muted p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div className="grid min-w-0 gap-1.5">
                <Label size="sm" htmlFor={`${uid}-who`}>
                  Who?
                </Label>
                <Input id={`${uid}-who`} value={delegate.who} onChange={(e) => setDelegate({ ...delegate, who: e.target.value })} />
              </div>
              <div className="grid min-w-0 gap-1.5">
                <Label size="sm" htmlFor={`${uid}-result`}>
                  Desired result (what, not how) and by when
                </Label>
                <Input id={`${uid}-result`} value={delegate.result} onChange={(e) => setDelegate({ ...delegate, result: e.target.value })} />
              </div>
              {/* Reads as one phrase: "Check in every [7] days". */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground sm:col-span-2">
                <Label size="sm" htmlFor={`${uid}-checkin`}>
                  Check in every
                </Label>
                <Input
                  id={`${uid}-checkin`}
                  type="number"
                  min={1}
                  className="w-16 tabular-nums"
                  aria-label="Check in every N days"
                  value={delegate.checkin}
                  onChange={(e) => setDelegate({ ...delegate, checkin: e.target.value })}
                />
                <span aria-hidden>days</span>
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                You can add guidelines, resources, accountability and consequences later under Stewardships.
              </p>
            </div>
          )}
        </div>
      )}

      {(q === 3 || q === 4) && (panel === "decline" || q === 4) && (
        <div className="grid gap-3">
          {biggerYes.length > 0 && (
            <Callout tone="neutral" icon={<Mountain aria-hidden />} title="Your bigger yes this week">
              <ul className="mt-1 ml-4 list-disc space-y-0.5 marker:text-muted-foreground">
                {biggerYes.map((g) => (
                  <li key={g.id}>{g.title}</li>
                ))}
              </ul>
            </Callout>
          )}
          {panel === "decline" && (
            <Textarea
              rows={2}
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
              aria-label="How you'll say no"
              placeholder="How you'll say no: pleasantly, smilingly, without apology (optional)"
            />
          )}
        </div>
      )}

      <DialogFooter
        start={
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:pointer-fine:inline-flex">
            <Kbd>Esc</Kbd> to cancel
          </span>
        }
      >
        {q != null && primary.response !== "keep" && (
          <Button type="button" variant="ghost" disabled={busy} onClick={() => void submit(q === 4 ? "keep" : "inbox")}>
            {q === 4 ? "Keep anyway" : "Just save it"}
          </Button>
        )}
        <Button type="submit" disabled={busy || !title.trim()}>
          {primary.label}
          <Kbd className="pointer-coarse:hidden">↵</Kbd>
        </Button>
      </DialogFooter>
    </form>
  );
}

/** The quadrant's top rule on the verdict card (literal strings so Tailwind generates them). */
const TOP_RULE: Record<Quadrant, string> = {
  1: "before:bg-q1",
  2: "before:bg-q2",
  3: "before:bg-q3",
  4: "before:bg-q4",
};

/** The verdict: which quadrant the answers point to, and what to do about it. It re-enters as the quadrant changes. */
function QuadrantGuidance({ q, urgentReason }: { q: Quadrant | null; urgentReason: "flag" | "due" | null }) {
  const info = q ? QUADRANTS[q] : null;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-card px-4 py-3.5 shadow-xs ring-1 ring-edge dark:bg-muted before:absolute before:inset-x-0 before:top-0 before:h-0.75",
        q ? TOP_RULE[q] : "before:bg-border-strong",
      )}
    >
      <div key={q ?? "none"} className="animate-rise-in">
        {q && info ? (
          <>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
              <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                <QuadrantDot q={q} />
                Quadrant {info.numeral} · {info.verb}
              </span>
              <span className="text-muted-foreground">{info.label}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{info.guidance}</p>
            {urgentReason === "due" && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock aria-hidden className="size-3.5 shrink-0" />
                Urgent because the deadline is close.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <span aria-hidden className="size-2 shrink-0 rounded-full inset-ring inset-ring-control" />
              Untriaged
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Not triaged yet: it'll wait in your inbox.</p>
          </>
        )}
      </div>
    </div>
  );
}
