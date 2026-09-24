import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, CircleCheck, Cloud, Inbox, Leaf, MessageSquareQuote, Sprout, Trash2, User, Users } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { CONTROL_KINDS, INFLUENCE_METHODS, PROACTIVE_CHALLENGE, type ControlKind } from "@shared/content.ts";
import { addDaysISO, daysBetween } from "@shared/dates.ts";
import { analyzeLanguage, LANGUAGE_PATTERNS } from "@shared/language.ts";
import { useAppState } from "@/components/app-state";
import { ChoiceChip } from "@/components/chip";
import { LanguageHint } from "@/components/language-hint";
import { Page, PageHeader, PrincipleNote, RailSection, WithRail } from "@/components/page";
import { RoleSelect } from "@/components/pickers";
import { QuickAdd } from "@/components/quick-add";
import { MetaSep } from "@/components/row";
import { Segmented } from "@/components/segmented";
import { BoardColumn, boardCard } from "@/components/surface";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api, call, type Challenge, type ChallengeDay, type Concern } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { useBootstrap } from "@/lib/hooks";
import { useApiMutation } from "@/lib/mutations";
import { challengeQuery, concernsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Tab = "circle" | "challenge" | "language";

export const Route = createFileRoute("/_app/influence")({
  validateSearch: (search: Record<string, unknown>): { tab?: Tab } => ({
    tab: ["circle", "challenge", "language"].includes(search.tab as string) ? (search.tab as Tab) : undefined,
  }),
  component: InfluencePage,
});

function InfluencePage() {
  const { tab = "circle" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <Page>
      <PageHeader
        habit={1}
        eyebrow="Be proactive"
        title="Circle of Influence"
        description="Proactive people focus their energy on what they can do something about, and their influence grows. Every problem has a first step inside your circle, even if that step is your attitude."
      />
      <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v as Tab } })}>
        <TabsList>
          <TabsTrigger value="circle">Concerns</TabsTrigger>
          <TabsTrigger value="challenge">30-day test</TabsTrigger>
          <TabsTrigger value="language">Language</TabsTrigger>
        </TabsList>
        <TabsContent value="circle">
          <CircleTab />
        </TabsContent>
        <TabsContent value="challenge">
          <ChallengeTab />
        </TabsContent>
        <TabsContent value="language">
          <LanguageTab />
        </TabsContent>
      </Tabs>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Concerns                                                             */
/* ------------------------------------------------------------------ */

const COLUMNS: { key: ControlKind | "unsorted"; label: string; short: string; icon: ReactNode }[] = [
  { key: "unsorted", label: "Not sorted yet", short: "Where does this sit?", icon: <Inbox /> },
  { key: "direct", label: CONTROL_KINDS.direct.label, short: CONTROL_KINDS.direct.short, icon: <User /> },
  { key: "indirect", label: CONTROL_KINDS.indirect.label, short: CONTROL_KINDS.indirect.short, icon: <Users /> },
  { key: "none", label: CONTROL_KINDS.none.label, short: CONTROL_KINDS.none.short, icon: <Cloud /> },
];

const STATUS_LABELS: Record<Concern["status"], string> = {
  open: "Open",
  acting: "Acting on it",
  resolved: "Resolved",
  accepted: "Accepted",
};

