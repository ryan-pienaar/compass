import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Compass, Pause, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FUNERAL_EXERCISE, MISSION_FREEWRITE_LENSES, MISSION_QUESTIONS } from "@shared/content.ts";
import { todayISO } from "@shared/dates.ts";
import { IconButton } from "@/components/icon-button";
import { PrincipleNote } from "@/components/page";
import { RowActions } from "@/components/row";
import { SaveStatus } from "@/components/save-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, call } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { useAutosave } from "@/lib/hooks";
import { useApiMutation } from "@/lib/mutations";
import { journalQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useSingletonEntry } from "./journal-singleton";

export function ExercisesTab() {
  return (
    <div className="divide-y divide-border-subtle">
      <TributeExercise />
      <FreeWrite />
      <Questions />
      <Resources />
    </div>
  );
}

/** The idle save status until this visit has saved something. */
const AUTOSAVES = "Autosaves as you write";

/**
 * One exercise: a serif title, a lede, an optional status or control at the right, then the work.
 * `measure` keeps the whole exercise to a writing column: 40rem is the 65-character measure of the
 * 18px serif field (§3.2), and the aside then sits over the field's right edge.
 */
function ExerciseSection({
  title,
  lede,
  aside,
  measure = false,
  children,
}: {
  title: ReactNode;
  lede?: ReactNode;
  aside?: ReactNode;
  measure?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className="py-10 first:pt-0">
      <div className={cn(measure && "max-w-160")}>
        <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 flex-1 basis-72 space-y-2">
            <h2 className="voice-display text-2xl text-foreground">{title}</h2>
            {lede && <div className="max-w-[60ch] text-sm text-muted-foreground">{lede}</div>}
          </div>
          {aside}
        </header>
        {children}
      </div>
    </section>
  );
}

/** Loading shape of a section: heading, lede and a block the height of the fields. */
function SectionSkeleton({ height }: { height: string }) {
  return (
    <section className="space-y-3 py-10 first:pt-0">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className={cn("mt-6", height)} />
    </section>
  );
}

/* ---------------- Tribute (funeral) visualization ---------------- */

type TributeData = Record<string, Record<string, string>>;

function TributeExercise() {
  const { entry, isLoading, save } = useSingletonEntry("tribute");
  if (isLoading) return <SectionSkeleton height="h-64" />;
  return (
    <TributeForm
      initial={(entry?.data as TributeData | null) ?? {}}
      onSave={(d) => save.mutate({ title: "Tribute exercise", body: summarize(d), data: d })}
      saving={save.isPending}
      saved={save.isSuccess}
    />
  );
}

