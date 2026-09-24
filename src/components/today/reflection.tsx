import { Link } from "@tanstack/react-router";
import { Moon, Sprout } from "lucide-react";
import { useId, useState } from "react";
import { LanguageHint } from "@/components/language-hint";
import { SectionHeader } from "@/components/page";
import { SaveStatus } from "@/components/save-status";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card render={<section />}>
      <CardHeader className="items-center">
        <CardTitle as="h2" className="flex items-center gap-2">
          <Moon aria-hidden className="size-4 text-muted-foreground" /> Evening reflection
        </CardTitle>
        <CardAction>
          <SaveStatus saving={pending} label={save.isSuccess ? "Saved to your journal" : "Optional · 3 minutes"} />
        </CardAction>
      </CardHeader>
      {/* Each prompt spans three shared rows (label, field, hint), so the fields line up however the labels wrap. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
    </Card>
  );
}

function Prompt({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="grid min-w-0 content-start gap-2 lg:row-span-3 lg:grid-rows-subgrid">
      <Label size="sm" htmlFor={id} className="self-end">
        {label}
      </Label>
      <Textarea id={id} rows={3} voice="sm" value={value} onChange={(e) => onChange(e.target.value)} />
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
  const commitmentId = useId();
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
    <Card size="sm" render={<section />}>
      <SectionHeader
        className="mb-0"
        icon={<Sprout />}
        title={
          <>
            30-day proactivity test <span className="font-normal text-muted-foreground tabular-nums">· day {challenge.dayNumber}</span>
          </>
        }
        action={
          <Button variant="link" size="inline" className="text-xs" render={<Link to="/influence" search={{ tab: "challenge" }} />}>
            See all days
          </Button>
        }
      />
      <div className="grid max-w-xl gap-2">
        <Label size="sm" htmlFor={commitmentId}>
          One small commitment for today
        </Label>
        <Input id={commitmentId} value={commitment} onChange={(e) => setCommitment(e.target.value)} placeholder="e.g. No complaining in the team channel" />
      </div>
      <div className="grid grid-cols-1 gap-x-10 gap-y-1 lg:grid-cols-2">
        {questions.map((q) => (
          <div key={q.key} className="flex min-h-10 items-center justify-between gap-3 text-sm">
            <span className="min-w-0">{q.label}</span>
            <Segmented<Tri>
              size="sm"
              aria-label={q.label}
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
    </Card>
  );
}
