import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Compass, Mountain, Plus, Sprout, Target, X } from "lucide-react";
import { useState } from "react";
import { MISSION_GUIDANCE, OPENING_QUESTIONS, RECOMMENDED_MAX_ROLES, ROLE_COLORS, ROLE_SUGGESTIONS } from "@shared/content.ts";
import { WEEKDAY_NAMES } from "@shared/settings.ts";
import { RoleDot } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto flex min-h-svh max-w-3xl flex-col px-5 py-8 sm:py-12">
        <div className="mb-10 flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-4.5" />
          </div>
          <span className="font-semibold">Compass</span>
          <ol className="ml-auto flex items-center gap-1.5" aria-label="Progress">
            {STEPS.map((s, i) => (
              <li
                key={s}
                aria-current={i === step ? "step" : undefined}
                className={cn("h-1.5 w-6 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")}
                title={s}
              />
            ))}
          </ol>
        </div>

        <div className="flex-1">
          {step === 0 && (
            <section className="space-y-8">
              <div className="space-y-3">
                <h1 className="compass-display text-4xl sm:text-5xl">Put first things first.</h1>
                <p className="max-w-xl text-lg text-muted-foreground">
                  Compass is a planner built on the first three habits of <em>The 7 Habits of Highly Effective People</em>. It
                  helps you spend more time on what matters but never shouts: Quadrant II.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <PrincipleCard icon={<Sprout />} title="Be proactive" habit="Habit 1">
                  You are responsible: able to choose your response. Focus where you have influence and keep the promises you
                  make.
                </PrincipleCard>
                <PrincipleCard icon={<Target />} title="Begin with the end in mind" habit="Habit 2">
                  Know what matters: a personal mission, the roles you play, and the results you want in each.
                </PrincipleCard>
                <PrincipleCard icon={<Mountain />} title="Put first things first" habit="Habit 3">
                  Plan the week around your roles and big rocks, then adapt each day, with people ahead of schedules.
                </PrincipleCard>
              </div>
              <div className="grid max-w-sm gap-2">
                <Label htmlFor="name">What should we call you?</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name (optional)" autoFocus />
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-8">
              <StepHeading title="Organize weekly, adapt daily">
                A week has natural rhythm: time for work, family, rest and renewal. You&apos;ll plan once a week (about 30
                minutes) and take a few minutes each morning to adapt.
              </StepHeading>
              <div className="grid gap-5 sm:grid-cols-2">
                <DaySelect label="My week starts on" value={weekStartsOn} onChange={setWeekStartsOn} />
                <DaySelect label="I'll plan my week on" value={planningDay} onChange={setPlanningDay} />
                <HourSelect label="My day usually starts at" value={dayStartHour} onChange={setDayStartHour} min={0} max={12} />
                <HourSelect label="…and winds down at" value={dayEndHour} onChange={setDayEndHour} min={16} max={24} />
              </div>
              <p className="text-sm text-muted-foreground">
                These hours are your calendar&apos;s range, and the time Compass uses to warn you if you plan too much.
              </p>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <StepHeading title="The roles you play">
                Effectiveness needs balance. Name the areas of life where you carry responsibility: family, work, community,
                yourself. You don&apos;t need to get this perfect. About seven or fewer keeps a week manageable.
              </StepHeading>
              <ul className="grid gap-2">
                {roles.map((r, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
                    <ColorSwatch
                      color={r.color}
                      onChange={(color) => setRoles(roles.map((x, j) => (j === i ? { ...x, color } : x)))}
                    />
                    <Input
                      value={r.name}
                      onChange={(e) => setRoles(roles.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                      className="h-8 border-none bg-transparent px-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
                      aria-label="Role name"
                    />
                    <Button variant="ghost" size="icon-sm" onClick={() => removeRole(i)} aria-label={`Remove ${r.name}`}>
                      <X />
                    </Button>
                  </li>
                ))}
                <li className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                  <RoleDot color="#0f766e" /> Sharpen the Saw (renewal) is added automatically.
                </li>
              </ul>
              {roles.length > RECOMMENDED_MAX_ROLES && (
                <p className="text-sm text-warning">That&apos;s a lot of roles. Consider combining a few so each week stays balanced.</p>
              )}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addRole(newRole);
                }}
              >
                <Input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="Add a role, e.g. Mentor" />
                <Button type="submit" variant="outline" disabled={!newRole.trim()}>
                  <Plus /> Add
                </Button>
              </form>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_SUGGESTIONS.filter((s) => !roles.some((r) => r.name.toLowerCase() === s.toLowerCase())).map((s) => (
                  <button key={s} type="button" onClick={() => addRole(s)} className="rounded-full border px-3 py-1 text-sm hover:bg-muted">
                    + {s}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-8">
              <StepHeading title="Two questions worth answering">
                Take a moment. Your answers are probably important but not urgent (Quadrant II), which is exactly why they
                don&apos;t get done. They&apos;ll become your first long-term goals.
              </StepHeading>
              <OpeningQuestion
                question={OPENING_QUESTIONS.personal}
                value={personal}
                onChange={setPersonal}
                roles={roles}
                roleIndex={personalRole}
                onRole={setPersonalRole}
                placeholder="e.g. Exercise three mornings a week"
              />
              <OpeningQuestion
                question={OPENING_QUESTIONS.professional}
                value={professional}
                onChange={setProfessional}
                roles={roles}
                roleIndex={professionalRole}
                onRole={setProfessionalRole}
                placeholder="e.g. Weekly one-on-ones with each person on my team"
              />
            </section>
          )}

          {step === 4 && (
            <section className="space-y-6">
              <StepHeading title="Begin with the end in mind">
                A personal mission statement is your constitution, the standard you measure everything else against. It
                takes weeks to get right, so start rough. You can also skip this and use the guided exercises in Compass later.
              </StepHeading>
              <ul className="grid gap-1 text-sm text-muted-foreground">
                {MISSION_GUIDANCE.map((g) => (
                  <li key={g}>· {g}</li>
                ))}
              </ul>
              <Textarea
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                rows={9}
                className="compass-text bg-card"
                placeholder={"I want to be…\nI want to contribute…\nIn my roles, I…"}
              />
            </section>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between border-t pt-5">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft /> Back
          </Button>
          <div className="flex items-center gap-2">
            {step === 4 && !mission.trim() && <span className="text-sm text-muted-foreground">Optional, you can write it later.</span>}
            {last ? (
              <Button size="lg" onClick={() => submit.mutate(undefined)} disabled={submit.isPending}>
                Plan my first week <ArrowRight />
              </Button>
            ) : (
              <Button size="lg" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                {step === 0 ? "Begin" : "Continue"} <ArrowRight />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PrincipleCard({ icon, title, habit, children }: { icon: React.ReactNode; title: string; habit: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between text-primary [&_svg]:size-5">
        {icon}
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{habit}</span>
      </div>
      <div className="font-semibold">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function StepHeading({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h1 className="compass-display text-3xl sm:text-4xl">{title}</h1>
      <p className="max-w-2xl text-muted-foreground">{children}</p>
    </div>
  );
}

function DaySelect({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const items = WEEKDAY_NAMES.map((d, i) => ({ value: String(i), label: d }));
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select items={items} value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((d) => (
            <SelectItem key={d.value} value={d.value}>
              {d.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function HourSelect({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  const items = Array.from({ length: max - min + 1 }, (_, i) => min + i).map((h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}:00` }));
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select items={items} value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((h) => (
            <SelectItem key={h.value} value={h.value}>
              {h.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ColorSwatch({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const next = () => {
    const i = ROLE_COLORS.indexOf(color);
    onChange(ROLE_COLORS[(i + 1) % ROLE_COLORS.length]);
  };
  return (
    <button
      type="button"
      onClick={next}
      className="size-5 shrink-0 rounded-full ring-2 ring-background ring-offset-1 ring-offset-border"
      style={{ backgroundColor: color }}
      aria-label="Change colour"
      title="Change colour"
    />
  );
}

function OpeningQuestion({
  question,
  value,
  onChange,
  roles,
  roleIndex,
  onRole,
  placeholder,
}: {
  question: string;
  value: string;
  onChange: (v: string) => void;
  roles: DraftRole[];
  roleIndex: number | null;
  onRole: (i: number | null) => void;
  placeholder: string;
}) {
  const items = [{ value: "none", label: "No role" }, ...roles.map((r, i) => ({ value: String(i), label: r.name }))];
  return (
    <div className="grid gap-3">
      <p className="compass-text text-lg">{question}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1" />
        <Select items={items} value={roleIndex == null ? "none" : String(roleIndex)} onValueChange={(v) => onRole(v === "none" || v == null ? null : Number(v))}>
          <SelectTrigger className="sm:w-48">
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
