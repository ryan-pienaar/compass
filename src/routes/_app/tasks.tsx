import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ListChecks, Plus, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { QUADRANTS, QUADRANT_ORDER } from "@shared/quadrant.ts";
import { useAppState } from "@/components/app-state";
import { QuadrantBadge, RoleDot } from "@/components/badges";
import { CountBadge } from "@/components/chip";
import { EmptyState } from "@/components/empty-state";
import { Page, PageHeader, SectionHeader } from "@/components/page";
import { QuickAdd } from "@/components/quick-add";
import { MetaSep } from "@/components/row";
import { Segmented } from "@/components/segmented";
import { TaskRow } from "@/components/task-row";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Task } from "@/lib/api";
import { useBootstrap } from "@/lib/hooks";
import { useTaskActions } from "@/lib/mutations";
import { tasksQuery } from "@/lib/queries";

type View = "open" | "inbox" | "backlog" | "done" | "dropped";
type GroupBy = "role" | "quadrant" | "none";

export const Route = createFileRoute("/_app/tasks")({
  validateSearch: (search: Record<string, unknown>): { view?: View } => ({
    view: ["open", "inbox", "backlog", "done", "dropped"].includes(search.view as string) ? (search.view as View) : undefined,
  }),
  component: TasksPage,
});

const VIEW_HINTS: Record<View, string> = {
  open: "Everything still open: tasks and this week's big rocks.",
  inbox: "Captured but not triaged. Decide: is it important? is it urgent?",
  backlog: "Open tasks without a day. Pull from here when you plan the week.",
  done: "Recently completed.",
  dropped: "Things you said no to, delegated, or let go. Saying no to the good makes room for the best.",
};

/** A group heading: an optional mark in the check column, then the title. */
type GroupHeading = { icon?: ReactNode; title: ReactNode };
type Group = { key: string; heading: GroupHeading | null; items: Task[] };

/** A role dot centred over the row checks (20px column), so dots and checks share one axis. */
const checkAxis = (dot: ReactNode) => <span className="flex w-5 justify-center">{dot}</span>;

/** Loading: row-shaped placeholders, not a spinner. */
const SKELETON_TITLES = ["w-2/5", "w-3/5", "w-1/3", "w-1/2", "w-2/5", "w-1/4"];