function CircleTab() {
  const { data: concerns = [], isPending } = useQuery(concernsQuery());
  const [title, setTitle] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [editing, setEditing] = useState<Concern | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const create = useApiMutation((t: string) => call(api.concerns.$post({ json: { title: t } })), {
    onSuccess: (c) => setEditing(c),
  });

  const visible = concerns.filter((c) => showClosed || (c.status !== "resolved" && c.status !== "accepted"));
  const acting = concerns.filter((c) => c.status === "acting" || c.status === "resolved").length;
  const inside = concerns.filter((c) => c.control === "direct" || c.control === "indirect").length;
  const outside = concerns.filter((c) => c.control === "none").length;

  return (
    <div className="@container space-y-10">
      {/* Side by side only once the controls get a real column (not in the 768–1000px sidebar range). */}
      <div className="grid grid-cols-1 items-center gap-8 @2xl:grid-cols-[16rem_minmax(0,1fr)]">
        <CirclesDiagram inside={inside} outside={outside} acting={acting} total={concerns.length} />
        <div className="min-w-0 space-y-6">
          <div className="space-y-2">
            <QuickAdd
              value={title}
              onValueChange={setTitle}
              inputRef={inputRef}
              onSubmit={() => {
                if (title.trim()) create.mutate(title.trim());
                setTitle("");
              }}
              placeholder="What's weighing on you? A worry, a frustration, a problem…"
              aria-label="Add a concern"
            />
            <LanguageHint text={title} onChange={setTitle} returnFocusRef={inputRef} />
          </div>
          <PrincipleNote icon={<Leaf />}>
            Watch for <em>haves</em> (&ldquo;if only I had a better boss&rdquo;) and turn them into <em>bes</em> (&ldquo;I can be more
            resourceful&rdquo;). The problem &ldquo;out there&rdquo; usually has a first step &ldquo;in here&rdquo;.
          </PrincipleNote>
          <label className="inline-flex items-center gap-2.5 text-sm text-muted-foreground">
            <Switch checked={showClosed} onCheckedChange={setShowClosed} /> Show resolved and accepted
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = visible.filter((c) => (col.key === "unsorted" ? !c.control : c.control === col.key));
          if (col.key === "unsorted" && items.length === 0) return null;
          return (
            <BoardColumn
              key={col.key}
              title={col.label}
              icon={col.icon}
              count={items.length}
              empty={items.length === 0 && !isPending ? "Nothing here yet." : undefined}
              className="min-h-0 md:min-h-60"
            >
              {/* Side by side, every description reserves the lines the longest one wraps to at that
                  breakpoint's narrowest width, so the first cards start on one line across the board. */}
              <p className="-mt-1 mb-1 px-2 text-xs text-muted-foreground md:min-h-[3lh] lg:min-h-[2lh] xl:min-h-[3lh]">
                {col.short}
                {col.key !== "unsorted" && ` · ${CONTROL_KINDS[col.key].approach}`}
              </p>
              {isPending && <Skeleton aria-hidden className="h-20 rounded-lg" />}
              {items.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {items.map((c) => (
                    <li key={c.id}>
                      <ConcernCard concern={c} onOpen={() => setEditing(c)} />
                    </li>
                  ))}
                </ul>
              )}
            </BoardColumn>
          );
        })}
      </div>
      <ConcernDialog concern={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function ConcernCard({ concern: c, onOpen }: { concern: Concern; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(boardCard, "block w-full text-left transition-[box-shadow,scale] active:scale-(--motion-scale-press-lg)")}
    >
      <span className="block font-medium text-foreground">{c.title}</span>
      {c.beStatement && <span className="mt-1.5 block border-l-2 border-border-strong pl-2 voice-sm text-foreground italic">{c.beStatement}</span>}
      {c.firstStep && (
        <span className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
          <ArrowRight aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span className="min-w-0">{c.firstStep}</span>
        </span>
      )}
      <span className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        <span>{STATUS_LABELS[c.status] ?? "Open"}</span>
        {c.taskId && (
          <>
            <MetaSep />
            <span>first step on your list</span>
          </>
        )}
      </span>
    </button>
  );
}

/** An arc for text set along a circle: over the top (reads left to right) or under the bottom. */
function arcPath(r: number, side: "top" | "bottom") {
  return `M ${110 - r} 110 A ${r} ${r} 0 0 ${side === "top" ? 1 : 0} ${110 + r} 110`;
}

