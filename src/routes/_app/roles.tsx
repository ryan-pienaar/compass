import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, ChevronRight, Ellipsis, Flag, Lightbulb, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { RECOMMENDED_MAX_ROLES, ROLE_COLORS, SAW_DIMENSIONS } from "@shared/content.ts";
import { localDateOf } from "@shared/dates.ts";
import { RoleDot } from "@/components/badges";
import { Chip } from "@/components/chip";
import { EmptyState } from "@/components/empty-state";
import { IconButton } from "@/components/icon-button";
import { Page, PageHeader, PrincipleNote, SectionHeader } from "@/components/page";
import { DateField, RoleSelect } from "@/components/pickers";
import { QuickAdd } from "@/components/quick-add";
import { Row, RowActions, RowMeta, RowTitle } from "@/components/row";
import { SaveStatus } from "@/components/save-status";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
        habit={2}
        eyebrow="Begin with the end in mind"
        title="Roles & long-term goals"
        description="Break your mission into the roles you play, and the results you want in each. Balance comes from keeping every role in view: health, family, work and service."
        actions={
          <Button onClick={() => setEditing({ title: "" })}>
            <Target /> New long-term goal
          </Button>
        }
      />
      <div className="space-y-10">
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
          <QuickAdd
            className="max-w-lg"
            value={newRole}
            onValueChange={setNewRole}
            onSubmit={() => {
              if (newRole.trim()) addRole.mutate(newRole.trim());
              setNewRole("");
            }}
            placeholder="Add a role, e.g. Neighbour, Coach, Son"
            aria-label="Add a role"
            submitLabel="Add role"
          />
        </div>
        {saw && <SawCard role={saw} goals={goals.filter((g) => g.roleId === saw.id)} onEditGoal={setEditing} />}
        {goals.some((g) => !g.roleId) && (
          <Card render={<section />}>
            <SectionHeader title="Goals without a role" className="mb-0" />
            <GoalList goals={goals.filter((g) => !g.roleId)} onEdit={setEditing} />
          </Card>
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
  const statementId = useId();
  // The mutation is shared with name, colour and archive: only a statement save shows "Saved" by the statement.
  const statementSaved = save.isSuccess && save.variables?.description !== undefined;

  return (
    <Card render={<section />} className="@container">
      <header className="group/row flex items-center gap-3">
        {/* The visible name is an input, so the card's heading is for screen readers only. */}
        <h2 className="sr-only">{role.name}</h2>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={cycleColor}
                className="relative size-4 shrink-0 rounded-full ring-2 ring-card ring-offset-1 ring-offset-border-strong after:absolute after:-inset-2 pointer-coarse:after:-inset-3.5"
                style={{ backgroundColor: role.color }}
                aria-label="Change colour"
              />
            }
          />
          <TooltipContent>Change colour</TooltipContent>
        </Tooltip>
        <Input
          variant="ghost"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== role.name && save.mutate({ name: name.trim() })}
          className="max-w-sm text-lg font-semibold"
          aria-label="Role name"
        />
        <RowActions className="ml-auto pointer-coarse:hidden">
          <IconButton label="Move up" icon={<ArrowUp />} disabled={!onMoveUp} onClick={onMoveUp} />
          <IconButton label="Move down" icon={<ArrowDown />} disabled={!onMoveDown} onClick={onMoveDown} />
          <IconButton label="Archive role" icon={<Archive />} onClick={() => save.mutate({ archived: true })} />
        </RowActions>
        {/* Touch: the three actions fold into one menu, so the role name keeps its width. */}
        <DropdownMenu>
          <DropdownMenuTrigger render={<IconButton label="Role actions" icon={<Ellipsis />} className="ml-auto hidden pointer-coarse:inline-flex" />} />
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={!onMoveUp} onClick={onMoveUp}>
              <ArrowUp /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!onMoveDown} onClick={onMoveDown}>
              <ArrowDown /> Move down
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => save.mutate({ archived: true })}>
              <Archive /> Archive role
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      {/* Two columns once the card itself is wide enough (a container query), so the open sidebar never squeezes them. */}
      <div className="grid grid-cols-1 gap-6 @xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="min-w-0">
          <div className="mb-2 flex min-h-8 items-center justify-between gap-2">
            <Label size="sm" htmlFor={statementId}>
              Who I want to be in this role
            </Label>
            <SaveStatus saving={pending} label={statementSaved ? "Saved" : ""} className={cn(!pending && !statementSaved && "opacity-0")} />
          </div>
          <Textarea
            id={statementId}
            voice="sm"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you about in this role? What values should guide you?"
          />
        </div>
        <div className="min-w-0">
          <SectionHeader
            as="h3"
            size="sm"
            title="Long-term goals"
            className="mb-2"
            action={
              <Button
                variant="ghost"
                size="sm"
                className="-mr-2"
                aria-label={`Add a goal for ${role.name}`}
                onClick={() => onEditGoal({ title: "", roleId: role.id })}
              >
                <Plus /> Goal
              </Button>
            }
          />
          <GoalList goals={goals} onEdit={onEditGoal} />
        </div>
      </div>
    </Card>
  );
}

