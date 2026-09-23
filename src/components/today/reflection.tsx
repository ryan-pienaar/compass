import { Link } from "@tanstack/react-router";
import { Moon, Sprout } from "lucide-react";
import { useState } from "react";
import { LanguageHint } from "@/components/language-hint";
import { Segmented } from "@/components/segmented";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, call, type ChallengeDay, type JournalEntry } from "@/lib/api";
import { useAutosave } from "@/lib/hooks";
import { useApiMutation } from "@/lib/mutations";

interface ReflectionData {
  wentWell: string;
  reactive: string;
  mistake: string;
}

/** A few minutes at the end of the day: self-awareness is where proactivity starts. */
export function EveningReflection({ date, entry }: { date: string; entry: JournalEntry | null }) {
  const initial = (entry?.data as Partial<ReflectionData> | null) ?? {};
  const [d, setD] = useState<ReflectionData>({
    wentWell: initial.wentWell ?? "",
    reactive: initial.reactive ?? "",
    mistake: initial.mistake ?? "",
  });
  const save = useApiMutation(
    (v: ReflectionData) => {
      const body = [
        v.wentWell && `Went well: ${v.wentWell}`,
        v.reactive && `Reactive moment: ${v.reactive}`,
        v.mistake && `Acknowledge · correct · learn: ${v.mistake}`,
      ]
        .filter(Boolean)
        .join("\n");
      return call(api.journal.daily[":date"].$put({ param: { date }, json: { body, data: { ...v } } }));
    },
    { invalidate: false },
  );
  const pending = useAutosave(d, (v) => save.mutate(v), 900);

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Moon className="size-4 text-primary" /> Evening reflection
        </h2>
        <span className="text-xs text-muted-foreground">{pending ? "Saving…" : save.isSuccess ? "Saved to your journal" : "Optional · 3 minutes"}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Prompt label="What went well?" value={d.wentWell} onChange={(wentWell) => setD({ ...d, wentWell })} />
        <Prompt
          label="Where was I reactive? What will I choose next time?"
          value={d.reactive}
          onChange={(reactive) => setD({ ...d, reactive })}
        />
        <Prompt
          label="Any mistake to acknowledge, correct and learn from?"
          value={d.mistake}
          onChange={(mistake) => setD({ ...d, mistake })}
        />
      </div>
    </section>
  );
}

function Prompt({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid content-start gap-1.5">
      <Label className="text-xs leading-snug text-muted-foreground">{label}</Label>
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="compass-text !text-sm" />
      <LanguageHint text={value} onChange={onChange} />
    </div>
  );
}

type Tri = "yes" | "no" | "unset";
const toTri = (v: boolean | null | undefined): Tri => (v == null ? "unset" : v ? "yes" : "no");
const fromTri = (v: Tri) => (v === "unset" ? null : v === "yes");

/** Day N of the 30-day proactivity test: one small commitment, kept or not. */
export function ChallengeCheckin({
  challenge,
  date,
}: {
  challenge: { id: string; dayNumber: number; today: ChallengeDay | null };
  date: string;
}) {
  const day = challenge.today;
  const [commitment, setCommitment] = useState(day?.commitment ?? "");
  const save = useApiMutation(
    (patch: Partial<Pick<ChallengeDay, "commitment" | "kept" | "inInfluence" | "proactiveLanguage" | "ownedMistakes">>) =>
      call(api.challenge[":id"].days[":date"].$put({ param: { id: challenge.id, date }, json: patch })),
  );
  useAutosave(commitment, (c) => save.mutate({ commitment: c }), 900);
  if (challenge.dayNumber > 30 || challenge.dayNumber < 1) return null;

  const questions: { key: "kept" | "inInfluence" | "proactiveLanguage" | "ownedMistakes"; label: string }[] = [
    { key: "kept", label: "Kept my commitment" },
    { key: "inInfluence", label: "Worked in my Circle of Influence" },
    { key: "proactiveLanguage", label: "Used proactive language" },
    { key: "ownedMistakes", label: "Owned my mistakes quickly" },
  ];

  return (
    <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Sprout className="size-4 text-primary" /> 30-day proactivity test · day {challenge.dayNumber}
        </h2>
        <Link to="/influence" search={{ tab: "challenge" }} className="text-xs text-muted-foreground underline">
          See all days
        </Link>
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">One small commitment for today</Label>
        <Input value={commitment} onChange={(e) => setCommitment(e.target.value)} placeholder="e.g. No complaining in the team channel" />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {questions.map((q) => (
          <div key={q.key} className="flex items-center justify-between gap-2 text-sm">
            <span>{q.label}</span>
            <Segmented<Tri>
              size="sm"
              value={toTri(day?.[q.key])}
              onChange={(v) => save.mutate({ [q.key]: fromTri(v) })}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