function CirclesDiagram({ inside, outside, acting, total }: { inside: number; outside: number; acting: number; total: number }) {
  const id = useId();
  // The inner circle grows as you act on things within your influence.
  const inner = Math.min(88, 46 + acting * 6);
  return (
    <svg
      viewBox="0 0 220 220"
      className="mx-auto w-full max-w-64"
      role="img"
      aria-label={`Circle of Concern with ${total} concerns; ${inside} inside your Circle of Influence`}
    >
      <defs>
        <path id={`${id}-top`} d={arcPath(95, "top")} />
        <path id={`${id}-bottom`} d={arcPath(101, "bottom")} />
      </defs>
      <circle cx="110" cy="110" r="108" className="fill-(--inset) stroke-border-strong" strokeWidth="1" />
      <circle cx="110" cy="110" r={inner} className="fill-primary-soft stroke-primary transition-[r] duration-480 ease-out [stroke-width:1.5]" />
      <text className="fill-muted-foreground text-2xs font-medium">
        <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
          Circle of concern
        </textPath>
      </text>
      <text className="fill-muted-foreground text-2xs tabular-nums">
        <textPath href={`#${id}-bottom`} startOffset="50%" textAnchor="middle">
          {outside} outside your control
        </textPath>
      </text>
      <text x="110" y="98" textAnchor="middle" className="fill-muted-foreground text-2xs font-medium">
        Influence
      </text>
      <text x="110" y="126" textAnchor="middle" className="fill-foreground font-serif text-2xl tabular-nums">
        {inside}
      </text>
      <text x="110" y="143" textAnchor="middle" className="fill-muted-foreground text-2xs tabular-nums">
        {acting} acted on
      </text>
    </svg>
  );
}