function SawCard({ role, goals, onEditGoal }: { role: Role; goals: Goal[]; onEditGoal: (g: GoalDraft) => void }) {
  return (
    <Card render={<section />}>
      <header className="flex flex-wrap items-center gap-3">
        <span aria-hidden className="size-4 shrink-0 rounded-full ring-2 ring-card ring-offset-1 ring-offset-border-strong" style={{ backgroundColor: role.color }} />
        <h2 className="text-lg font-semibold text-foreground">Sharpen the Saw</h2>
        <Chip>Always on</Chip>
      </header>
      <p className="max-w-[65ch] text-sm text-muted-foreground">
        The one role that makes every other role possible: regular, balanced renewal of body, mind, heart and spirit. Each week you
        can set one small goal in each dimension.
      </p>
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg bg-border-subtle ring-1 ring-border-subtle sm:grid-cols-2 lg:grid-cols-4">
        {SAW_DIMENSIONS.map((d) => (
          <div key={d.key} className="bg-card p-3">
            <div className="text-sm font-medium text-foreground">{d.label}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{d.prompt}</div>
          </div>
        ))}
      </div>
      <div>
        <SectionHeader
          as="h3"
          size="sm"
          title="Long-term renewal goals"
          className="mb-2"
          action={
            <Button
              variant="ghost"
              size="sm"
              className="-mr-2"
              aria-label="Add a renewal goal"
              onClick={() => onEditGoal({ title: "", roleId: role.id })}
            >
              <Plus /> Goal
            </Button>
          }
        />
        <GoalList goals={goals} onEdit={onEditGoal} />
      </div>
    </Card>
  );
}

