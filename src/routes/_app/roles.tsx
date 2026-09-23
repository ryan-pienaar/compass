import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Flag, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { RECOMMENDED_MAX_ROLES, ROLE_COLORS, SAW_DIMENSIONS } from "@shared/content.ts";
import { localDateOf } from "@shared/dates.ts";
import { Page, PageHeader, PrincipleNote } from "@/components/page";
import { DateField, RoleSelect } from "@/components/pickers";
import { Segmented } from "@/components/segmented";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, call, type Goal, type Role } from "@/lib/api";
import { fmtDate, relativeDay } from "@/lib/format";
import { useAutosave, useBootstrap } from "@/lib/hooks";
import { useApiMutation } from "@/lib/mutations";
import { goalsQuery, rolesQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/roles")({
  component: RolesPage,
});

type GoalDraft = Partial<Goal> & { title: string };

function RolesPage() {
  const { data: roles = [] } = useQuery(rolesQuery(true));
  const { data: goals = [] } = useQuery(goalsQuery());
  const [newRole, setNewRole] = useState("");
  const [editing, setEditing] = useState<GoalDraft | null>(null);
  const addRole = useApiMutation((name: string) => call(api.roles.$post({ json: { name } })), { success: "Role added" });
  const reorder = useApiMutation((ids: string[]) => call(api.roles.order.$put({ json: { ids } })));

  const active = roles.filter((r) => !r.archivedAt);
  const ordinary = active.filter((r) => !r.isSaw);
  const saw = active.find((r) => r.isSaw);
  const archived = roles.filter((r) => r.archivedAt);

  const move = (id: string, dir: -1 | 1) => {
    const ids = ordinary.map((r) => r.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder.mutate(ids);
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Habit 2 · Begin with the end in mind"
        title="Roles & long-term goals"
        description="Break your mission into the roles you play, and the results you want in each. Balance comes from keeping every role in view: health, family, work and service."
        actions={
          <Button onClick={() => setEditing({ title: "" })}>
            <Target /> New long-term goal
          </Button>
        }
      />
      <div className="space-y-4">
        {ordinary.map((role, i) => (
          <RoleCard
            key={role.id}
            role={role}
            goals={goals.filter((g) => g.roleId === role.id)}
            onEditGoal={setEditing}
            onMoveUp={i > 0 ? () => move(role.id, -1) : undefined}
            onMoveDown={i < ordinary.length - 1 ? () => move(role.id, 1) : undefined}
          />
        ))}
        {ordinary.length > RECOMMENDED_MAX_ROLES && (
          <PrincipleNote>More than seven roles is hard to keep in balance. Could some be combined?</PrincipleNote>
        )}
        <form
          className="flex max-w-lg gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (newRole.trim()) addRole.mutate(newRole.trim());
            setNewRole("");
          }}
        >
          <Input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="Add a role, e.g. Neighbour, Coach, Son" />
          <Button type="submit" variant="outline" disabled={!newRole.trim()}>
            <Plus /> Add role
          </Button>
        </form>
        {saw && <SawCard role={saw} goals={goals.filter((g) => g.roleId === saw.id)} onEditGoal={setEditing} />}
        {goals.some((g) => !g.roleId) && (
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold">Goals without a role</h2>
            <GoalList goals={goals.filter((g) => !g.roleId)} onEdit={setEditing} />
          </section>
        )}
        {archived.length > 0 && <ArchivedRoles roles={archived} />}
      </div>
      <GoalDialog draft={editing} onClose={() => setEditing(null)} />
    </Page>
  );
}

