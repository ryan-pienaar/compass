import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { QUADRANTS, QUADRANT_ORDER } from "@shared/quadrant.ts";
import { useAppState } from "@/components/app-state";
import { QuadrantBadge, RoleDot } from "@/components/badges";
import { Page, PageHeader } from "@/components/page";
import { Segmented } from "@/components/segmented";
import { TaskRow } from "@/components/task-row";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
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

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: null as React.ReactNode, items: filtered }];
    if (groupBy === "quadrant") {
      return [
        ...QUADRANT_ORDER.map((q) => ({
          key: `q${q}`,
          label: (
            <span className="flex items-center gap-2">
              <QuadrantBadge q={q} withLabel /> {QUADRANTS[q].label}
            </span>
          ) as React.ReactNode,
          items: filtered.filter((t) => t.quadrant === q),
        })),
        { key: "none", label: "Untriaged", items: filtered.filter((t) => t.quadrant == null) },
      ].filter((g) => g.items.length);
    }
    return [
      ...roles.map((r) => ({
        key: r.id,
        label: (
          <span className="flex items-center gap-2">
            <RoleDot color={r.color} /> {r.name}
          </span>
        ) as React.ReactNode,
        items: filtered.filter((t) => t.roleId === r.id),
      })),
      { key: "none", label: "No role", items: filtered.filter((t) => !t.roleId || !roles.some((r) => r.id === t.roleId)) },
    ].filter((g) => g.items.length);
  }, [filtered, groupBy, roles]);

  return (
    <Page>
      <PageHeader
        eyebrow="Habit 3 · Put first things first"
        title="Tasks"
        description={VIEW_HINTS[view]}
        actions={
          <Button onClick={() => openCapture()}>
            <Plus /> Capture & triage
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={view} onValueChange={(v) => navigate({ search: { view: v as View } })}>
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="inbox">Inbox{counts.inbox ? ` · ${counts.inbox}` : ""}</TabsTrigger>
            <TabsTrigger value="backlog">Backlog</TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
            <TabsTrigger value="dropped">Said no</TabsTrigger>
          </TabsList>
        </Tabs>
        <Segmented<GroupBy>
          size="sm"
          value={groupBy}
          onChange={setGroupBy}
          aria-label="Group by"
          options={[
            { value: "role", label: "By role" },
            { value: "quadrant", label: "By quadrant" },
            { value: "none", label: "Flat" },
          ]}
        />
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="pl-8" />
        </div>
      </div>

      {(view === "open" || view === "inbox") && (
        <form
          className="mb-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!quick.trim()) return;
            create.mutate({ title: quick.trim(), source: "capture" });
            setQuick("");
          }}
        >
          <Input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder="Quick add to inbox (triage later)…" />
          <Button type="submit" variant="outline" disabled={!quick.trim()}>
            Add
          </Button>
        </form>
      )}

      {!isLoading && filtered.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>{view === "inbox" ? "Inbox zero" : "Nothing here"}</EmptyTitle>
            <EmptyDescription>
              {view === "inbox" ? "Everything you've captured has been triaged." : "Capture something with N, or change the view."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.key}>
              {g.label && (
                <h2 className="mb-1 flex items-center justify-between px-2 text-sm font-semibold">
                  {g.label}
                  <span className="text-xs font-normal text-muted-foreground">{g.items.length}</span>
                </h2>
              )}
              <div className="rounded-xl border bg-card p-1">
                {g.items.map((t: Task) => (
                  <TaskRow key={t.id} task={t} showQuadrant={groupBy !== "quadrant"} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}
