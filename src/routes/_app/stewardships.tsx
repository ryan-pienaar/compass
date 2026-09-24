import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarClock,
  Check,
  ChevronRight,
  CircleCheck,
  CircleX,
  Ellipsis,
  HeartHandshake,
  LifeBuoy,
  MessageSquare,
  Pencil,
  Lightbulb,
  Plus,
  Users,
  X,
} from "lucide-react";
import { useId, useState } from "react";
import { STEWARDSHIP_ELEMENTS } from "@shared/content.ts";
import { addDaysISO } from "@shared/dates.ts";
import { useAppState } from "@/components/app-state";
import { RoleBadge } from "@/components/badges";
import { Chip } from "@/components/chip";
import { EmptyState } from "@/components/empty-state";
import { IconButton } from "@/components/icon-button";
import { Page, PageHeader, PrincipleNote, RailSection, WithRail } from "@/components/page";
import { DateField, RoleSelect } from "@/components/pickers";
import { MetaSep, Row } from "@/components/row";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  const { data = [], isPending } = useQuery(delegationsQuery());
  const { data: open = [] } = useQuery(tasksQuery({ view: "open" }));
  const [editing, setEditing] = useState<Draft | null>(null);
  const [checkingIn, setCheckingIn] = useState<Delegation | null>(null);
  const active = data.filter((d) => d.status === "active");
  const closed = data.filter((d) => d.status !== "active");
  const candidates = open.filter((t) => t.quadrant === 3 && t.kind === "task").slice(0, 8);

  return (
    <Page>
      <PageHeader
        habit={3}
        eyebrow="Delegation"
        title="Stewardships"
        description="Gofer delegation supervises methods. Stewardship delegation agrees on results and lets people choose how, and it multiplies what you can accomplish while it grows them."
        actions={
          <Button onClick={() => setEditing({ title: "", checkinEveryDays: 7 })}>
            <Plus /> New stewardship
          </Button>
        }
      />
      <WithRail
        rail={
          <>
            <PrincipleNote icon={<HeartHandshake />}>
              Trust is the highest form of motivation. Agree up front on five things: desired results, guidelines, resources,
              accountability and consequences. Then let them be their own boss, with you as a helper.
            </PrincipleNote>
            <RailSection title="Adjust to maturity">
              <p className="text-muted-foreground">
                Newer people: fewer results, more guidelines and resources, more frequent check-ins. Experienced people: bigger
                results, fewer guidelines, less frequent check-ins.
              </p>
            </RailSection>
            {candidates.length > 0 && (
              <RailSection title="Could someone else own these?" icon={<Users />}>
                <p className="text-xs text-muted-foreground">Urgent but not important to you (Quadrant III).</p>
                <ul className="-mx-3 mt-2">
                  {candidates.map((t) => (
                    <Row key={t.id} as="li" divided className="gap-2 before:left-3">
                      <span className="line-clamp-2 min-w-0 flex-1 text-sm text-foreground">{t.title}</span>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setEditing({ title: t.title, roleId: t.roleId, checkinEveryDays: 7, fromTaskId: t.id })}
                      >
                        Delegate
                      </Button>
                    </Row>
                  ))}
                </ul>
              </RailSection>
            )}
          </>
        }
      >
        <div className="space-y-6">
          {active.length === 0 ? (
            isPending ? (
              <AgreementSkeleton />
            ) : (
              <EmptyState
                icon={<HeartHandshake />}
                title="No stewardships yet"
                description="Hand over a result, not a task list. Start with something from Quadrant III."
                action={
                  <Button variant="outline" size="sm" onClick={() => setEditing({ title: "", checkinEveryDays: 7 })}>
                    <Plus /> New stewardship
                  </Button>
                }
              />
            )
          ) : (
            active.map((d) => <StewardshipCard key={d.id} d={d} onEdit={() => setEditing(d)} onCheckIn={() => setCheckingIn(d)} />)
          )}
          {closed.length > 0 && (
            <details className="[&[open]>summary_svg]:rotate-90">
              <summary className="-mx-3 flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm font-semibold text-foreground transition-colors duration-120 select-none hover:bg-subtle focus-ring-inset pointer-coarse:min-h-12 [&::-webkit-details-marker]:hidden">
                <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform duration-180 ease-out" />
                Completed & cancelled
                <span className="text-xs font-normal text-muted-foreground tabular-nums">{closed.length}</span>
              </summary>
              <ul className="-mx-3 mt-1">
                {closed.map((d) => {
                  const cancelled = d.status === "cancelled";
                  return (
                    <Row key={d.id} as="li" divided className="before:left-10">
                      {cancelled ? (
                        <CircleX aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <CircleCheck aria-hidden className="size-4 shrink-0 text-success" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm">
                        <span className="sr-only">{cancelled ? "Cancelled: " : "Result achieved: "}</span>
                        <span className={cn(cancelled ? "text-muted-foreground line-through" : "text-foreground")}>{d.title}</span>
                        {d.delegate && (
                          <span className="text-muted-foreground">
                            {" "}
                            <MetaSep /> {d.delegate}
                          </span>
                        )}
                      </span>
                      <Button variant="ghost" size="xs" onClick={() => setEditing(d)}>
                        Open
                      </Button>
                    </Row>
                  );
                })}
              </ul>
            </details>
          )}
        </div>
      </WithRail>
      <StewardshipDialog draft={editing} onClose={() => setEditing(null)} />
      <CheckinDialog d={checkingIn} onClose={() => setCheckingIn(null)} />
    </Page>
  );
}