function RoleCard({
  role,
  goals,
  onEditGoal,
  onMoveUp,
  onMoveDown,
}: {
  role: Role;
  goals: Goal[];
  onEditGoal: (g: GoalDraft) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description);
  useEffect(() => setName(role.name), [role.name]);
  const save = useApiMutation((patch: { name?: string; description?: string; color?: string; archived?: boolean }) =>
    call(api.roles[":id"].$patch({ param: { id: role.id }, json: patch })),
  );
  const pending = useAutosave(description, (d) => save.mutate({ description: d }), 900);
  const cycleColor = () => {
    const i = ROLE_COLORS.indexOf(role.color);
    save.mutate({ color: ROLE_COLORS[(i + 1) % ROLE_COLORS.length] });
  };

  return (
    <section className="rounded-2xl border bg-card p-4">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={cycleColor}
          className="size-5 shrink-0 rounded-full ring-2 ring-background ring-offset-1 ring-offset-border"
          style={{ backgroundColor: role.color }}
          aria-label="Change colour"
          title="Change colour"
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== role.name && save.mutate({ name: name.trim() })}
          className="h-8 max-w-sm border-none bg-transparent px-1 text-base font-semibold shadow-none focus-visible:ring-1 dark:bg-transparent"
          aria-label="Role name"
        />
        <div className="ml-auto flex items-center gap-0.5">
          <Button variant="ghost" size="icon-sm" disabled={!onMoveUp} onClick={onMoveUp} aria-label="Move up">
            <ArrowUp />
          </Button>
          <Button variant="ghost" size="icon-sm" disabled={!onMoveDown} onClick={onMoveDown} aria-label="Move down">
            <ArrowDown />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => save.mutate({ archived: true })} aria-label="Archive role" title="Archive role">
            <Archive />
          </Button>
        </div>
      </header>
      <div className="mt-3 grid gap-4 md:grid-cols-[1fr_1.3fr]">
        <div className="grid content-start gap-1.5">
          <Label className="text-xs text-muted-foreground">Who I want to be in this role {pending && "· saving…"}</Label>
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="compass-text !text-[0.95rem]"
            placeholder="What are you about in this role? What values should guide you?"
          />
        </div>
        <div className="grid content-start gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Long-term goals</Label>
            <Button variant="ghost" size="xs" onClick={() => onEditGoal({ title: "", roleId: role.id })}>
              <Plus /> Goal
            </Button>
          </div>
          <GoalList goals={goals} onEdit={onEditGoal} />
        </div>
      </div>
    </section>
  );
}