function GoalList({ goals, onEdit }: { goals: Goal[]; onEdit: (g: GoalDraft) => void }) {
  const { today } = useBootstrap();
  const visible = goals.filter((g) => g.status !== "archived");
  if (visible.length === 0) {
    return <EmptyState size="compact" className="px-0" title="No goal yet. What result would make the biggest difference here?" />;
  }
  return (
    <ul className="-mx-3">
      {visible.map((g) => {
        const achieved = g.status === "achieved";
        return (
          <li key={g.id}>
            <Row as="button" done={achieved} onClick={() => onEdit(g)} className="min-h-13 items-start">
              <Flag aria-hidden className={cn("mt-0.5 size-4 shrink-0", achieved ? "text-success" : "text-muted-foreground")} />
              <span className="block min-w-0 flex-1">
                <RowTitle className="font-medium">{g.title}</RowTitle>
                {g.endInMind && <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{g.endInMind}</span>}
                {/* Each fact carries its own leading "·"; the one that starts a wrapped line is clipped off the left edge. */}
                <span className="block overflow-hidden">
                  <RowMeta className="-ml-4 gap-x-0">
                    <GoalMeta goal={g} today={today} />
                  </RowMeta>
                </span>
              </span>
              <RowActions className="self-center">
                <Pencil aria-hidden className="size-4 text-muted-foreground" />
              </RowActions>
            </Row>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A meta fact with its leading separator (a centred "·" that screen readers skip). A fact long
 * enough to wrap sits alone on its line, so a hanging indent brings its later lines back inside
 * the clip edge, under its first letter; the separator keeps its own zero indent.
 */
const metaFact =
  "pl-4 -indent-4 before:inline-block before:w-4 before:indent-0 before:text-center before:text-faint-foreground before:content-['·'_/_'']";

/** The goal's facts, only those that have a value. */
function GoalMeta({ goal: g, today }: { goal: Goal; today: string }) {
  return (
    <>
      {g.measure && <span className={metaFact}>Measure: {g.measure}</span>}
      {g.targetDate && <span className={metaFact}>By {fmtDate(g.targetDate, "d MMM yyyy")}</span>}
      <span className={metaFact}>
        {g.stats.weeklyDone}/{g.stats.weeklyTotal} weekly rocks done
      </span>
      {g.stats.lastProgressAt && <span className={metaFact}>Last progress {relativeDay(localDateOf(g.stats.lastProgressAt), today)}</span>}
      {g.status !== "active" && <span className={cn(metaFact, "font-medium text-foreground capitalize")}>{g.status}</span>}
    </>
  );
}

function ArchivedRoles({ roles }: { roles: Role[] }) {
  const restore = useApiMutation((id: string) => call(api.roles[":id"].$patch({ param: { id }, json: { archived: false } })), { success: "Role restored" });
  return (
    <details className="group/archived">
      <summary className="-mx-2 inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-foreground transition-colors duration-120 select-none hover:bg-subtle [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden className="size-4 text-muted-foreground transition-transform duration-180 ease-out group-open/archived:rotate-90" />
        <h2>Archived roles</h2>
        <span className="text-xs font-normal text-muted-foreground tabular-nums">{roles.length}</span>
      </summary>
      <ul className="-mx-3 mt-2 max-w-lg">
        {roles.map((r) => (
          <Row key={r.id} as="li" divided className="before:left-3">
            <RoleDot color={r.color} />
            <RowTitle className="text-muted-foreground">{r.name}</RowTitle>
            <Button
              variant="outline"
              size="sm"
              aria-label={`Restore ${r.name}`}
              pending={restore.isPending && restore.variables === r.id}
              onClick={() => restore.mutate(r.id)}
            >
              <ArchiveRestore /> Restore
            </Button>
          </Row>
        ))}
      </ul>
    </details>
  );
}

function GoalDialog({ draft, onClose }: { draft: GoalDraft | null; onClose: () => void }) {
  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg" placement="top">
        {draft && <GoalForm key={draft.id ?? "new"} initial={draft} onClose={onClose} />}
      </DialogContent>
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
  const id = useId();

  return (
    <form
      className="grid gap-5"
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
        <Label size="sm" htmlFor={`${id}-title`}>
          Goal
        </Label>
        <Input id={`${id}-title`} value={g.title} onChange={(e) => setG({ ...g, title: e.target.value })} placeholder="e.g. Run a half marathon" autoFocus />
        {activityLike && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lightbulb aria-hidden className="size-3.5 shrink-0" />
            That sounds like an activity. What result do you want from it?
          </p>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label size="sm" htmlFor={`${id}-end`}>
          End in mind: what does success look like?
        </Label>
        <Textarea id={`${id}-end`} voice="sm" rows={2} value={g.endInMind} onChange={(e) => setG({ ...g, endInMind: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2">
        <div className="grid content-start gap-1.5">
          <Label size="sm" htmlFor={`${id}-measure`}>
            How you&apos;ll know you&apos;ve arrived
          </Label>
          <Input id={`${id}-measure`} value={g.measure} onChange={(e) => setG({ ...g, measure: e.target.value })} placeholder="e.g. Finish under 2:15" />
        </div>
        <div className="grid content-start gap-1.5">
          <Label size="sm" htmlFor={`${id}-date`}>
            Target date (optional)
          </Label>
          <DateField id={`${id}-date`} value={g.targetDate} onChange={(targetDate) => setG({ ...g, targetDate })} placeholder="Someday is not a date" className="w-full" />
        </div>
        <div className="grid content-start gap-1.5">
          <Label size="sm" htmlFor={`${id}-role`}>
            Role
          </Label>
          <RoleSelect id={`${id}-role`} value={g.roleId} onChange={(roleId) => setG({ ...g, roleId })} className="w-full" />
        </div>
        {initial.id && (
          <div className="grid content-start gap-1.5">
            <span id={`${id}-status`} className="text-xs font-medium text-muted-foreground">
              Status
            </span>
            <Segmented<Goal["status"]>
              aria-labelledby={`${id}-status`}
              className="w-full"
              value={g.status}
              onChange={(status) => setG({ ...g, status })}
              options={[
                { value: "active", label: "Active", className: "flex-1" },
                { value: "achieved", label: "Achieved", className: "flex-1" },
                { value: "paused", label: "Paused", className: "flex-1" },
              ]}
            />
          </div>
        )}
      </div>
      <DialogFooter
        start={
          initial.id ? (
            <Button type="button" variant="destructive-ghost" pending={remove.isPending} onClick={() => remove.mutate(undefined)}>
              <Trash2 /> Delete
            </Button>
          ) : null
        }
      >
        <Button type="submit" disabled={!g.title.trim() || save.isPending} pending={save.isPending}>
          Save goal
        </Button>
      </DialogFooter>
    </form>
  );
}
