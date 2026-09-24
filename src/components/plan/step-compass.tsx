import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { PrincipleNote, SectionHeader, StepHeader } from "@/components/page";
import { RoleDot } from "@/components/badges";
import { SaveStatus } from "@/components/save-status";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, call, type WeekBoard } from "@/lib/api";
import { useAutosave } from "@/lib/hooks";
import { useApiMutation } from "@/lib/mutations";
import { affirmationsQuery, goalsQuery, missionQuery } from "@/lib/queries";

/** Leadership before management: reconnect with the end in mind before scheduling anything. */
export function StepCompass({ board }: { board: WeekBoard }) {
  const { data: mission, isFetchedAfterMount: missionFresh } = useQuery(missionQuery());
  const { data: affirmations = [] } = useQuery(affirmationsQuery());
  const { data: goals = [] } = useQuery(goalsQuery());
  const markReviewed = useApiMutation(() => call(api.mission.review.$post()), { invalidate: false });
  const marked = useRef(false);
  const hasMission = !!mission?.mission.content.trim();

  // Reading the mission during weekly planning counts as reviewing it.
  useEffect(() => {
    if (hasMission && !marked.current) {
      marked.current = true;
      markReviewed.mutate(undefined);
    }
  }, [hasMission, markReviewed]);

  const roles = board.roles.filter((r) => board.weekRoleIds.includes(r.id) && !r.isSaw);
  const activeAffirmations = affirmations.filter((a) => a.active);

  return (
    <div>
      <StepHeader
        title="Begin with the end in mind"
        lede={
          <>
            Before you schedule anything, take a minute to reconnect with what matters most. Leadership decides what the first
            things are; planning just puts them first.
          </>
        }
      />

      <div className="space-y-10">
        <Card render={<section />}>
          <CardHeader className="items-center">
            <CardTitle as="h3">Your mission</CardTitle>
            {hasMission && (
              <CardAction>
                <Button variant="ghost" size="sm" className="-my-1 -mr-2" render={<Link to="/compass" />}>
                  <Pencil /> Refine
                </Button>
              </CardAction>
            )}
          </CardHeader>
          {!mission || !missionFresh ? (
            <div className="space-y-2.5" aria-hidden>
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : hasMission ? (
            <div className="voice max-h-80 overflow-y-auto overscroll-contain whitespace-pre-wrap text-foreground scroll-fade-y">{mission.mission.content}</div>
          ) : (
            <MissionStarter />
          )}
        </Card>

        {activeAffirmations.length > 0 && (
          <section>
            <SectionHeader as="h3" title="Affirmations" />
            <ul className="space-y-4">
              {activeAffirmations.map((a) => (
                <li key={a.id} className="max-w-[65ch] border-l-2 border-border-strong pl-4 voice text-foreground italic">
                  {a.text}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="mb-6 voice text-foreground">What is the most important thing you can do in each role this week?</h3>
          <ul className="grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2">
            {roles.map((r) => {
              const mine = goals.filter((g) => g.roleId === r.id && g.status === "active");
              return (
                <li key={r.id} className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <RoleDot color={r.color} /> {r.name}
                  </div>
                  {r.description && <p className="mt-1 voice-sm text-muted-foreground italic">{r.description}</p>}
                  {mine.length > 0 ? (
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {mine.map((g) => (
                        <li key={g.id} className="text-foreground">
                          <span className="font-medium">{g.title}</span>
                          {g.endInMind && <span className="text-muted-foreground"> · {g.endInMind}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No long-term goal yet.{" "}
                      <Button variant="link" size="inline" render={<Link to="/roles" />}>
                        Add one
                      </Button>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <Intention start={board.week.startDate} initial={board.week.intention} />
      </div>
    </div>
  );
}

function MissionStarter() {
  const [text, setText] = useState("");
  const save = useApiMutation((content: string) => call(api.mission.$put({ json: { content } })), { invalidate: false });
  const pending = useAutosave(text, (t) => t.trim() && save.mutate(t), 900);
  return (
    <div className="space-y-4">
      <PrincipleNote>
        You don&apos;t have a mission statement yet. Write a few honest lines now: who you want to be, what you want to contribute.
        It can be rough; you&apos;ll refine it for weeks. The guided exercises in Compass can help later.
      </PrincipleNote>
      <Textarea
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        voice="md"
        aria-label="Your mission"
        placeholder={"I want to be…\nI want to contribute…"}
      />
      {(pending || !!text.trim()) && <SaveStatus saving={pending} />}
    </div>
  );
}

function Intention({ start, initial }: { start: string; initial: string }) {
  const id = useId();
  const [text, setText] = useState(initial);
  const save = useApiMutation((intention: string) => call(api.weeks[":start"].$patch({ param: { start }, json: { intention } })));
  const pending = useAutosave(text, (t) => save.mutate(t), 800);
  return (
    <section>
      <div className="mb-1 flex min-h-8 items-center justify-between gap-3">
        {/* A section heading like the others on this step, whose text is also the field's label. */}
        <h3 className="min-w-0">
          <Label htmlFor={id} className="text-base font-semibold">
            An intention for the week <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
        </h3>
        <SaveStatus saving={pending} />
      </div>
      <Input
        id={id}
        variant="ghost"
        voice="md"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Protect the mornings; be fully present at home."
        className="italic"
      />
    </section>
  );
}