function summarize(d: TributeData) {
  return FUNERAL_EXERCISE.speakers
    .map((s) => {
      const parts = FUNERAL_EXERCISE.lenses.map((l) => d[s.key]?.[l.key]).filter(Boolean);
      return parts.length ? `${s.label}: ${parts.join(" / ")}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function TributeForm({
  initial,
  onSave,
  saving,
  saved,
}: {
  initial: TributeData;
  onSave: (d: TributeData) => void;
  saving: boolean;
  saved: boolean;
}) {
  const [d, setD] = useState<TributeData>(initial);
  const pending = useAutosave(d, onSave, 1000);
  const set = (speaker: string, lens: string, value: string) => setD({ ...d, [speaker]: { ...d[speaker], [lens]: value } });
  return (
    <ExerciseSection
      title="The end in mind"
      lede={
        <>
          <p className="voice max-w-[65ch] text-foreground">{FUNERAL_EXERCISE.intro}</p>
          <p className="mt-2">Take your time. There are no right answers, and this autosaves.</p>
        </>
      }
      // The lede already says it autosaves: the status stays hidden (its space kept) until a save starts.
      aside={<SaveStatus saving={pending || saving} label={saved ? "Saved" : ""} className={cn(!pending && !saving && !saved && "opacity-0")} />}
    >
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2">
        {FUNERAL_EXERCISE.speakers.map((s) => (
          <div key={s.key} className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">{s.label}</h3>
            {FUNERAL_EXERCISE.lenses.map((l) => {
              const fieldId = `tribute-${s.key}-${l.key}`;
              return (
                <div key={l.key} className="grid gap-1.5">
                  <Label size="sm" htmlFor={fieldId} className="block">
                    <span className="text-foreground">{l.label}:</span> {l.prompt}
                  </Label>
                  <Textarea id={fieldId} voice="sm" rows={2} value={d[s.key]?.[l.key] ?? ""} onChange={(e) => set(s.key, l.key, e.target.value)} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <PrincipleNote icon={<Compass />} className="mt-10">
        {FUNERAL_EXERCISE.outro}
      </PrincipleNote>
    </ExerciseSection>
  );
}

/* ---------------- 15-minute free-write ---------------- */

function FreeWrite() {
  const [seconds, setSeconds] = useState(15 * 60);
  const [running, setRunning] = useState(false);
  const [text, setText] = useState("");
  const idRef = useRef<string | null>(null);
  const save = useApiMutation(
    async (body: string) => {
      if (idRef.current) return call(api.journal[":id"].$patch({ param: { id: idRef.current }, json: { body } }));
      const created = await call(api.journal.$post({ json: { kind: "freewrite", date: todayISO(), title: "Mission free-write", body } }));
      idRef.current = created.id;
      return created;
    },
    { invalidate: false },
  );
  const pending = useAutosave(text, (t) => t.trim() && save.mutate(t), 1500);
  const { data: past = [] } = useQuery(journalQuery({ kind: "freewrite", limit: 5 }));

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => {
    if (seconds === 0) setRunning(false);
  }, [seconds]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <ExerciseSection
      title="Free-write for fifteen minutes"
      measure
      lede="Keep your pen moving until the timer ends. Don't edit. Use the three lenses below as prompts, then shape a rough draft of your mission from what comes out."
      aside={
        <div className="flex items-center gap-2">
          <span className={cn("mr-2 text-3xl font-semibold tabular-nums", seconds === 0 ? "text-primary-ink" : "text-foreground")}>
            {mm}:{ss}
          </span>
          <IconButton
            label={running ? "Pause" : "Start"}
            icon={running ? <Pause /> : <Play />}
            variant="outline"
            size="icon"
            onClick={() => setRunning((r) => !r)}
          />
          <IconButton
            label="New session"
            icon={<RotateCcw />}
            size="icon"
            className="-mr-2"
            onClick={() => {
              setRunning(false);
              setSeconds(15 * 60);
              setText("");
              idRef.current = null;
            }}
          />
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {MISSION_FREEWRITE_LENSES.map((l) => (
          <div key={l.key} className="border-t border-border-subtle pt-3">
            <div className="text-xs font-medium text-muted-foreground">{l.label}</div>
            <p className="mt-1 text-sm text-foreground">{l.prompt}</p>
          </div>
        ))}
      </div>
      <Textarea
        voice="md"
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => !running && seconds === 15 * 60 && setRunning(true)}
        className="mt-6 min-h-60"
        aria-label="Free-write"
        placeholder="Start writing; the timer starts when you do."
      />
      <SaveStatus saving={pending || save.isPending} label={save.isSuccess ? "Saved" : AUTOSAVES} className="mt-2" />
      {past.length > 0 && (
        <details className="group/past mt-6">
          <summary className="-mx-2 inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-colors duration-120 select-none hover:bg-subtle hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden className="size-4 transition-transform duration-180 ease-out group-open/past:rotate-90" />
            Previous sessions <span className="font-normal tabular-nums">({past.length})</span>
          </summary>
          <ul className="mt-4 space-y-5">
            {past.map((p) => (
              <li key={p.id} className="border-l-2 border-border-strong pl-4">
                <div className="text-xs text-muted-foreground tabular-nums">{fmtDate(p.date, "d MMM yyyy")}</div>
                <p className="voice-sm mt-1 line-clamp-4 max-w-[65ch] whitespace-pre-wrap text-foreground">{p.body}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </ExerciseSection>
  );
}

/* ---------------- Reflection questions ---------------- */

function Questions() {
  const { entry, isLoading, save } = useSingletonEntry("mission_q");
  if (isLoading) return <SectionSkeleton height="h-48" />;
  return (
    <QuestionsForm
      initial={(entry?.data as Record<string, string> | null) ?? {}}
      onSave={(d) => save.mutate({ title: "Mission questions", body: MISSION_QUESTIONS.map((q, i) => (d[i] ? `${q}\n${d[i]}` : "")).filter(Boolean).join("\n\n"), data: d })}
      saving={save.isPending}
      saved={save.isSuccess}
    />
  );
}

function QuestionsForm({
  initial,
  onSave,
  saving,
  saved,
}: {
  initial: Record<string, string>;
  onSave: (d: Record<string, string>) => void;
  saving: boolean;
  saved: boolean;
}) {
  const [d, setD] = useState(initial);
  const pending = useAutosave(d, onSave, 1000);
  return (
    <ExerciseSection
      title="Questions for a quiet hour"
      lede="Take these somewhere that inspires you. Answer the ones that pull at you."
      aside={<SaveStatus saving={pending || saving} label={saved ? "Saved" : AUTOSAVES} />}
    >
      {/* Each question spans two rows of a shared grid (subgrid), so the fields line up across columns whatever the question's length. */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2">
        {MISSION_QUESTIONS.map((q, i) => (
          <div key={q} className="grid content-start gap-2 md:row-span-2 md:grid-rows-subgrid">
            <label htmlFor={`mission-q-${i}`} className="voice-sm self-end text-foreground">
              {q}
            </label>
            <Textarea id={`mission-q-${i}`} rows={3} value={d[i] ?? ""} onChange={(e) => setD({ ...d, [i]: e.target.value })} />
          </div>
        ))}
      </div>
    </ExerciseSection>
  );
}

/* ---------------- Collected quotes & ideas ---------------- */

function Resources() {
  const { data = [] } = useQuery(journalQuery({ kind: "resource", limit: 200 }));
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const add = useApiMutation(() => call(api.journal.$post({ json: { kind: "resource", date: todayISO(), body: text.trim(), title: source.trim() || null } })), {
    onSuccess: () => {
      setText("");
      setSource("");
    },
  });
  const remove = useApiMutation((id: string) => call(api.journal[":id"].$delete({ param: { id } })));
  return (
    <ExerciseSection title="Quotes, notes and ideas" lede="Collect what resonates: raw material for your mission.">
      <form
        className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) add.mutate(undefined);
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="A line, a quote, an idea" aria-label="Quote, note or idea" />
        <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source (optional)" aria-label="Source" />
        <Button type="submit" variant="outline" disabled={!text.trim()} pending={add.isPending}>
          <Plus /> Keep
        </Button>
      </form>
      {data.length > 0 && (
        <ul className="mt-8 grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
          {data.map((r) => (
            <li key={r.id} className="group/row flex items-start gap-3 border-l-2 border-border-strong py-1 pl-4">
              <div className="min-w-0 flex-1">
                <p className="voice-sm text-foreground italic">{r.body}</p>
                {r.title && <p className="mt-1 text-xs text-muted-foreground">{r.title}</p>}
              </div>
              <RowActions>
                <IconButton label="Remove" icon={<Trash2 />} size="icon-xs" onClick={() => remove.mutate(r.id)} />
              </RowActions>
            </li>
          ))}
        </ul>
      )}
    </ExerciseSection>
  );
}
