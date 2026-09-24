import { useQuery } from "@tanstack/react-query";
import { Circle, CircleCheck, Eye, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { checkAffirmation } from "@shared/affirmation.ts";
import { RoleBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { IconButton } from "@/components/icon-button";
import { PrincipleNote, RailSection, SectionHeader, WithRail } from "@/components/page";
import { RoleSelect } from "@/components/pickers";
import { RowActions, RowMeta } from "@/components/row";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api, call, type Affirmation } from "@/lib/api";
import { useRolesMap } from "@/lib/hooks";
import { useApiMutation } from "@/lib/mutations";
import { affirmationsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function AffirmationsTab() {
  const { data: list = [], isPending: listLoading } = useQuery(affirmationsQuery());
  const roles = useRolesMap();
  const [text, setText] = useState("");
  const [visual, setVisual] = useState(false);
  const [roleId, setRoleId] = useState<string | null>(null);
  const checks = checkAffirmation(text, visual);
  const score = checks.filter((c) => c.ok).length;
  const id = useId();

  const add = useApiMutation(() => call(api.affirmations.$post({ json: { text: text.trim(), roleId, visualConfirmed: visual } })), {
    success: "Affirmation saved. It will appear on Today.",
    onSuccess: () => {
      setText("");
      setVisual(false);
    },
  });

  const missing = text.trim() ? checks.filter((c) => !c.ok) : [];

  const rail = (
    <>
      <PrincipleNote icon={<Eye />}>
        A few minutes each day: relax, then picture the situation in rich detail (where you are, who is there, what they do)
        and see yourself responding exactly as your affirmation describes. Visualize the right thing; you tend to produce what
        you rehearse.
      </PrincipleNote>
      <RailSection title="Five ingredients">
        <ul className="list-disc space-y-1.5 pl-4 text-muted-foreground marker:text-faint-foreground">
          <li>
            <span className="text-foreground">Personal:</span> about you
          </li>
          <li>
            <span className="text-foreground">Positive:</span> what you do, not what you avoid
          </li>
          <li>
            <span className="text-foreground">Present tense:</span> as if already true
          </li>
          <li>
            <span className="text-foreground">Visual:</span> a scene you can picture
          </li>
          <li>
            <span className="text-foreground">Emotional:</span> how it feels
          </li>
        </ul>
      </RailSection>
    </>
  );

  return (
    <WithRail rail={rail}>
      <div className="space-y-10">
        <Card>
          <CardHeader>
            <div className="min-w-0 space-y-1">
              <CardTitle as="h2" id={`${id}-title`}>
                Write an affirmation
              </CardTitle>
              <CardDescription className="max-w-[60ch] text-sm">
                Pick one place where your behavior doesn&apos;t yet match your values. Write the new script as if it&apos;s already
                true, then picture it.
              </CardDescription>
            </div>
          </CardHeader>
          <Textarea
            voice="md"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-labelledby={`${id}-title`}
            placeholder="It is deeply satisfying that I respond with patience and warmth when the kids test me at bedtime."
          />
          <div className="space-y-2">
            <ul aria-label="Five ingredients" className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              {checks.map((c) => (
                <li key={c.key}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className={cn("inline-flex items-center gap-1.5 font-medium", c.ok ? "text-foreground" : "text-muted-foreground")} />
                      }
                    >
                      {c.ok ? <CircleCheck aria-hidden className="size-4 text-success" /> : <Circle aria-hidden className="size-4 text-faint-foreground" />}
                      {c.label}
                      <span className="sr-only">{c.ok ? ": present" : `: missing. ${c.hint}`}</span>
                    </TooltipTrigger>
                    <TooltipContent>{c.hint}</TooltipContent>
                  </Tooltip>
                </li>
              ))}
            </ul>
            {missing.length > 0 && (
              <ul aria-hidden className="space-y-0.5 text-xs text-muted-foreground">
                {missing.map((c) => (
                  <li key={c.key}>
                    <span className="font-medium text-foreground">{c.label}:</span> {c.hint}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <CardFooter className="flex-wrap gap-x-4 gap-y-3">
            <label className="flex items-center gap-2.5 text-sm">
              <Checkbox checked={visual} onCheckedChange={(v) => setVisual(v === true)} /> I can clearly picture this scene
            </label>
            <Label htmlFor={`${id}-role`} className="sr-only">
              Role
            </Label>
            <RoleSelect id={`${id}-role`} value={roleId} onChange={setRoleId} placeholder="Any role" size="sm" />
            <Button className="ml-auto" disabled={!text.trim() || add.isPending} pending={add.isPending} onClick={() => add.mutate(undefined)}>
              Save ({score}/5)
            </Button>
          </CardFooter>
        </Card>

        <section>
          <SectionHeader title="Your affirmations" count={list.length > 0 ? list.length : undefined} />
          {listLoading ? (
            <div className="space-y-6">
              {[0, 1].map((i) => (
                <div key={i} className="space-y-2 border-l-2 border-border-subtle py-1 pl-4">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : list.length === 0 ? (
            <EmptyState size="compact" className="px-0" title="None yet. Active affirmations rotate on your Today page." />
          ) : (
            <ul className="space-y-6">
              {list.map((a) => (
                <AffirmationItem key={a.id} a={a} role={a.roleId ? roles.get(a.roleId) : undefined} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </WithRail>
  );
}

/**
 * A meta fact with its own leading separator (a centred "·" that screen readers skip). A fact long
 * enough to wrap sits alone on its line, so a hanging indent brings its later lines back inside
 * the clip edge; the separator keeps its own zero indent.
 */
const metaFact =
  "pl-4 -indent-4 before:inline-block before:w-4 before:indent-0 before:text-center before:text-faint-foreground before:content-['·'_/_'']";

function AffirmationItem({ a, role }: { a: Affirmation; role: Parameters<typeof RoleBadge>[0]["role"] }) {
  const update = useApiMutation((patch: { active?: boolean; text?: string }) => call(api.affirmations[":id"].$patch({ param: { id: a.id }, json: patch })));
  const remove = useApiMutation(() => call(api.affirmations[":id"].$delete({ param: { id: a.id } })), { success: "Removed" });
  const ingredients = checkAffirmation(a.text, a.visualConfirmed).filter((c) => c.ok).length;
  return (
    <li className="group/row flex flex-col gap-2 border-l-2 border-border-strong py-1 pl-4 sm:flex-row sm:items-start sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className={cn("voice max-w-[65ch] italic", a.active ? "text-foreground" : "text-muted-foreground")}>{a.text}</p>
        {/* Each fact after the first carries its own "·"; one that starts a wrapped line is clipped off the left edge. */}
        <div className="mt-1.5 overflow-hidden">
          <RowMeta className="-ml-4 mt-0 gap-x-0">
            {role && <RoleBadge role={role} muted className="ml-4" />}
            <span className={role ? metaFact : "ml-4"}>{ingredients}/5 ingredients</span>
            {!a.active && <span className={metaFact}>Inactive</span>}
          </RowMeta>
        </div>
      </div>
      <RowActions className="gap-2 max-sm:-ml-0.5">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={a.active} onCheckedChange={(active) => update.mutate({ active })} /> Active
        </label>
        <IconButton label="Delete affirmation" icon={<Trash2 />} onClick={() => remove.mutate(undefined)} />
      </RowActions>
    </li>
  );
}