function TasksPage() {
  const { view = "open" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { roles, counts } = useBootstrap();
  const { openCapture } = useAppState();
  const { create } = useTaskActions();
  const [groupBy, setGroupBy] = useState<GroupBy>("role");
  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState("");
  const { data: tasks = [], isLoading } = useQuery(tasksQuery({ view }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? tasks.filter((t) => t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q)) : tasks;
  }, [tasks, query]);

  const groups = useMemo((): Group[] => {
    if (groupBy === "none") return [{ key: "all", heading: null, items: filtered }];
    if (groupBy === "quadrant") {
      return [
        ...QUADRANT_ORDER.map((q) => ({
          key: `q${q}`,
          heading: {
            title: (
              <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                <QuadrantBadge q={q} withLabel />
                {/* The badge already says this to screen readers. The separator keeps it apart from the count. */}
                <span aria-hidden className="text-xs font-normal text-muted-foreground">
                  {QUADRANTS[q].label}
                  <MetaSep className="ml-1.5" />
                </span>
              </span>
            ),
          },
          items: filtered.filter((t) => t.quadrant === q),
        })),
        { key: "none", heading: { title: <QuadrantBadge q={null} /> }, items: filtered.filter((t) => t.quadrant == null) },
      ].filter((g) => g.items.length);
    }
    return [
      ...roles.map((r) => ({
        key: r.id,
        heading: { icon: checkAxis(<RoleDot color={r.color} />), title: r.name },
        items: filtered.filter((t) => t.roleId === r.id),
      })),
      {
        key: "none",
        heading: { icon: checkAxis(<RoleDot />), title: "No role" },
        items: filtered.filter((t) => !t.roleId || !roles.some((r) => r.id === t.roleId)),
      },
    ].filter((g) => g.items.length);
  }, [filtered, groupBy, roles]);

  const inboxCount = counts.inbox ?? 0;

  return (
    <Page width="medium">
      <PageHeader
        habit={3}
        eyebrow="Put first things first"
        title="Tasks"
        description={VIEW_HINTS[view]}
        actions={
          <Button onClick={() => openCapture()}>
            <Plus /> Capture & triage
          </Button>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3">
        <Tabs value={view} onValueChange={(v) => navigate({ search: { view: v as View } })} className="max-w-full min-w-0">
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="inbox">
              Inbox {inboxCount > 0 && <CountBadge count={inboxCount} attention />}
            </TabsTrigger>
            <TabsTrigger value="backlog">Backlog</TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
            <TabsTrigger value="dropped">Said no</TabsTrigger>
          </TabsList>
        </Tabs>
        {/* Grows into the rest of the line: beside the tabs when they fit, else its own row (group by left, search right). */}
        <div className="flex w-full items-center gap-2 sm:w-auto sm:grow">
          <Segmented<GroupBy>
            size="sm"
            value={groupBy}
            onChange={setGroupBy}
            aria-label="Group by"
            className="shrink-0"
            options={[
              { value: "role", label: "By role" },
              { value: "quadrant", label: "By quadrant" },
              { value: "none", label: "Flat" },
            ]}
          />
          <InputGroup className="w-full sm:ml-auto sm:w-60">
            <InputGroupAddon>
              <Search aria-hidden />
            </InputGroupAddon>
            <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search tasks" />
          </InputGroup>
        </div>
      </div>

      {(view === "open" || view === "inbox") && (
        <QuickAdd
          className="mb-6"
          value={quick}
          onValueChange={setQuick}
          onSubmit={() => {
            if (!quick.trim()) return;
            create.mutate({ title: quick.trim(), source: "capture" });
            setQuick("");
          }}
          placeholder="Quick add to inbox (triage later)…"
          aria-label="Quick add to inbox"
        />
      )}

      {isLoading ? (
        // The same geometry as a group heading and its TaskRows, so nothing jumps when the data lands.
        <div aria-hidden>
          {groupBy !== "none" && (
            <div className="mb-1 flex h-10 items-center gap-3">
              {groupBy === "quadrant" ? (
                <Skeleton className="h-5 w-24 rounded-full" />
              ) : (
                <>
                  {checkAxis(<Skeleton className="size-2 rounded-full" />)}
                  <Skeleton className="h-4 w-32" />
                </>
              )}
            </div>
          )}
          <div className="-mx-3">
            {SKELETON_TITLES.map((w, i) => (
              <div key={i} className="@container flex h-10 items-center gap-3 px-3 pointer-coarse:h-12">
                <Skeleton className="size-5 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <Skeleton className={`h-3.5 ${w}`} />
                </div>
                {groupBy !== "quadrant" && <Skeleton className="h-5 w-11 shrink-0 rounded-full" />}
                {/* The day, due and estimate columns (w-20, w-24, w-12 and their gaps), shown when the row is wide. */}
                <div className="hidden w-62 shrink-0 @2xl:block" />
              </div>
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ListChecks />}
          title={view === "inbox" ? "Inbox zero" : "Nothing here"}
          description={view === "inbox" ? "Everything you've captured has been triaged." : "Capture something with N, or change the view."}
          action={
            <Button variant="outline" size="sm" onClick={() => openCapture()}>
              <Plus /> Capture
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.key}>
              {g.heading && (
                <SectionHeader
                  title={g.heading.title}
                  icon={g.heading.icon}
                  count={g.items.length}
                  className="sticky top-12 z-10 -mx-3 mb-1 gap-3 bg-background/90 px-3 py-2 backdrop-blur-md"
                />
              )}
              <div className="-mx-3">
                {g.items.map((t) => (
                  <TaskRow key={t.id} task={t} showQuadrant={groupBy !== "quadrant"} showRole={groupBy !== "role"} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}
