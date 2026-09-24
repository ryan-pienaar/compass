import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, TriangleAlert, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  MISSION_GUIDANCE,
  OPENING_QUESTIONS,
  RECOMMENDED_MAX_ROLES,
  ROLE_COLORS,
  ROLE_SUGGESTIONS,
  SAW_ROLE_COLOR,
} from "@shared/content.ts";
import { RoleDot } from "@/components/badges";
import { BrandMark } from "@/components/brand-mark";
import { AddChip, Chip } from "@/components/chip";
import { IconButton } from "@/components/icon-button";
import { DaySelect, HourSelect } from "@/components/pickers";
import { QuickAdd } from "@/components/quick-add";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api, call } from "@/lib/api";
import { useApiMutation } from "@/lib/mutations";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/welcome")({
  component: Welcome,
});

interface DraftRole {
  name: string;
  color: string;
}

const STEPS = ["Welcome", "Your week", "Your roles", "Two questions", "Your mission"] as const;

function Welcome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [weekStartsOn, setWeekStartsOn] = useState(1);
  const [planningDay, setPlanningDay] = useState(0);
  const [dayStartHour, setDayStartHour] = useState(6);
  const [dayEndHour, setDayEndHour] = useState(22);
  const [roles, setRoles] = useState<DraftRole[]>([
    { name: "Personal growth", color: ROLE_COLORS[0] },
    { name: "Partner", color: ROLE_COLORS[5] },
    { name: "Professional", color: ROLE_COLORS[1] },
  ]);
  const [newRole, setNewRole] = useState("");
  const [personal, setPersonal] = useState("");
  const [personalRole, setPersonalRole] = useState<number | null>(0);
  const [professional, setProfessional] = useState("");
  const [professionalRole, setProfessionalRole] = useState<number | null>(2);
  const [mission, setMission] = useState("");

  const submit = useApiMutation(
    () =>
      call(
        api.onboarding.$post({
          json: {
            displayName: name.trim(),
            weekStartsOn,
            planningDay,
            dayStartHour,
            dayEndHour,
            roles,
            openingPersonal: personal,
            openingPersonalRole: personalRole,
            openingProfessional: professional,
            openingProfessionalRole: professionalRole,
            mission,
          },
        }),
      ),
    {
      invalidate: false,
      onSuccess: async () => {
        await qc.resetQueries();
        const boot = await qc.fetchQuery({ queryKey: ["bootstrap"], queryFn: () => call(api.bootstrap.$get()) });
        await navigate({ to: "/plan/$start", params: { start: boot.weekStart } });
      },
    },
  );

  const addRole = (roleName: string) => {
    const n = roleName.trim();
    if (!n || roles.some((r) => r.name.toLowerCase() === n.toLowerCase())) return;
    setRoles([...roles, { name: n, color: ROLE_COLORS[roles.length % ROLE_COLORS.length] }]);
    setNewRole("");
  };
  const removeRole = (i: number) => {
    setRoles(roles.filter((_, j) => j !== i));
    const fix = (idx: number | null) => (idx == null ? null : idx === i ? null : idx > i ? idx - 1 : idx);
    setPersonalRole(fix(personalRole));
    setProfessionalRole(fix(professionalRole));
  };

  const canNext = step !== 2 || roles.length > 0;
  const last = step === STEPS.length - 1;
  const suggestions = ROLE_SUGGESTIONS.filter((s) => !roles.some((r) => r.name.toLowerCase() === s.toLowerCase()));

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto flex min-h-svh max-w-2xl flex-col px-5 pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <header className="mb-10 flex items-center justify-between gap-4 sm:mb-14">
          <BrandMark size="md" withName className="shrink-0" />
          {/* Below 360px the step name gives way (the list below still names the current step) and the rail narrows, so the brand name stays whole. */}
          <div className="flex flex-col items-end gap-2">
            <p className="text-xs font-medium text-muted-foreground tabular-nums">
              Step {step + 1} of {STEPS.length}
              <span className="max-[359px]:hidden"> · {STEPS[step]}</span>
            </p>
            <ol className="flex gap-1.5" aria-label="Progress">
              {STEPS.map((s, i) => (
                <li key={s} aria-current={i === step ? "step" : undefined} className="h-1 w-8 overflow-hidden rounded-full bg-muted max-[359px]:w-6">
                  <span
                    aria-hidden
                    className={cn(
                      "block h-full origin-left bg-primary transition-[scale] duration-320 ease-out",
                      i <= step ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                  <span className="sr-only">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </header>

        <div className="flex-1">
          {step === 0 && (
            <section className="animate-rise-in space-y-10">
              <div>
                <h1 className="voice-display text-4xl text-foreground sm:text-5xl">Put first things first.</h1>
                <p className="mt-4 max-w-xl text-md text-muted-foreground">
                  Compass is a planner built on the first three habits of{" "}
                  <cite className="text-foreground not-italic">The 7 Habits of Highly Effective People</cite>. It helps you spend more time
                  on what matters but never shouts: Quadrant II.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <HabitCard numeral={1} title="Be proactive">
                  You are responsible: able to choose your response. Focus where you have influence and keep the promises you make.
                </HabitCard>
                <HabitCard numeral={2} title="Begin with the end in mind">
                  Know what matters: a personal mission, the roles you play, and the results you want in each.
                </HabitCard>
                <HabitCard numeral={3} title="Put first things first">
                  Plan the week around your roles and big rocks, then adapt each day, with people ahead of schedules.
                </HabitCard>
              </div>
              <div className="grid max-w-sm gap-2">
                <Label htmlFor="name">What should we call you?</Label>
                <Input id="name" size="lg" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name (optional)" autoFocus />
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="animate-rise-in space-y-8">
              <StepHeading title="Organize weekly, adapt daily">
                A week has natural rhythm: time for work, family, rest and renewal. You&apos;ll plan once a week (about 30 minutes) and take a few
                minutes each morning to adapt.
              </StepHeading>
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <Field id="week-starts" label="My week starts on">
                  <DaySelect id="week-starts" className="w-full" value={weekStartsOn} onChange={setWeekStartsOn} />
                </Field>
                <Field id="planning-day" label="I'll plan my week on">
                  <DaySelect id="planning-day" className="w-full" value={planningDay} onChange={setPlanningDay} />
                </Field>
                <Field id="day-start" label="My day usually starts at">
                  <HourSelect id="day-start" className="w-full" value={dayStartHour} onChange={setDayStartHour} min={0} max={12} />
                </Field>
                <Field id="day-end" label="…and winds down at">
                  <HourSelect id="day-end" className="w-full" value={dayEndHour} onChange={setDayEndHour} min={16} max={24} />
                </Field>
              </div>
              <p className="max-w-[60ch] text-sm text-muted-foreground">
                These hours are your calendar&apos;s range, and the time Compass uses to warn you if you plan too much.
              </p>
            </section>
          )}

          {step === 2 && (
            <section className="animate-rise-in space-y-6">
              <StepHeading title="The roles you play">
                Effectiveness needs balance. Name the areas of life where you carry responsibility: family, work, community, yourself. You
                don&apos;t need to get this perfect. About seven or fewer keeps a week manageable.
              </StepHeading>
              <Card variant="flush" render={<ul />} className="divide-y divide-border-subtle">
                {roles.map((r, i) => (
                  <li key={i} className="flex items-center gap-3 py-2 pr-2 pl-4">
                    <ColorSwatch color={r.color} onChange={(color) => setRoles(roles.map((x, j) => (j === i ? { ...x, color } : x)))} />
                    <Input
                      variant="ghost"
                      value={r.name}
                      onChange={(e) => setRoles(roles.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                      className="flex-1"
                      aria-label="Role name"
                    />
                    <IconButton label={`Remove ${r.name}`} icon={<X />} onClick={() => removeRole(i)} />
                  </li>
                ))}
                <li className="flex items-center gap-3 py-3 pr-4 pl-4 text-sm text-muted-foreground">
                  <span className="grid size-4 shrink-0 place-items-center">
                    <RoleDot color={SAW_ROLE_COLOR} />
                  </span>
                  <span className="min-w-0 flex-1">Sharpen the Saw (renewal) is added automatically.</span>
                  <Chip>Always on</Chip>
                </li>
              </Card>
              {roles.length > RECOMMENDED_MAX_ROLES && (
                <p className="flex items-start gap-1.5 text-sm text-warning">
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                  That&apos;s a lot of roles. Consider combining a few so each week stays balanced.
                </p>
              )}
              <QuickAdd
                value={newRole}
                onValueChange={setNewRole}
                onSubmit={() => addRole(newRole)}
                placeholder="Add a role, e.g. Mentor"
                aria-label="Add a role"
              />
              {suggestions.length > 0 && (
                <div role="group" aria-label="Suggested roles" className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <AddChip key={s} onClick={() => addRole(s)}>
                      {s}
                    </AddChip>
                  ))}
                </div>
              )}
            </section>
          )}

          {step === 3 && (
            <section className="animate-rise-in space-y-10">
              <StepHeading title="Two questions worth answering">
                Take a moment. Your answers are probably important but not urgent (Quadrant II), which is exactly why they don&apos;t get done.
                They&apos;ll become your first long-term goals.
              </StepHeading>
              <OpeningQuestion
                id="opening-personal"
                question={OPENING_QUESTIONS.personal}
                value={personal}
                onChange={setPersonal}
                roles={roles}
                roleIndex={personalRole}
                onRole={setPersonalRole}
                roleLabel="Role for your personal goal"
                placeholder="e.g. Exercise three mornings a week"
              />
              <OpeningQuestion
                id="opening-professional"
                question={OPENING_QUESTIONS.professional}
                value={professional}
                onChange={setProfessional}
                roles={roles}
                roleIndex={professionalRole}
                onRole={setProfessionalRole}
                roleLabel="Role for your work goal"
                placeholder="e.g. Weekly one-on-ones with each person on my team"
              />
            </section>
          )}

          {step === 4 && (
            <section className="animate-rise-in space-y-6">
              <StepHeading title="Begin with the end in mind">
                A personal mission statement is your constitution, the standard you measure everything else against. It takes weeks to get right,
                so start rough. You can also skip this and use the guided exercises in Compass later.
              </StepHeading>
              <ul className="max-w-[65ch] list-disc space-y-1.5 pl-4 text-sm text-muted-foreground marker:text-faint-foreground">
                {MISSION_GUIDANCE.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
              <div className="grid gap-2">
                <Textarea
                  voice="md"
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  rows={9}
                  className="min-h-64"
                  aria-label="Your mission statement"
                  placeholder={"I want to be…\nI want to contribute…\nIn my roles, I…"}
                />
                {/* On a phone the footer has no room for this note, so it sits under the field instead. */}
                {!mission.trim() && <p className="text-xs text-muted-foreground sm:hidden">Optional, you can write it later.</p>}
              </div>
            </section>
          )}
        </div>

        <div className="sticky bottom-0 -mx-5 mt-10 flex items-center justify-between gap-3 border-t border-border-subtle bg-background/90 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            {/* Below 360px "Plan my first week" needs the room, so Back shows only its arrow (the name stays). */}
            <ArrowLeft /> <span className="max-[359px]:sr-only">Back</span>
          </Button>
          <div className="flex items-center gap-3">
            {step === 4 && !mission.trim() && <span className="hidden text-sm text-muted-foreground sm:inline">Optional, you can write it later.</span>}
            {last ? (
              <Button size="xl" onClick={() => submit.mutate(undefined)} disabled={submit.isPending}>
                Plan my first week <ArrowRight />
              </Button>
            ) : (
              <Button size="xl" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                {step === 0 ? "Begin" : "Continue"} <ArrowRight />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HabitCard({ numeral, title, children }: { numeral: 1 | 2 | 3; title: string; children: ReactNode }) {
  return (
    <Card size="sm">
      <div className="flex items-baseline justify-between gap-3">
        <span aria-hidden className="font-serif text-3xl leading-none text-faint-foreground tabular-nums">
          {numeral}
        </span>
        <span className="text-xs font-medium text-muted-foreground">Habit {numeral}</span>
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      </div>
    </Card>
  );
}

function StepHeading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h1 className="voice-display text-3xl text-foreground sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-[60ch] text-md text-muted-foreground">{children}</p>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

/** Cycles the role through the palette. Sits on the card, so the ring gap is card-coloured. */
function ColorSwatch({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const next = () => {
    const i = ROLE_COLORS.indexOf(color);
    onChange(ROLE_COLORS[(i + 1) % ROLE_COLORS.length]);
  };
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={next}
            className="relative size-4 shrink-0 rounded-full ring-2 ring-card ring-offset-1 ring-offset-border-strong after:absolute after:-inset-2 pointer-coarse:after:-inset-3.5"
            style={{ backgroundColor: color }}
            aria-label="Change colour"
          />
        }
      />
      <TooltipContent>Change colour</TooltipContent>
    </Tooltip>
  );
}

function OpeningQuestion({
  id,
  question,
  value,
  onChange,
  roles,
  roleIndex,
  onRole,
  roleLabel,
  placeholder,
}: {
  id: string;
  question: string;
  value: string;
  onChange: (v: string) => void;
  roles: DraftRole[];
  roleIndex: number | null;
  onRole: (i: number | null) => void;
  /** The role picker's accessible name, distinct per question. */
  roleLabel: string;
  placeholder: string;
}) {
  const items = [{ value: "none", label: "No role" }, ...roles.map((r, i) => ({ value: String(i), label: r.name }))];
  return (
    <div className="grid gap-3">
      <label htmlFor={id} className="voice max-w-[60ch] text-foreground">
        {question}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="sm:flex-1" />
        <Select items={items} value={roleIndex == null ? "none" : String(roleIndex)} onValueChange={(v) => onRole(v === "none" || v == null ? null : Number(v))}>
          <SelectTrigger className="sm:w-48" aria-label={roleLabel}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((it) => (
              <SelectItem key={it.value} value={it.value}>
                {it.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