function AgreementSkeleton() {
  return (
    <Card aria-busy>
      <div className="space-y-2">
        <Skeleton className="h-5 w-56 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2 border-t border-border-subtle pt-3">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function StewardshipCard({ d, onEdit, onCheckIn }: { d: Delegation; onEdit: () => void; onCheckIn: () => void }) {
  const { today } = useBootstrap();
  const roles = useRolesMap();
  const due = d.nextCheckin && d.nextCheckin <= today;
  const last = d.checkins[0];
  const role = d.roleId ? roles.get(d.roleId) : undefined;
  const setStatus = useApiMutation((status: "done" | "cancelled") => call(api.delegations[":id"].$patch({ param: { id: d.id }, json: { status } })), {
    success: (_, s) => (s === "done" ? "Stewardship completed" : "Stewardship cancelled"),
  });
  return (
    <Card render={<article />}>
      <CardHeader className="flex-wrap">
        <div className="min-w-0">
          <CardTitle as="h2">{d.title}</CardTitle>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
            <span>Steward: {d.delegate || "not set"}</span>
            {d.dueDate && (
              <>
                <MetaSep />
                <span className="tabular-nums">result by {fmtDate(d.dueDate, "d MMM")}</span>
              </>
            )}
            {role && (
              <>
                <MetaSep />
                <RoleBadge role={role} muted />
              </>
            )}
          </p>
        </div>
        {d.nextCheckin && (
          // A due check-in is an invitation (primary-soft), never lateness.
          <Chip tone={due ? "primary" : "outline"} icon={<CalendarClock />} className="tabular-nums">
            Check-in {relativeDay(d.nextCheckin, today)}
          </Chip>
        )}
      </CardHeader>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        {STEWARDSHIP_ELEMENTS.map((el, i) => {
          const value = d[el.key as keyof Delegation] as string;
          return (
            <div
              key={el.key}
              className={cn(
                "grid grid-cols-[1.25rem_minmax(0,1fr)] content-start gap-x-2 border-t border-border-subtle pt-3",
                i === STEWARDSHIP_ELEMENTS.length - 1 && "sm:col-span-2",
              )}
            >
              <dt className="col-span-2 grid grid-cols-subgrid items-baseline">
                <span aria-hidden className="font-serif text-lg leading-none text-faint-foreground tabular-nums">
                  {i + 1}
                </span>
                <span className="text-xs font-medium text-muted-foreground">{el.label}</span>
              </dt>
              <dd className="col-start-2 mt-1 text-sm whitespace-pre-wrap text-foreground">
                {value || (
                  <span className="text-muted-foreground">
                    Not agreed yet{" "}
                    <Button
                      variant="link"
                      size="inline"
                      onClick={onEdit}
                      aria-label={`Add ${el.label.toLowerCase()}`}
                      className="pointer-coarse:after:absolute pointer-coarse:after:-inset-3"
                    >
                      Add
                    </Button>
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      {last && (
        <div className="flex flex-wrap items-start gap-x-2 gap-y-1.5 text-sm">
          <MessageSquare aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="min-w-0 flex-1">
            <span className="text-muted-foreground tabular-nums">{fmtDate(last.date, "d MMM")}:</span> {last.notes || "Checked in"}
          </p>
          {last.onTrack === false && (
            <Chip tone="warning" icon={<LifeBuoy />}>
              Needs help
            </Chip>
          )}
        </div>
      )}
      {/* The actions wrap inside their own group, so the ⋯ menu stays on the first row. */}
      <CardFooter className="items-start">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {/* A due check-in is an invitation (primary-soft, like its chip); the header's
              "New stewardship" stays the page's one solid primary. */}
          <Button size="sm" variant={due ? "soft" : "outline"} onClick={onCheckIn}>
            <MessageSquare /> Check in
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil /> Edit agreement
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setStatus.mutate("done")}>
            <Check /> Result achieved
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<IconButton label="More actions" icon={<Ellipsis />} className="shrink-0" />} />
          <DropdownMenuContent align="end" className="w-auto">
            <DropdownMenuItem onClick={() => setStatus.mutate("cancelled")}>
              <X /> Cancel stewardship
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}

function StewardshipDialog({ draft, onClose }: { draft: Draft | null; onClose: () => void }) {
  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg" placement="top">
        {draft && <StewardshipForm key={draft.id ?? "new"} initial={draft} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function StewardshipForm({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const { today } = useBootstrap();
  const { openTask } = useAppState();
  const uid = useId();
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
    // `contents`: the fields and the sticky footer lay out as direct children of the dialog.
    <form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        if (d.title.trim()) save.mutate(undefined);
      }}
    >
      <DialogHeader>
        <DialogTitle>{initial.id ? "Stewardship agreement" : "New stewardship agreement"}</DialogTitle>
        <DialogDescription>Agree on what, not how. Write it together with the person if you can.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid gap-2">
          <Label htmlFor={`${uid}-title`}>Stewardship</Label>
          <Input id={`${uid}-title`} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="e.g. Weekly release notes" autoFocus />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${uid}-delegate`}>Steward</Label>
          <Input id={`${uid}-delegate`} value={d.delegate} onChange={(e) => setD({ ...d, delegate: e.target.value })} placeholder="Who owns it?" />
        </div>
      </div>
      {STEWARDSHIP_ELEMENTS.map((el, i) => (
        // The numbered ledger, as on the card: the numeral hangs in its own column, so the label,
        // the prompt and the field share one left edge.
        <div key={el.key} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2 gap-y-1.5">
          <div className="col-span-2 grid grid-cols-subgrid items-baseline">
            <span aria-hidden className="font-serif text-lg leading-none text-faint-foreground tabular-nums">
              {i + 1}
            </span>
            <Label htmlFor={`${uid}-${el.key}`}>{el.label}</Label>
          </div>
          <p id={`${uid}-${el.key}-prompt`} className="col-start-2 text-xs text-muted-foreground">
            {el.prompt}
          </p>
          <Textarea
            id={`${uid}-${el.key}`}
            aria-describedby={`${uid}-${el.key}-prompt`}
            rows={2}
            value={d[el.key]}
            onChange={(e) => setD({ ...d, [el.key]: e.target.value })}
            className="col-start-2 mt-0.5"
          />
          {el.key === "desiredResults" && methodish && (
            // Coaching, not a warning: amber is for real deadlines and over-capacity only.
            <p className="col-start-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Lightbulb aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <span className="font-medium text-foreground">This reads like a method.</span> Describe the result, and let them
                choose how.
              </span>
            </p>
          )}
        </div>
      ))}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)]">
        <div className="grid content-start gap-2">
          <Label htmlFor={`${uid}-due`}>Result by</Label>
          <DateField id={`${uid}-due`} value={d.dueDate} onChange={(dueDate) => setD({ ...d, dueDate })} size="sm" className="w-full" />
        </div>
        <div className="grid content-start gap-2">
          <Label id={`${uid}-every`}>Check in every</Label>
          <Segmented<"3" | "7" | "14" | "30">
            size="sm"
            aria-labelledby={`${uid}-every`}
            value={String(d.checkinEveryDays) as "7"}
            onChange={(v) => setD({ ...d, checkinEveryDays: Number(v) })}
            options={[
              { value: "3", label: "3d" },
              { value: "7", label: "1w" },
              { value: "14", label: "2w" },
              { value: "30", label: "1m" },
            ]}
            className="w-fit"
          />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor={`${uid}-role`}>Role</Label>
          <RoleSelect id={`${uid}-role`} value={d.roleId} onChange={(roleId) => setD({ ...d, roleId })} size="sm" className="w-full" />
        </div>
      </div>
      <DialogFooter
        start={
          taskId ? (
            <Button type="button" variant="ghost" onClick={() => openTask(taskId)}>
              Open the task
            </Button>
          ) : null
        }
      >
        <Button type="submit" disabled={!d.title.trim() || save.isPending} pending={save.isPending}>
          Save agreement
        </Button>
      </DialogFooter>
    </form>
  );
}

function CheckinDialog({ d, onClose }: { d: Delegation | null; onClose: () => void }) {
  const uid = useId();
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
      <DialogContent size="md">
        {d && (
          <>
            <DialogHeader>
              <DialogTitle>Check in: {d.title}</DialogTitle>
              <DialogDescription>
                As agreed, {d.delegate || "they"} judge{d.delegate ? "s" : ""} the result against the standard; you ask how you can help.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label id={`${uid}-on-track`}>On track?</Label>
              <Segmented
                aria-labelledby={`${uid}-on-track`}
                value={onTrack}
                onChange={setOnTrack}
                options={[
                  { value: "yes", label: "On track" },
                  { value: "no", label: "Needs help" },
                ]}
                className="w-fit"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${uid}-notes`}>Notes</Label>
              <Textarea
                id={`${uid}-notes`}
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did they report? How will you help?"
              />
            </div>
            <DialogFooter>
              <Button onClick={() => save.mutate(undefined)} disabled={save.isPending} pending={save.isPending}>
                Save check-in
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
