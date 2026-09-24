import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { RECOMMENDED_MAX_ROLES } from "@shared/content.ts";
import { Chip } from "@/components/chip";
import { PrincipleNote, StepHeader } from "@/components/page";
import { RoleDot } from "@/components/badges";
import { OptionCard } from "@/components/plan/option-card";
import { QuickAdd } from "@/components/quick-add";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { api, call, type WeekBoard } from "@/lib/api";
import { useApiMutation } from "@/lib/mutations";

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
    <div>
      <StepHeader
        title="Identify your roles for this week"
        lede={
          <>
            Just think about the next seven days: in which areas of your life will you spend time and energy? Each role deserves at
            least a moment of thought, even if you decide it gets nothing this week.
          </>
        }
      />
      <div className="space-y-8">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {board.roles.map((r) => {
            const on = selected.has(r.id);
            return (
              <li key={r.id} className="min-w-0">
                <OptionCard className="h-full">
                  <Checkbox className="mt-0.5" checked={on || r.isSaw} disabled={r.isSaw} onCheckedChange={(v) => toggle(r.id, v === true)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-h-5 items-center gap-2 text-sm font-medium text-foreground">
                      <RoleDot color={r.color} />
                      <span className="min-w-0 flex-1">{r.name}</span>
                      {r.isSaw && (
                        <Chip size="sm" className="-my-0.5">
                          Always on
                        </Chip>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {r.isSaw ? "Renewal keeps every other role possible." : r.description || "No role statement yet."}
                    </p>
                  </div>
                </OptionCard>
              </li>
            );
          })}
        </ul>

        <QuickAdd
          className="max-w-md"
          value={newRole}
          onValueChange={setNewRole}
          placeholder="Add a role for this week"
          aria-label="Add a role for this week"
          onSubmit={() => {
            if (newRole.trim()) addRole.mutate(newRole.trim());
            setNewRole("");
          }}
        />

        {active > RECOMMENDED_MAX_ROLES && (
          <PrincipleNote>
            {active} roles is a lot to hold in one week. Consider combining some, or giving a few of them a rest this week.
          </PrincipleNote>
        )}

        <p className="text-sm text-muted-foreground">
          Edit role statements (&ldquo;who I want to be in this role&rdquo;) in{" "}
          <Button variant="link" size="inline" render={<Link to="/roles" />}>
            Roles &amp; goals
          </Button>
          .
        </p>
      </div>
    </div>
  );
}
