import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Leaf, MessageSquareQuote, Plus, Sprout, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CONTROL_KINDS, INFLUENCE_METHODS, PROACTIVE_CHALLENGE, type ControlKind } from "@shared/content.ts";
import { addDaysISO, daysBetween } from "@shared/dates.ts";
import { analyzeLanguage, LANGUAGE_PATTERNS } from "@shared/language.ts";
import { useAppState } from "@/components/app-state";
import { LanguageHint } from "@/components/language-hint";
import { Page, PageHeader, PrincipleNote } from "@/components/page";
import { RoleSelect } from "@/components/pickers";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
        eyebrow="Habit 1 · Be proactive"
        title="Circle of Influence"
        description="Proactive people focus their energy on what they can do something about, and their influence grows. Every problem has a first step inside your circle, even if that step is your attitude."
      />
      <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v as Tab } })}>
        <TabsList>
          <TabsTrigger value="circle">Concerns</TabsTrigger>
          <TabsTrigger value="challenge">30-day test</TabsTrigger>
          <TabsTrigger value="language">Language</TabsTrigger>
        </TabsList>
        <TabsContent value="circle" className="pt-4">
          <CircleTab />
        </TabsContent>
        <TabsContent value="challenge" className="pt-4">
          <ChallengeTab />
        </TabsContent>
        <TabsContent value="language" className="pt-4">
          <LanguageTab />
        </TabsContent>
      </Tabs>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Concerns                                                             */
/* ------------------------------------------------------------------ */

const COLUMNS: { key: ControlKind | "unsorted"; label: string; short: string }[] = [
  { key: "unsorted", label: "Not sorted yet", short: "Where does this sit?" },
  { key: "direct", label: CONTROL_KINDS.direct.label, short: CONTROL_KINDS.direct.short },
  { key: "indirect", label: CONTROL_KINDS.indirect.label, short: CONTROL_KINDS.indirect.short },
  { key: "none", label: CONTROL_KINDS.none.label, short: CONTROL_KINDS.none.short },
];