function SawCard({ role, goals, onEditGoal }: { role: Role; goals: Goal[]; onEditGoal: (g: GoalDraft) => void }) {
  return (
    <section className="rounded-2xl border border-dashed bg-card p-4">
      <header className="flex items-center gap-2">
        <span className="size-5 rounded-full" style={{ backgroundColor: role.color }} />
        <h2 className="font-semibold">Sharpen the Saw</h2>
        <Badge variant="outline" className="ml-2">Always on</Badge>
      </header>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        The one role that makes every other role possible: regular, balanced renewal of body, mind, heart and spirit. Each week you
        can set one small goal in each dimension.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {SAW_DIMENSIONS.map((d) => (
          <div key={d.key} className="rounded-lg bg-muted/50 p-2.5 text-xs">
            <div className="font-medium">{d.label}</div>
            <div className="text-muted-foreground">{d.prompt}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Long-term renewal goals</Label>
          <Button variant="ghost" size="xs" onClick={() => onEditGoal({ title: "", roleId: role.id })}>
            <Plus /> Goal
          </Button>
        </div>
        <GoalList goals={goals} onEdit={onEditGoal} />
      </div>
    </section>
  );
}

function GoalList({ goals, onEdit }: { goals: Goal[]; onEdit: (g: GoalDraft) => void }) {
  const { today } = useBootstrap();
  const visible = goals.filter((g) => g.status !== "archived");
  if (visible.length === 0) return <p className="text-sm text-muted-foreground">No goal yet. What result would make the biggest difference here?</p>;
  return (
    <ul className="space-y-1.5">
      {visible.map((g) => (
        <li key={g.id}>
          <button type="button" onClick={() => onEdit(g)} className="w-full rounded-xl border bg-background p-2.5 text-left hover:border-primary/40">
            <div className="flex items-start gap-2">
              <Flag className={cn("mt-0.5 size-3.5 shrink-0", g.status === "achieved" ? "text-success" : "text-primary")} />
              <div className="min-w-0 flex-1">
                <div className={cn("text-sm font-medium", g.status === "achieved" && "line-through decoration-success/60")}>{g.title}</div>
                {g.endInMind && <div className="text-xs text-muted-foreground">{g.endInMind}</div>}
                <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                  {g.measure && <span>Measure: {g.measure}</span>}
                  {g.targetDate && <span>By {fmtDate(g.targetDate, "d MMM yyyy")}</span>}
                  <span>
                    {g.stats.weeklyDone}/{g.stats.weeklyTotal} weekly rocks done
                  </span>
                  {g.stats.lastProgressAt && <span>Last progress {relativeDay(localDateOf(g.stats.lastProgressAt), today)}</span>}
                  {g.status !== "active" && <span className="font-medium">{g.status}</span>}
                </div>
              </div>
              <Pencil className="size-3.5 shrink-0 text-muted-foreground" />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ArchivedRoles({ roles }: { roles: Role[] }) {
  const restore = useApiMutation((id: string) => call(api.roles[":id"].$patch({ param: { id }, json: { archived: false } })), { success: "Role restored" });
  return (
    <section className="rounded-2xl border border-dashed p-4">
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Archived roles</h2>
      <ul className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <li key={r.id}>
            <Button variant="outline" size="sm" onClick={() => restore.mutate(r.id)}>
              <ArchiveRestore /> {r.name}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GoalDialog({ draft, onClose }: { draft: GoalDraft | null; onClose: () => void }) {
  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="top-[8vh] translate-y-0 sm:max-w-lg">{draft && <GoalForm key={draft.id ?? "new"} initial={draft} onClose={onClose} />}</DialogContent>
    </Dialog>
  );
}

function GoalForm({ initial, onClose }: { initial: GoalDraft; onClose: () => void }) {
  const [g, setG] = useState({
    title: initial.title ?? "",
    roleId: initial.roleId ?? null,
    endInMind: initial.endInMind ?? "",
    measure: initial.measure ?? "",
    targetDate: initial.targetDate ?? null,
    status: initial.status ?? ("active" as Goal["status"]),
  });
  const save = useApiMutation(
    () => (initial.id ? call(api.goals[":id"].$patch({ param: { id: initial.id }, json: g })) : call(api.goals.$post({ json: g }))),
    { success: initial.id ? "Goal saved" : "Goal added", onSuccess: onClose },
  );
  const remove = useApiMutation(() => call(api.goals[":id"].$delete({ param: { id: initial.id! } })), { success: "Goal deleted", onSuccess: onClose });
  const activityLike = /^(work on|try to|do|spend time|keep|continue|look into)\b/i.test(g.title.trim());

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (g.title.trim()) save.mutate(undefined);
      }}
    >
      <DialogHeader>
        <DialogTitle>{initial.id ? "Long-term goal" : "New long-term goal"}</DialogTitle>
        <DialogDescription>All things are created twice: describe the end clearly before you work out the steps.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-1.5">
        <Label>Goal</Label>
        <Input value={g.title} onChange={(e) => setG({ ...g, title: e.target.value })} placeholder="e.g. Run a half marathon" autoFocus />
        {activityLike && <p className="text-xs text-warning">That sounds like an activity. What result do you want from it?</p>}
      </div>
      <div className="grid gap-1.5">
        <Label>End in mind: what does success look like?</Label>
        <Textarea rows={2} value={g.endInMind} onChange={(e) => setG({ ...g, endInMind: e.target.value })} className="compass-text !text-[0.95rem]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>How you&apos;ll know you&apos;ve arrived</Label>
          <Input value={g.measure} onChange={(e) => setG({ ...g, measure: e.target.value })} placeholder="e.g. Finish under 2:15" />
        </div>
        <div className="grid gap-1.5">
          <Label>Target date (optional)</Label>
          <DateField value={g.targetDate} onChange={(targetDate) => setG({ ...g, targetDate })} placeholder="Someday is not a date" size="sm" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Role</Label>
          <RoleSelect value={g.roleId} onChange={(roleId) => setG({ ...g, roleId })} size="sm" className="w-full" />
        </div>
        {initial.id && (
          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Segmented<Goal["status"]>
              size="sm"
              value={g.status}
              onChange={(status) => setG({ ...g, status })}
              options={[
                { value: "active", label: "Active" },
                { value: "achieved", label: "Achieved" },
                { value: "paused", label: "Paused" },
              ]}
            />
          </div>
        )}
      </div>
      <DialogFooter className="sm:justify-between">
        {initial.id ? (
          <Button type="button" variant="ghost" className="text-destructive" onClick={() => remove.mutate(undefined)}>
            <Trash2 /> Delete
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={!g.title.trim() || save.isPending}>
          Save goal
        </Button>
      </DialogFooter>
    </form>
  );
}
