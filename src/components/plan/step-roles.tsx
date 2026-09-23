import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { RECOMMENDED_MAX_ROLES } from "@shared/content.ts";
import { PrincipleNote } from "@/components/page";
import { RoleDot } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { api, call, type WeekBoard } from "@/lib/api";
import { useApiMutation } from "@/lib/mutations";
import { cn } from "@/lib/utils";

export function StepRoles({ board }: { board: WeekBoard }) {
  const start = board.week.startDate;
  const [newRole, setNewRole] = useState("");
  const selected = new Set(board.weekRoleIds);
  const setRoles = useApiMutation((roleIds: string[]) => call(api.weeks[":start"].roles.$put({ param: { start }, json: { roleIds } })));
  const addRole = useApiMutation((name: string) => call(api.roles.$post({ json: { name } })), {
    onSuccess: (role) => setRoles.mutate([...board.roles.filter((r) => selected.has(r.id)).map((r) => r.id), role.id]),
  });

  const toggle = (id: string, on: boolean) => {
    const next = board.roles.filter((r) => (r.id === id ? on : selected.has(r.id))).map((r) => r.id);
    setRoles.mutate(next);
  };
  const active = board.roles.filter((r) => selected.has(r.id) && !r.isSaw).length;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="compass-display text-3xl">Identify your roles for this week</h2>
        <p className="text-muted-foreground">
          Just think about the next seven days: in which areas of your life will you spend time and energy? Each role deserves at
          least a moment of thought, even if you decide it gets nothing this week.
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {board.roles.map((r) => {
          const on = selected.has(r.id);
          return (
            <li key={r.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 transition-colors",
                  on ? "border-primary/40" : "opacity-70 hover:opacity-100",
                  r.isSaw && "cursor-default border-dashed",
                )}
              >
                <Checkbox className="mt-0.5" checked={on || r.isSaw} disabled={r.isSaw} onCheckedChange={(v) => toggle(r.id, v === true)} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium">
                    <RoleDot color={r.color} /> {r.name}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {r.isSaw ? "Always on: renewal keeps every other role possible." : r.description || "No role statement yet."}
                  </p>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
      <form
        className="flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newRole.trim()) addRole.mutate(newRole.trim());
          setNewRole("");
        }}
      >
        <Input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="Add a role for this week" />
        <Button type="submit" variant="outline" disabled={!newRole.trim()}>
          <Plus /> Add
        </Button>
      </form>
      {active > RECOMMENDED_MAX_ROLES && (
        <PrincipleNote>
          {active} roles is a lot to hold in one week. Consider combining some, or giving a few of them a rest this week.
        </PrincipleNote>
      )}
      <p className="text-sm text-muted-foreground">
        Edit role statements (&ldquo;who I want to be in this role&rdquo;) in{" "}
        <Link to="/roles" className="underline">
          Roles &amp; goals
        </Link>
        .
      </p>
    </div>
  );
}
