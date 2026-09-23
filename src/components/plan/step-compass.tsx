import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PrincipleNote } from "@/components/page";
import { RoleDot } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="compass-display text-3xl">Begin with the end in mind</h2>
        <p className="text-muted-foreground">
          Before you schedule anything, take a minute to reconnect with what matters most. Leadership decides what the first
          things are; planning just puts them first.
        </p>
      </div>

      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Your mission</h3>
          {hasMission && (
            <Button variant="ghost" size="sm" render={<Link to="/compass" />}>
              <Pencil /> Refine
            </Button>
          )}
        </div>
        {!mission || !missionFresh ? (
          <Skeleton className="h-24" />
        ) : hasMission ? (
          <div className="compass-text max-h-80 overflow-y-auto whitespace-pre-wrap">{mission.mission.content}</div>
        ) : (
          <MissionStarter />
        )}
      </section>

      {affirmations.filter((a) => a.active).length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Affirmations</h3>
          <ul className="grid gap-2">
            {affirmations
              .filter((a) => a.active)
              .map((a) => (
                <li key={a.id} className="compass-text rounded-xl border-l-4 border-primary/60 bg-card px-4 py-2 italic">
                  {a.text}
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="compass-text !text-lg">What is the most important thing you can do in each role this week?</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {roles.map((r) => {
            const mine = goals.filter((g) => g.roleId === r.id && g.status === "active");
            return (
              <div key={r.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 font-medium">
                  <RoleDot color={r.color} /> {r.name}
                </div>
                {r.description && <p className="compass-text mt-1 !text-sm text-muted-foreground italic">{r.description}</p>}
                {mine.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm">
                    {mine.map((g) => (
                      <li key={g.id}>
                        <span className="font-medium">{g.title}</span>
                        {g.endInMind && <span className="text-muted-foreground"> · {g.endInMind}</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No long-term goal yet.{" "}
                    <Link to="/roles" className="underline">
                      Add one
                    </Link>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <Intention start={board.week.startDate} initial={board.week.intention} />
    </div>
  );
}

function MissionStarter() {
  const [text, setText] = useState("");
  const save = useApiMutation((content: string) => call(api.mission.$put({ json: { content } })), { invalidate: false });
  const pending = useAutosave(text, (t) => t.trim() && save.mutate(t), 900);
  return (
    <div className="space-y-3">
      <PrincipleNote>
        You don&apos;t have a mission statement yet. Write a few honest lines now: who you want to be, what you want to contribute.
        It can be rough; you&apos;ll refine it for weeks. The guided exercises in Compass can help later.
      </PrincipleNote>
      <Textarea
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="compass-text"
        placeholder={"I want to be…\nI want to contribute…"}
      />
      <div className="text-xs text-muted-foreground">{pending ? "Saving…" : text.trim() ? "Saved" : ""}</div>
    </div>
  );
}

function Intention({ start, initial }: { start: string; initial: string }) {
  const [text, setText] = useState(initial);
  const save = useApiMutation((intention: string) => call(api.weeks[":start"].$patch({ param: { start }, json: { intention } })));
  useAutosave(text, (t) => save.mutate(t), 800);
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">An intention for the week (optional)</h3>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Protect the mornings; be fully present at home."
        className="compass-text italic"
      />
    </section>
  );
}
