import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Check, HeartHandshake, MessageSquare, Pencil, Plus, Users2, X } from "lucide-react";
import { useState } from "react";
import { STEWARDSHIP_ELEMENTS } from "@shared/content.ts";
import { addDaysISO } from "@shared/dates.ts";
import { useAppState } from "@/components/app-state";
import { RoleBadge } from "@/components/badges";
import { Page, PageHeader, PrincipleNote } from "@/components/page";
import { DateField, RoleSelect } from "@/components/pickers";
import { Segmented } from "@/components/segmented";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, call, type Delegation } from "@/lib/api";
import { fmtDate, relativeDay } from "@/lib/format";
import { useBootstrap, useRolesMap } from "@/lib/hooks";
import { useApiMutation } from "@/lib/mutations";
import { delegationsQuery, tasksQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/stewardships")({
  component: StewardshipsPage,
});

/** A new or existing agreement; `fromTaskId` links a task being delegated. */
type Draft = Partial<Delegation> & { title: string; fromTaskId?: string };

function StewardshipsPage() {
  const { data = [] } = useQuery(delegationsQuery());
  const { data: open = [] } = useQuery(tasksQuery({ view: "open" }));
  const [editing, setEditing] = useState<Draft | null>(null);
  const [checkingIn, setCheckingIn] = useState<Delegation | null>(null);
  const active = data.filter((d) => d.status === "active");
  const closed = data.filter((d) => d.status !== "active");
  const candidates = open.filter((t) => t.quadrant === 3 && t.kind === "task").slice(0, 8);

  return (
    <Page>
      <PageHeader
        eyebrow="Habit 3 · Delegation"
        title="Stewardships"
        description="Gofer delegation supervises methods. Stewardship delegation agrees on results and lets people choose how, and it multiplies what you can accomplish while it grows them."
        actions={
          <Button onClick={() => setEditing({ title: "", checkinEveryDays: 7 })}>
            <Plus /> New stewardship
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          {active.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>No stewardships yet</EmptyTitle>
                <EmptyDescription>Hand over a result, not a task list. Start with something from Quadrant III.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            active.map((d) => <StewardshipCard key={d.id} d={d} onEdit={() => setEditing(d)} onCheckIn={() => setCheckingIn(d)} />)
          )}
          {closed.length > 0 && (
            <details className="rounded-xl border p-3">
              <summary className="cursor-pointer text-sm font-medium">Completed & cancelled ({closed.length})</summary>
              <ul className="mt-2 space-y-1 text-sm">
                {closed.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <span className={cn(d.status === "cancelled" && "text-muted-foreground line-through")}>
                      {d.title} · {d.delegate}
                    </span>
                    <Button variant="ghost" size="xs" onClick={() => setEditing(d)}>
                      Open
                    </Button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
        <aside className="space-y-3">
          <PrincipleNote icon={<HeartHandshake className="size-4" />}>
            Trust is the highest form of motivation. Agree up front on five things: desired results, guidelines, resources,
            accountability and consequences. Then let them be their own boss, with you as a helper.
          </PrincipleNote>
          <div className="rounded-xl border bg-card p-4 text-sm">
            <div className="font-semibold">Adjust to maturity</div>
            <p className="mt-1 text-muted-foreground">
              Newer people: fewer results, more guidelines and resources, more frequent check-ins. Experienced people: bigger
              results, fewer guidelines, less frequent check-ins.
            </p>
          </div>
          {candidates.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Users2 className="size-4" /> Could someone else own these?
              </div>
              <p className="mb-2 text-xs text-muted-foreground">Urgent but not important to you (Quadrant III).</p>
              <ul className="space-y-1 text-sm">
                {candidates.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{t.title}</span>
                    <Button variant="ghost" size="xs" onClick={() => setEditing({ title: t.title, roleId: t.roleId, checkinEveryDays: 7, fromTaskId: t.id })}>
                      Delegate
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
      <StewardshipDialog draft={editing} onClose={() => setEditing(null)} />
      <CheckinDialog d={checkingIn} onClose={() => setCheckingIn(null)} />
    </Page>
  );
}

function StewardshipCard({ d, onEdit, onCheckIn }: { d: Delegation; onEdit: () => void; onCheckIn: () => void }) {
  const { today } = useBootstrap();
  const roles = useRolesMap();
  const due = d.nextCheckin && d.nextCheckin <= today;
  const last = d.checkins[0];
  const setStatus = useApiMutation((status: "done" | "cancelled") => call(api.delegations[":id"].$patch({ param: { id: d.id }, json: { status } })), {
    success: (_, s) => (s === "done" ? "Stewardship completed" : "Stewardship cancelled"),
  });
  return (
    <article className={cn("rounded-2xl border bg-card p-4", due && "border-primary/50")}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{d.title}</h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Steward: {d.delegate || "not set"}</span>
            {d.dueDate && <span>· result by {fmtDate(d.dueDate, "d MMM")}</span>}
            {d.roleId && <RoleBadge role={roles.get(d.roleId)} muted />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {d.nextCheckin && (
            <Badge variant={due ? "default" : "outline"}>
              <CalendarClock /> Check-in {relativeDay(d.nextCheckin, today)}
            </Badge>
          )}
        </div>
      </header>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {STEWARDSHIP_ELEMENTS.map((el) => {
          const value = d[el.key as keyof Delegation] as string;
          return (
            <div key={el.key} className={cn("rounded-lg bg-muted/40 px-3 py-2", !value && "border border-dashed bg-transparent")}>
              <dt className="text-xs font-medium text-muted-foreground">{el.label}</dt>
              <dd className={cn("whitespace-pre-wrap", !value && "text-xs text-muted-foreground/70")}>{value || "Not agreed yet"}</dd>
            </div>
          );
        })}
      </dl>
      {last && (
        <p className="mt-3 flex items-start gap-2 text-sm">
          <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            <span className="text-muted-foreground">{fmtDate(last.date, "d MMM")}:</span> {last.notes || "Checked in"}
            {last.onTrack === false && <span className="ml-1 text-warning">(needs help)</span>}
          </span>
        </p>
      )}
      <footer className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={onCheckIn}>
          <MessageSquare /> Check in
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil /> Edit agreement
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setStatus.mutate("done")}>
          <Check /> Result achieved
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setStatus.mutate("cancelled")}>
          <X /> Cancel
        </Button>
      </footer>
    </article>
  );
}

function StewardshipDialog({ draft, onClose }: { draft: Draft | null; onClose: () => void }) {
  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="top-[5vh] max-h-[90vh] translate-y-0 overflow-y-auto sm:max-w-2xl">
        {draft && <StewardshipForm key={draft.id ?? "new"} initial={draft} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function StewardshipForm({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const { today } = useBootstrap();
  const { openTask } = useAppState();
  const [d, setD] = useState({
    title: initial.title,
    delegate: initial.delegate ?? "",
    desiredResults: initial.desiredResults ?? "",
    guidelines: initial.guidelines ?? "",
    resources: initial.resources ?? "",
    accountability: initial.accountability ?? "",
    consequences: initial.consequences ?? "",
    dueDate: initial.dueDate ?? null,
    checkinEveryDays: initial.checkinEveryDays ?? 7,
    nextCheckin: initial.nextCheckin ?? null,
    roleId: initial.roleId ?? null,
  });
  const taskId = initial.fromTaskId ?? null;
  const save = useApiMutation(
    () =>
      initial.id
        ? call(api.delegations[":id"].$patch({ param: { id: initial.id }, json: d }))
        : call(api.delegations.$post({ json: { ...d, nextCheckin: d.nextCheckin ?? (d.checkinEveryDays ? addDaysISO(today, d.checkinEveryDays) : null), taskId } })),
    { success: initial.id ? "Agreement updated" : "Stewardship created", onSuccess: onClose },
  );
  const methodish = /\b(first|then|make sure you|step \d|call .* and|use the)\b/i.test(d.desiredResults);

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (d.title.trim()) save.mutate(undefined);
      }}
    >
      <DialogHeader>
        <DialogTitle>{initial.id ? "Stewardship agreement" : "New stewardship agreement"}</DialogTitle>
        <DialogDescription>Agree on what, not how. Write it together with the person if you can.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <div className="grid gap-1.5">
          <Label>Stewardship</Label>
          <Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="e.g. Weekly release notes" autoFocus />
        </div>
        <div className="grid gap-1.5">
          <Label>Steward</Label>
          <Input value={d.delegate} onChange={(e) => setD({ ...d, delegate: e.target.value })} placeholder="Who owns it?" />
        </div>
      </div>
      {STEWARDSHIP_ELEMENTS.map((el) => (
        <div key={el.key} className="grid gap-1.5">
          <Label>{el.label}</Label>
          <p className="text-xs text-muted-foreground">{el.prompt}</p>
          <Textarea rows={2} value={d[el.key]} onChange={(e) => setD({ ...d, [el.key]: e.target.value })} />
          {el.key === "desiredResults" && methodish && <p className="text-xs text-warning">This reads like a method. Describe the result, and let them choose how.</p>}
        </div>
      ))}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label>Result by</Label>
          <DateField value={d.dueDate} onChange={(dueDate) => setD({ ...d, dueDate })} size="sm" />
        </div>
        <div className="grid gap-1.5">
          <Label>Check in every</Label>
          <Segmented<"3" | "7" | "14" | "30">
            size="sm"
            value={String(d.checkinEveryDays) as "7"}
            onChange={(v) => setD({ ...d, checkinEveryDays: Number(v) })}
            options={[
              { value: "3", label: "3d" },
              { value: "7", label: "1w" },
              { value: "14", label: "2w" },
              { value: "30", label: "1m" },
            ]}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Role</Label>
          <RoleSelect value={d.roleId} onChange={(roleId) => setD({ ...d, roleId })} size="sm" className="w-full" />
        </div>
      </div>
      <DialogFooter className="sm:justify-between">
        {taskId ? (
          <Button type="button" variant="ghost" onClick={() => openTask(taskId)}>
            Open the task
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={!d.title.trim() || save.isPending}>
          Save agreement
        </Button>
      </DialogFooter>
    </form>
  );
}

function CheckinDialog({ d, onClose }: { d: Delegation | null; onClose: () => void }) {
  const [notes, setNotes] = useState("");
  const [onTrack, setOnTrack] = useState<"yes" | "no" | null>(null);
  const save = useApiMutation(
    () => call(api.delegations[":id"].checkins.$post({ param: { id: d!.id }, json: { notes, onTrack: onTrack == null ? null : onTrack === "yes" } })),
    {
      success: "Check-in saved",
      onSuccess: () => {
        setNotes("");
        setOnTrack(null);
        onClose();
      },
    },
  );
  return (
    <Dialog open={!!d} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {d && (
          <>
            <DialogHeader>
              <DialogTitle>Check in: {d.title}</DialogTitle>
              <DialogDescription>
                As agreed, {d.delegate || "they"} judge{d.delegate ? "s" : ""} the result against the standard; you ask how you can help.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
              <Label>On track?</Label>
              <Segmented
                size="sm"
                value={onTrack}
                onChange={setOnTrack}
                options={[
                  { value: "yes", label: "On track" },
                  { value: "no", label: "Needs help" },
                ]}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Notes</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did they report? How will you help?" />
            </div>
            <DialogFooter>
              <Button onClick={() => save.mutate(undefined)} disabled={save.isPending}>
                Save check-in
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
