import { useQuery } from "@tanstack/react-query";
import { Pause, Play, Plus, Quote, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FUNERAL_EXERCISE, MISSION_FREEWRITE_LENSES, MISSION_QUESTIONS } from "@shared/content.ts";
import { todayISO } from "@shared/dates.ts";
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
    <div className="space-y-6">
      <TributeExercise />
      <FreeWrite />
      <Questions />
      <Resources />
    </div>
  );
}

/* ---------------- Tribute (funeral) visualization ---------------- */

type TributeData = Record<string, Record<string, string>>;

function TributeExercise() {
  const { entry, isLoading, save } = useSingletonEntry("tribute");
  if (isLoading) return <Skeleton className="h-64" />;
  return <TributeForm initial={(entry?.data as TributeData | null) ?? {}} onSave={(d) => save.mutate({ title: "Tribute exercise", body: summarize(d), data: d })} />;
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

function TributeForm({ initial, onSave }: { initial: TributeData; onSave: (d: TributeData) => void }) {
  const [d, setD] = useState<TributeData>(initial);
  const pending = useAutosave(d, onSave, 1000);
  const set = (speaker: string, lens: string, value: string) => setD({ ...d, [speaker]: { ...d[speaker], [lens]: value } });
  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-6">
      <div className="mb-4 max-w-3xl space-y-2">
        <h2 className="compass-display text-2xl">The end in mind</h2>
        <p className="compass-text text-muted-foreground">{FUNERAL_EXERCISE.intro}</p>
        <p className="text-sm text-muted-foreground">Take your time. There are no right answers, and this autosaves {pending ? "(saving…)" : ""}.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {FUNERAL_EXERCISE.speakers.map((s) => (
          <div key={s.key} className="space-y-2 rounded-xl bg-muted/40 p-3">
            <div className="text-sm font-semibold">{s.label}</div>
            {FUNERAL_EXERCISE.lenses.map((l) => (
              <div key={l.key} className="grid gap-1">
                <Label className="text-xs text-muted-foreground">
                  {l.label}: {l.prompt}
                </Label>
                <Textarea rows={2} value={d[s.key]?.[l.key] ?? ""} onChange={(e) => set(s.key, l.key, e.target.value)} className="compass-text !text-sm" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="compass-text mt-4 max-w-3xl !text-[0.95rem] text-muted-foreground italic">{FUNERAL_EXERCISE.outro}</p>
    </section>
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
  useAutosave(text, (t) => t.trim() && save.mutate(t), 1500);
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
    <section className="rounded-2xl border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl space-y-1">
          <h2 className="compass-display text-2xl">Free-write for fifteen minutes</h2>
          <p className="text-sm text-muted-foreground">Keep your pen moving until the timer ends. Don&apos;t edit. Use the three lenses below as prompts, then shape a rough draft of your mission from what comes out.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("font-mono text-2xl tabular-nums", seconds === 0 && "text-primary")}>
            {mm}:{ss}
          </span>
          <Button variant="outline" size="icon" onClick={() => setRunning((r) => !r)} aria-label={running ? "Pause" : "Start"}>
            {running ? <Pause /> : <Play />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="New session"
            onClick={() => {
              setRunning(false);
              setSeconds(15 * 60);
              setText("");
              idRef.current = null;
            }}
          >
            <RotateCcw />
          </Button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {MISSION_FREEWRITE_LENSES.map((l) => (
          <div key={l.key} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <div className="text-xs font-semibold text-muted-foreground uppercase">{l.label}</div>
            {l.prompt}
          </div>
        ))}
      </div>
      <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} onFocus={() => !running && seconds === 15 * 60 && setRunning(true)} className="compass-text mt-3" placeholder="Start writing; the timer starts when you do." />
      {past.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">Previous sessions ({past.length})</summary>
          <ul className="mt-2 space-y-2">
            {past.map((p) => (
              <li key={p.id} className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">{fmtDate(p.date, "d MMM yyyy")}</div>
                <div className="compass-text line-clamp-4 !text-sm whitespace-pre-wrap">{p.body}</div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

/* ---------------- Reflection questions ---------------- */

function Questions() {
  const { entry, isLoading, save } = useSingletonEntry("mission_q");
  if (isLoading) return <Skeleton className="h-48" />;
  return <QuestionsForm initial={(entry?.data as Record<string, string> | null) ?? {}} onSave={(d) => save.mutate({ title: "Mission questions", body: MISSION_QUESTIONS.map((q, i) => (d[i] ? `${q}\n${d[i]}` : "")).filter(Boolean).join("\n\n"), data: d })} />;
}

function QuestionsForm({ initial, onSave }: { initial: Record<string, string>; onSave: (d: Record<string, string>) => void }) {
  const [d, setD] = useState(initial);
  const pending = useAutosave(d, onSave, 1000);
  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-6">
      <h2 className="compass-display text-2xl">Questions for a quiet hour</h2>
      <p className="mb-4 text-sm text-muted-foreground">Take these somewhere that inspires you. Answer the ones that pull at you {pending ? "(saving…)" : ""}.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {MISSION_QUESTIONS.map((q, i) => (
          <div key={q} className="grid content-start gap-1.5">
            <Label className="compass-text !text-[0.95rem] leading-snug">{q}</Label>
            <Textarea rows={3} value={d[i] ?? ""} onChange={(e) => setD({ ...d, [i]: e.target.value })} className="!text-sm" />
          </div>
        ))}
      </div>
    </section>
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
    <section className="rounded-2xl border bg-card p-4 sm:p-6">
      <h2 className="compass-display text-2xl">Quotes, notes and ideas</h2>
      <p className="mb-3 text-sm text-muted-foreground">Collect what resonates: raw material for your mission.</p>
      <form
        className="grid gap-2 sm:grid-cols-[1fr_12rem_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) add.mutate(undefined);
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="A line, a quote, an idea" />
        <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source (optional)" />
        <Button type="submit" variant="outline" disabled={!text.trim()}>
          <Plus /> Keep
        </Button>
      </form>
      <ul className="mt-3 grid gap-2 md:grid-cols-2">
        {data.map((r) => (
          <li key={r.id} className="group flex gap-2 rounded-lg bg-muted/40 p-3">
            <Quote className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="compass-text !text-[0.95rem]">{r.body}</div>
              {r.title && <div className="text-xs text-muted-foreground">{r.title}</div>}
            </div>
            <Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100" onClick={() => remove.mutate(r.id)} aria-label="Remove">
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
