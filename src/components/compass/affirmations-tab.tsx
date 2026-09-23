import { useQuery } from "@tanstack/react-query";
import { Check, Circle, Eye, Trash2 } from "lucide-react";
import { useState } from "react";
import { checkAffirmation } from "@shared/affirmation.ts";
import { PrincipleNote } from "@/components/page";
import { RoleBadge } from "@/components/badges";
import { RoleSelect } from "@/components/pickers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api, call, type Affirmation } from "@/lib/api";
import { useRolesMap } from "@/lib/hooks";
import { useApiMutation } from "@/lib/mutations";
import { affirmationsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function AffirmationsTab() {
  const { data: list = [] } = useQuery(affirmationsQuery());
  const roles = useRolesMap();
  const [text, setText] = useState("");
  const [visual, setVisual] = useState(false);
  const [roleId, setRoleId] = useState<string | null>(null);
  const checks = checkAffirmation(text, visual);
  const score = checks.filter((c) => c.ok).length;

  const add = useApiMutation(() => call(api.affirmations.$post({ json: { text: text.trim(), roleId, visualConfirmed: visual } })), {
    success: "Affirmation saved. It will appear on Today.",
    onSuccess: () => {
      setText("");
      setVisual(false);
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-6">
        <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
          <h2 className="font-semibold">Write an affirmation</h2>
          <p className="text-sm text-muted-foreground">
            Pick one place where your behavior doesn&apos;t yet match your values. Write the new script as if it&apos;s already
            true, then picture it.
          </p>
          <Textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="compass-text"
            placeholder="It is deeply satisfying that I respond with patience and warmth when the kids test me at bedtime."
          />
          <ul className="grid gap-1.5 sm:grid-cols-5">
            {checks.map((c) => (
              <li
                key={c.key}
                className={cn("rounded-lg border px-2.5 py-2 text-xs", c.ok ? "border-primary/40 bg-primary/5" : "border-dashed")}
                title={c.hint}
              >
                <div className="flex items-center gap-1 font-medium">
                  {c.ok ? <Check className="size-3.5 text-primary" /> : <Circle className="size-3 text-muted-foreground" />}
                  {c.label}
                </div>
                {!c.ok && text.trim() && <div className="mt-0.5 text-muted-foreground">{c.hint}</div>}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={visual} onCheckedChange={(v) => setVisual(v === true)} /> I can clearly picture this scene
            </label>
            <RoleSelect value={roleId} onChange={setRoleId} placeholder="Any role" size="sm" />
            <Button className="ml-auto" disabled={!text.trim() || add.isPending} onClick={() => add.mutate(undefined)}>
              Save ({score}/5)
            </Button>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Your affirmations</h2>
          {list.length === 0 && <p className="text-sm text-muted-foreground">None yet. Active affirmations rotate on your Today page.</p>}
          <ul className="space-y-2">
            {list.map((a) => (
              <AffirmationItem key={a.id} a={a} role={a.roleId ? roles.get(a.roleId) : undefined} />
            ))}
          </ul>
        </section>
      </div>
      <aside className="space-y-3">
        <PrincipleNote icon={<Eye className="size-4" />}>
          A few minutes each day: relax, then picture the situation in rich detail (where you are, who is there, what they do)
          and see yourself responding exactly as your affirmation describes. Visualize the right thing; you tend to produce what
          you rehearse.
        </PrincipleNote>
        <div className="rounded-xl border bg-card p-4 text-sm">
          <div className="font-semibold">Five ingredients</div>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            <li>· Personal: about you</li>
            <li>· Positive: what you do, not what you avoid</li>
            <li>· Present tense: as if already true</li>
            <li>· Visual: a scene you can picture</li>
            <li>· Emotional: how it feels</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function AffirmationItem({ a, role }: { a: Affirmation; role: Parameters<typeof RoleBadge>[0]["role"] }) {
  const update = useApiMutation((patch: { active?: boolean; text?: string }) => call(api.affirmations[":id"].$patch({ param: { id: a.id }, json: patch })));
  const remove = useApiMutation(() => call(api.affirmations[":id"].$delete({ param: { id: a.id } })), { success: "Removed" });
  return (
    <li className={cn("flex items-start gap-3 rounded-xl border bg-card p-3", !a.active && "opacity-60")}>
      <div className="min-w-0 flex-1">
        <p className="compass-text italic">{a.text}</p>
        <div className="mt-1 flex items-center gap-2">
          <RoleBadge role={role} muted />
          <span className="text-xs text-muted-foreground">{checkAffirmation(a.text, a.visualConfirmed).filter((c) => c.ok).length}/5 ingredients</span>
        </div>
      </div>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Switch checked={a.active} onCheckedChange={(active) => update.mutate({ active })} /> Active
      </label>
      <Button variant="ghost" size="icon-sm" onClick={() => remove.mutate(undefined)} aria-label="Delete affirmation">
        <Trash2 />
      </Button>
    </li>
  );
}