function CircleTab() {
  const { data: concerns = [] } = useQuery(concernsQuery());
  const [title, setTitle] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [editing, setEditing] = useState<Concern | null>(null);
  const create = useApiMutation((t: string) => call(api.concerns.$post({ json: { title: t } })), {
    onSuccess: (c) => setEditing(c),
  });

  const visible = concerns.filter((c) => showClosed || (c.status !== "resolved" && c.status !== "accepted"));
  const acting = concerns.filter((c) => c.status === "acting" || c.status === "resolved").length;
  const inside = concerns.filter((c) => c.control === "direct" || c.control === "indirect").length;
  const outside = concerns.filter((c) => c.control === "none").length;

  return (
    <div className="space-y-6">
      <div className="grid items-center gap-6 md:grid-cols-[260px_1fr]">
        <CirclesDiagram inside={inside} outside={outside} acting={acting} total={concerns.length} />
        <div className="space-y-3">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim()) create.mutate(title.trim());
              setTitle("");
            }}
          >
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's weighing on you? A worry, a frustration, a problem…" />
            <Button type="submit" disabled={!title.trim()}>
              <Plus /> Add
            </Button>
          </form>
          <LanguageHint text={title} onChange={setTitle} />
          <PrincipleNote icon={<Leaf className="size-4" />}>
            Watch for <em>haves</em> (&ldquo;if only I had a better boss&rdquo;) and turn them into <em>bes</em> (&ldquo;I can be more
            resourceful&rdquo;). The problem &ldquo;out there&rdquo; usually has a first step &ldquo;in here&rdquo;.
          </PrincipleNote>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={showClosed} onCheckedChange={setShowClosed} /> Show resolved and accepted
          </label>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = visible.filter((c) => (col.key === "unsorted" ? !c.control : c.control === col.key));
          if (col.key === "unsorted" && items.length === 0) return null;
          return (
            <section key={col.key} className={cn("rounded-2xl border bg-card p-3", col.key === "unsorted" && "border-dashed")}>
              <div className="mb-2">
                <div className="text-sm font-semibold">{col.label}</div>
                <div className="text-xs text-muted-foreground">
                  {col.short}
                  {col.key !== "unsorted" && ` · ${CONTROL_KINDS[col.key].approach}`}
                </div>
              </div>
              <ul className="space-y-2">
                {items.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setEditing(c)}
                      className="w-full rounded-xl border bg-background p-2.5 text-left text-sm hover:border-primary/40"
                    >
                      <div className="font-medium">{c.title}</div>
                      {c.beStatement && <div className="compass-text mt-1 !text-sm text-primary italic">{c.beStatement}</div>}
                      {c.firstStep && (
                        <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                          <ArrowRight className="mt-0.5 size-3 shrink-0" /> {c.firstStep}
                        </div>
                      )}
                      <div className="mt-1.5 text-[11px] text-muted-foreground">
                        {c.status === "acting" ? "Acting on it" : c.status === "resolved" ? "Resolved" : c.status === "accepted" ? "Accepted" : "Open"}
                        {c.taskId && " · first step on your list"}
                      </div>
                    </button>
                  </li>
                ))}
                {items.length === 0 && <li className="text-xs text-muted-foreground/70">Nothing here.</li>}
              </ul>
            </section>
          );
        })}
      </div>
      <ConcernDialog concern={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function CirclesDiagram({ inside, outside, acting, total }: { inside: number; outside: number; acting: number; total: number }) {
  // The inner circle grows as you act on things within your influence.
  const inner = Math.min(88, 46 + acting * 6);
  return (
    <svg viewBox="0 0 220 220" className="mx-auto w-full max-w-[240px]" role="img" aria-label={`Circle of Concern with ${total} concerns; ${inside} inside your Circle of Influence`}>
      <circle cx="110" cy="110" r="104" className="fill-muted/60 stroke-border" strokeWidth="1.5" />
      <circle cx="110" cy="110" r={inner} className="fill-primary/15 stroke-primary transition-all duration-700" strokeWidth="2" />
      <text x="110" y="28" textAnchor="middle" className="fill-muted-foreground text-[9px] font-medium tracking-wider uppercase">
        Circle of Concern
      </text>
      <text x="110" y="40" textAnchor="middle" className="fill-muted-foreground text-[10px]">
        {outside} outside your control
      </text>
      <text x="110" y="106" textAnchor="middle" className="fill-primary text-[9px] font-semibold tracking-wider uppercase">
        Influence
      </text>
      <text x="110" y="124" textAnchor="middle" className="fill-foreground text-[18px] font-semibold">
        {inside}
      </text>
      <text x="110" y="138" textAnchor="middle" className="fill-muted-foreground text-[9px]">
        {acting} acted on
      </text>
    </svg>
  );
}

function ConcernDialog({ concern, onClose }: { concern: Concern | null; onClose: () => void }) {
  return (
    <Dialog open={!!concern} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="top-[6vh] max-h-[88vh] translate-y-0 overflow-y-auto sm:max-w-xl">
        {concern && <ConcernForm key={concern.id} concern={concern} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ConcernForm({ concern, onClose }: { concern: Concern; onClose: () => void }) {
  const { openTask } = useAppState();
  const [d, setD] = useState(concern);
  const [roleId, setRoleId] = useState<string | null>(null);
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
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>From concern to influence</DialogTitle>
        <DialogDescription>Sort it, reframe it, then take the first step that is within your control.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-1.5">
        <Label>Concern</Label>
        <Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
        <LanguageHint text={d.title} onChange={(title) => setD({ ...d, title })} />
      </div>
      <div className="grid gap-1.5">
        <Label>How much control do you have?</Label>
        <Segmented<ControlKind>
          size="sm"
          value={kind}
          onChange={(control) => setD({ ...d, control })}
          options={[
            { value: "direct", label: "Direct (my behavior)" },
            { value: "indirect", label: "Indirect (others)" },
            { value: "none", label: "None" },
          ]}
        />
        {kind && <p className="text-xs text-muted-foreground">{CONTROL_KINDS[kind].approach}</p>}
      </div>
      <div className="grid gap-1.5">
        <Label>Reframe it as a &ldquo;be&rdquo;: who can you be here?</Label>
        <Input
          value={d.beStatement}
          onChange={(e) => setD({ ...d, beStatement: e.target.value })}
          placeholder="I can be more patient / prepared / resourceful…"
          className="compass-text italic"
        />
      </div>
      {kind === "indirect" && (
        <div className="grid gap-1.5">
          <Label>Method of influence</Label>
          <div className="flex flex-wrap gap-1">
            {INFLUENCE_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setD({ ...d, approach: m })}
                className={cn("rounded-full border px-2.5 py-0.5 text-xs", d.approach === m ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
      {kind !== "indirect" && (
        <div className="grid gap-1.5">
          <Label>{kind === "none" ? "How will you choose to respond?" : "Which habit or behavior will you work on?"}</Label>
          <Input
            value={d.approach}
            onChange={(e) => setD({ ...d, approach: e.target.value })}
            placeholder={kind === "none" ? "Accept it peacefully; smile; focus elsewhere…" : "e.g. Pause before responding"}
          />
        </div>
      )}
      <div className="grid gap-1.5">
        <Label>{kind ? CONTROL_KINDS[kind].prompt : "First step inside your Circle of Influence"}</Label>
        <Input value={d.firstStep} onChange={(e) => setD({ ...d, firstStep: e.target.value })} placeholder="A small, concrete next action" />
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
                onClick={() => save.mutate(d, { onSuccess: () => firstStep.mutate(undefined) })}
              >
                <Sprout /> Put the first step on my list
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label>Notes</Label>
        <Textarea rows={2} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />
      </div>
      <div className="grid gap-1.5">
        <Label>Status</Label>
        <Segmented<Concern["status"]>
          size="sm"
          value={d.status}
          onChange={(status) => setD({ ...d, status })}
          options={[
            { value: "open", label: "Open" },
            { value: "acting", label: "Acting" },
            { value: "resolved", label: "Resolved" },
            { value: "accepted", label: "Accepted" },
          ]}
        />
      </div>
      <DialogFooter className="sm:justify-between">
        <Button
          variant="ghost"
          className="text-destructive"
          onClick={() => {
            remove.mutate(undefined);
            onClose();
          }}
        >
          <Trash2 /> Remove
        </Button>
        <Button
          onClick={() => {
            save.mutate(d);
            onClose();
          }}
        >
          <Check /> Save
        </Button>
      </DialogFooter>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 30-day test                                                          */
/* ------------------------------------------------------------------ */

function ChallengeTab() {
  const { today } = useBootstrap();
  const { data } = useQuery(challengeQuery());
  const start = useApiMutation(() => call(api.challenge.$post({ json: {} })), { success: "Day 1 starts now. Make one small commitment and keep it." });
  const end = useApiMutation((v: { id: string; status: "completed" | "abandoned" }) =>
    call(api.challenge[":id"].$patch({ param: { id: v.id }, json: { status: v.status } })),
  );
  const [selected, setSelected] = useState<string | null>(null);
  if (!data) return null;
  const active = data.active;

  if (!active) {
    return (
      <div className="max-w-2xl space-y-5">
        <h2 className="compass-display text-2xl">Test the principle for thirty days</h2>
        <p className="text-muted-foreground">
          You don&apos;t need extraordinary circumstances to practise proactivity. It happens in ordinary moments: a traffic jam, an
          irritated customer, a promise to yourself. For thirty days:
        </p>
        <ul className="space-y-2">
          {PROACTIVE_CHALLENGE.rules.map((r) => (
            <li key={r} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {r}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">Each day you&apos;ll set one small commitment on Today and check in that evening. Missing a day is fine: just keep going.</p>
        <Button size="lg" onClick={() => start.mutate(undefined)} disabled={start.isPending}>
          <Sprout /> Start the 30-day test
        </Button>
        {data.history.length > 0 && (
          <p className="text-xs text-muted-foreground">
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="compass-display text-2xl">Day {Math.min(dayNumber, 30)} of 30</h2>
          <p className="text-sm text-muted-foreground">
            Started {fmtDate(active.startedOn, "d MMMM")} · {kept} commitments kept of {recorded} recorded
          </p>
        </div>
        <div className="flex gap-2">
          {dayNumber > 30 && (
            <Button onClick={() => end.mutate({ id: active.id, status: "completed" })}>
              <Check /> Complete the test
            </Button>
          )}
          <Button variant="ghost" onClick={() => end.mutate({ id: active.id, status: "abandoned" })}>
            End early
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
        {days.map((d, i) => {
          const day = byDate.get(d);
          const future = d > today;
          return (
            <button
              key={d}
              type="button"
              disabled={future}
              onClick={() => setSelected(d)}
              title={`${fmtDate(d, "EEE d MMM")}${day?.commitment ? `: ${day.commitment}` : ""}`}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-lg border text-xs font-medium transition-colors disabled:opacity-40",
                day?.kept === true && "border-primary bg-primary text-primary-foreground",
                day?.kept === false && "border-warning/50 bg-warning/10",
                d === today && day?.kept == null && "ring-2 ring-primary",
                !future && day?.kept == null && "hover:bg-muted",
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
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
  const save = useApiMutation(() => call(api.challenge[":id"].days[":date"].$put({ param: { id: challenge.id, date }, json: d })), {
    success: "Saved",
    onSuccess: onClose,
  });
  const yn = (key: "kept" | "inInfluence" | "proactiveLanguage" | "ownedMistakes", label: string) => (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span>{label}</span>
      <Segmented<"yes" | "no">
        size="sm"
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{fmtDate(date, "EEEE d MMMM")}</DialogTitle>
          <DialogDescription>Day {daysBetween(challenge.startedOn, date) + 1} of 30</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label>Small commitment</Label>
          <Input value={d.commitment} onChange={(e) => setD({ ...d, commitment: e.target.value })} />
        </div>
        {yn("kept", "Kept it")}
        {yn("inInfluence", "Worked in my Circle of Influence")}
        {yn("proactiveLanguage", "Used proactive language")}
        {yn("ownedMistakes", "Owned my mistakes quickly")}
        <div className="grid gap-1.5">
          <Label>Note</Label>
          <Textarea rows={2} value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} />
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate(undefined)} disabled={save.isPending}>
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
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-3">
        <h2 className="compass-display text-2xl">Listen to your language</h2>
        <p className="text-muted-foreground">
          Reactive language quietly hands responsibility to circumstances or other people, and then becomes a self-fulfilling
          prophecy. Write freely about something frustrating and watch where you give your power away.
        </p>
        <Textarea
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="compass-text"
          placeholder="e.g. I have to finish the report tonight because my boss makes me so stressed. If only the team were more organised…"
        />
        {text.trim() && (
          <div className="rounded-xl border bg-card p-3 text-sm">
            {matches.length === 0 ? (
              <p className="text-muted-foreground">No reactive phrasing found. Nicely owned.</p>
            ) : (
              <ul className="space-y-2">
                {matches.map((m, i) => (
                  <li key={`${m.index}-${i}`} className="flex gap-2">
                    <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      <span className="font-medium">&ldquo;{m.text}&rdquo;</span> → try <span className="text-primary">{m.reframes.join(" / ")}</span>
                      <span className="block text-xs text-muted-foreground">{m.why}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          The same coach gently flags reactive phrasing across the app (captures, notes, reflections). Adjust or turn it off in
          Settings.
        </p>
      </div>
      <aside className="space-y-2">
        <h3 className="text-sm font-semibold">Reactive → proactive</h3>
        <ul className="space-y-1.5 text-sm">
          {LANGUAGE_PATTERNS.filter((p) => p.severity === "strong").map((p) => (
            <li key={p.id} className="rounded-lg border bg-card px-3 py-2">
              <div className="text-muted-foreground">{p.why}</div>
              <div className="mt-0.5 font-medium text-primary">{p.reframes[0]}</div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