function ConcernDialog({ concern, onClose }: { concern: Concern | null; onClose: () => void }) {
  return (
    <Dialog open={!!concern} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg" placement="top">
        {concern && <ConcernForm key={concern.id} concern={concern} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ConcernForm({ concern, onClose }: { concern: Concern; onClose: () => void }) {
  const { openTask } = useAppState();
  const [d, setD] = useState(concern);
  const [roleId, setRoleId] = useState<string | null>(null);
  const uid = useId();
  const ids = {
    title: `${uid}-title`,
    control: `${uid}-control`,
    be: `${uid}-be`,
    method: `${uid}-method`,
    approach: `${uid}-approach`,
    firstStep: `${uid}-first-step`,
    notes: `${uid}-notes`,
    status: `${uid}-status`,
  };
  const save = useApiMutation((c: Concern) =>
    call(
      api.concerns[":id"].$patch({
        param: { id: c.id },
        json: { title: c.title, notes: c.notes, control: c.control, approach: c.approach, firstStep: c.firstStep, beStatement: c.beStatement, status: c.status },
      }),
    ),
  );
  const firstStep = useApiMutation(
    () => call(api.concerns[":id"]["first-step"].$post({ param: { id: concern.id }, json: { title: d.firstStep.trim() || undefined, roleId } })),
    {
      success: "First step added to your list as Quadrant II work",
      // Adopt what the server set (status "acting", the new task), so a later Save can't revert it.
      onSuccess: ({ concern: updated }) =>
        setD((cur) => ({ ...cur, status: updated.status, taskId: updated.taskId, firstStep: updated.firstStep })),
    },
  );
  const remove = useApiMutation(() => call(api.concerns[":id"].$delete({ param: { id: concern.id } })), { success: "Removed" });
  const kind = d.control;

  return (
    <>
      <DialogHeader>
        <DialogTitle>From concern to influence</DialogTitle>
        <DialogDescription>Sort it, reframe it, then take the first step that is within your control.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <Label htmlFor={ids.title}>Concern</Label>
        <Input id={ids.title} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
        <LanguageHint text={d.title} onChange={(title) => setD({ ...d, title })} />
      </div>
      <div className="grid gap-2">
        <Label id={ids.control}>How much control do you have?</Label>
        <Segmented<ControlKind>
          wrap
          aria-labelledby={ids.control}
          value={kind}
          onChange={(control) => setD({ ...d, control })}
          options={[
            { value: "direct", label: "Direct (my behavior)" },
            { value: "indirect", label: "Indirect (others)" },
            { value: "none", label: "None" },
          ]}
          className="w-fit"
        />
        {kind && <p className="text-xs text-muted-foreground">{CONTROL_KINDS[kind].approach}</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={ids.be}>Reframe it as a &ldquo;be&rdquo;: who can you be here?</Label>
        <Input
          id={ids.be}
          voice="sm"
          value={d.beStatement}
          onChange={(e) => setD({ ...d, beStatement: e.target.value })}
          placeholder="I can be more patient / prepared / resourceful…"
          className="italic"
        />
      </div>
      {kind === "indirect" && (
        <div className="grid gap-2">
          <Label id={ids.method}>Method of influence</Label>
          <div role="group" aria-labelledby={ids.method} className="flex flex-wrap gap-2">
            {INFLUENCE_METHODS.map((m) => (
              <ChoiceChip key={m} pressed={d.approach === m} onClick={() => setD({ ...d, approach: m })}>
                {m}
              </ChoiceChip>
            ))}
          </div>
        </div>
      )}
      {kind !== "indirect" && (
        <div className="grid gap-2">
          <Label htmlFor={ids.approach}>{kind === "none" ? "How will you choose to respond?" : "Which habit or behavior will you work on?"}</Label>
          <Input
            id={ids.approach}
            value={d.approach}
            onChange={(e) => setD({ ...d, approach: e.target.value })}
            placeholder={kind === "none" ? "Accept it peacefully; smile; focus elsewhere…" : "e.g. Pause before responding"}
          />
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor={ids.firstStep}>{kind ? CONTROL_KINDS[kind].prompt : "First step inside your Circle of Influence"}</Label>
        <Input id={ids.firstStep} value={d.firstStep} onChange={(e) => setD({ ...d, firstStep: e.target.value })} placeholder="A small, concrete next action" />
        {kind !== "none" && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <RoleSelect value={roleId} onChange={setRoleId} placeholder="For which role?" size="sm" />
            {d.taskId ? (
              <Button size="sm" variant="outline" onClick={() => openTask(d.taskId!)}>
                Open first step
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={save.isPending || firstStep.isPending}
                pending={save.isPending || firstStep.isPending}
                onClick={() => save.mutate(d, { onSuccess: () => firstStep.mutate(undefined) })}
              >
                <Sprout /> Put the first step on my list
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={ids.notes}>Notes</Label>
        <Textarea id={ids.notes} rows={2} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label id={ids.status}>Status</Label>
        <Segmented<Concern["status"]>
          aria-labelledby={ids.status}
          value={d.status}
          onChange={(status) => setD({ ...d, status })}
          options={[
            { value: "open", label: "Open" },
            { value: "acting", label: "Acting" },
            { value: "resolved", label: "Resolved" },
            { value: "accepted", label: "Accepted" },
          ]}
          className="w-fit"
        />
      </div>
      <DialogFooter
        start={
          <Button
            variant="destructive-ghost"
            onClick={() => {
              remove.mutate(undefined);
              onClose();
            }}
          >
            <Trash2 /> Remove
          </Button>
        }
      >
        <Button
          onClick={() => {
            save.mutate(d);
            onClose();
          }}
        >
          <Check /> Save
        </Button>
      </DialogFooter>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 30-day test                                                          */
/* ------------------------------------------------------------------ */

function ChallengeSkeleton() {
  return (
    <div aria-busy className="max-w-2xl space-y-5">
      <Skeleton className="h-8 w-72 max-w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="aspect-square min-h-10 rounded-full" />
        ))}
      </div>
    </div>
  );
}

type DayState = "kept" | "missed" | "today" | "open" | "future";

const DAY_STATE_LABEL: Record<DayState, string> = {
  kept: "kept",
  missed: "not kept",
  today: "today, not recorded yet",
  open: "not recorded",
  future: "upcoming",
};

const DAY_STATE_CLASS: Record<DayState, string> = {
  kept: "bg-primary text-primary-foreground hover:bg-primary-hover",
  // Hatched and neutral: a missed day is never amber or red.
  missed:
    "text-muted-foreground ring-1 ring-border ring-inset [background-image:repeating-linear-gradient(135deg,transparent_0_4px,var(--selected)_4px_5px)] hover:bg-subtle",
  today: "text-foreground ring-2 ring-primary ring-offset-2 ring-offset-background hover:bg-subtle",
  open: "text-foreground ring-1 ring-border ring-inset hover:bg-subtle",
  future: "cursor-default text-muted-foreground ring-1 ring-border-subtle ring-inset",
};

function ChallengeTab() {
  const { today } = useBootstrap();
  const { data } = useQuery(challengeQuery());
  const start = useApiMutation(() => call(api.challenge.$post({ json: {} })), { success: "Day 1 starts now. Make one small commitment and keep it." });
  const end = useApiMutation((v: { id: string; status: "completed" | "abandoned" }) =>
    call(api.challenge[":id"].$patch({ param: { id: v.id }, json: { status: v.status } })),
  );
  const [selected, setSelected] = useState<string | null>(null);
  if (!data) return <ChallengeSkeleton />;
  const active = data.active;

  if (!active) {
    return (
      <div className="max-w-2xl">
        <h2 className="voice-display text-2xl text-foreground">Test the principle for thirty days</h2>
        <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
          You don&apos;t need extraordinary circumstances to practise proactivity. It happens in ordinary moments: a traffic jam, an
          irritated customer, a promise to yourself. For thirty days:
        </p>
        <ul className="mt-5 space-y-2.5">
          {PROACTIVE_CHALLENGE.rules.map((r) => (
            <li key={r} className="flex items-start gap-2.5 text-sm text-foreground">
              <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" /> {r}
            </li>
          ))}
        </ul>
        <p className="mt-5 max-w-[60ch] text-sm text-muted-foreground">
          Each day you&apos;ll set one small commitment on Today and check in that evening. Missing a day is fine: just keep going.
        </p>
        <Button size="lg" className="mt-6" onClick={() => start.mutate(undefined)} disabled={start.isPending} pending={start.isPending}>
          <Sprout /> Start the 30-day test
        </Button>
        {data.history.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground tabular-nums">
            Previous: {data.history.map((h) => `${fmtDate(h.startedOn, "d MMM yyyy")} (${h.status})`).join(", ")}
          </p>
        )}
      </div>
    );
  }

  const dayNumber = daysBetween(active.startedOn, today) + 1;
  const days = Array.from({ length: 30 }, (_, i) => addDaysISO(active.startedOn, i));
  const byDate = new Map(data.days.map((d) => [d.date, d]));
  const kept = data.days.filter((d) => d.kept).length;
  const recorded = data.days.filter((d) => d.kept != null).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h2 className="voice-display text-2xl text-foreground tabular-nums sm:text-3xl">Day {Math.min(dayNumber, 30)} of 30</h2>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            Started {fmtDate(active.startedOn, "d MMMM")} <MetaSep /> {kept} commitments kept of {recorded} recorded
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {dayNumber > 30 && (
            <Button onClick={() => end.mutate({ id: active.id, status: "completed" })}>
              <Check /> Complete the test
            </Button>
          )}
          <Button variant="ghost" className="max-sm:first:-ml-3.5" onClick={() => end.mutate({ id: active.id, status: "abandoned" })}>
            End early
          </Button>
        </div>
      </div>
      <ol className="grid max-w-2xl grid-cols-6 gap-2 sm:grid-cols-10" aria-label="Thirty days">
        {days.map((d, i) => {
          const day = byDate.get(d);
          const future = d > today;
          const state: DayState =
            day?.kept === true ? "kept" : day?.kept === false ? "missed" : future ? "future" : d === today ? "today" : "open";
          const label = `${fmtDate(d, "EEE d MMM")}: ${DAY_STATE_LABEL[state]}${day?.commitment ? `. ${day.commitment}` : ""}`;
          return (
            <li key={d} className="min-w-0">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      disabled={future}
                      onClick={() => setSelected(d)}
                      aria-label={`Day ${i + 1}, ${label}`}
                      className={cn(
                        "grid aspect-square w-full min-h-10 place-items-center rounded-full text-sm font-medium tabular-nums transition-colors duration-120 pointer-coarse:min-h-11",
                        DAY_STATE_CLASS[state],
                      )}
                    />
                  }
                >
                  {state === "kept" ? (
                    <>
                      <Check aria-hidden className="size-4" />
                      <span className="sr-only">{i + 1}</span>
                    </>
                  ) : (
                    i + 1
                  )}
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ol>
      <PrincipleNote>
        Be a light, not a judge; a model, not a critic. When you slip, admit it, correct it and learn from it, right away. Then keep
        going.
      </PrincipleNote>
      {selected && <DayEditor challenge={active} date={selected} day={byDate.get(selected) ?? null} onClose={() => setSelected(null)} />}
    </div>
  );
}

function DayEditor({ challenge, date, day, onClose }: { challenge: Challenge; date: string; day: ChallengeDay | null; onClose: () => void }) {
  const [d, setD] = useState({
    commitment: day?.commitment ?? "",
    kept: day?.kept ?? null,
    inInfluence: day?.inInfluence ?? null,
    proactiveLanguage: day?.proactiveLanguage ?? null,
    ownedMistakes: day?.ownedMistakes ?? null,
    note: day?.note ?? "",
  });
  useEffect(() => {
    setD({
      commitment: day?.commitment ?? "",
      kept: day?.kept ?? null,
      inInfluence: day?.inInfluence ?? null,
      proactiveLanguage: day?.proactiveLanguage ?? null,
      ownedMistakes: day?.ownedMistakes ?? null,
      note: day?.note ?? "",
    });
  }, [day, date]);
  const uid = useId();
  const save = useApiMutation(() => call(api.challenge[":id"].days[":date"].$put({ param: { id: challenge.id, date }, json: d })), {
    success: "Saved",
    onSuccess: onClose,
  });
  const yn = (key: "kept" | "inInfluence" | "proactiveLanguage" | "ownedMistakes", label: string) => (
    <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-sm text-foreground">
      <span id={`${uid}-${key}`}>{label}</span>
      <Segmented<"yes" | "no">
        size="sm"
        aria-labelledby={`${uid}-${key}`}
        value={d[key] == null ? null : d[key] ? "yes" : "no"}
        onChange={(v) => setD({ ...d, [key]: v === "yes" })}
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]}
      />
    </div>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{fmtDate(date, "EEEE d MMMM")}</DialogTitle>
          <DialogDescription>Day {daysBetween(challenge.startedOn, date) + 1} of 30</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor={`${uid}-commitment`}>Small commitment</Label>
          <Input id={`${uid}-commitment`} value={d.commitment} onChange={(e) => setD({ ...d, commitment: e.target.value })} />
        </div>
        <div className="grid gap-1">
          {yn("kept", "Kept it")}
          {yn("inInfluence", "Worked in my Circle of Influence")}
          {yn("proactiveLanguage", "Used proactive language")}
          {yn("ownedMistakes", "Owned my mistakes quickly")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${uid}-note`}>Note</Label>
          <Textarea id={`${uid}-note`} rows={2} value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} />
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate(undefined)} disabled={save.isPending} pending={save.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Language                                                             */
/* ------------------------------------------------------------------ */

function LanguageTab() {
  const [text, setText] = useState("");
  const matches = useMemo(() => analyzeLanguage(text), [text]);
  return (
    <WithRail
      rail={
        <RailSection title="Reactive → proactive">
          <ul className="divide-y divide-border-subtle">
            {LANGUAGE_PATTERNS.filter((p) => p.severity === "strong").map((p) => (
              <li key={p.id} className="py-2.5 first:pt-0 last:pb-0">
                <p className="text-muted-foreground">{p.why}</p>
                <p className="mt-0.5 font-medium text-foreground">{p.reframes[0]}</p>
              </li>
            ))}
          </ul>
        </RailSection>
      }
    >
      <div className="space-y-4">
        <h2 className="voice-display text-2xl text-foreground">Listen to your language</h2>
        <p className="-mt-2 max-w-[60ch] text-sm text-muted-foreground">
          Reactive language quietly hands responsibility to circumstances or other people, and then becomes a self-fulfilling
          prophecy. Write freely about something frustrating and watch where you give your power away.
        </p>
        <Textarea
          rows={8}
          voice="md"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Write about something frustrating"
          // field-sizing grows the field to fit its text; keep room to write, like the eight rows it asks for.
          className="min-h-56"
          placeholder="e.g. I have to finish the report tonight because my boss makes me so stressed. If only the team were more organised…"
        />
        {text.trim() && (
          <Card size="sm">
            {matches.length === 0 ? (
              <p className="flex items-center gap-2 text-muted-foreground">
                <CircleCheck aria-hidden className="size-4 shrink-0 text-success" />
                No reactive phrasing found. Nicely owned.
              </p>
            ) : (
              <ul className="divide-y divide-border-subtle">
                {matches.map((m, i) => (
                  <li key={`${m.index}-${i}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <MessageSquareQuote aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-foreground">
                        <span className="font-medium">&ldquo;{m.text}&rdquo;</span> <span className="text-muted-foreground">→ try</span>{" "}
                        {m.reframes.join(" / ")}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{m.why}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
        <p className="text-xs text-muted-foreground">
          The same coach gently flags reactive phrasing across the app (captures, notes, reflections). Adjust or turn it off in
          Settings.
        </p>
      </div>
    </WithRail>
  );
}
