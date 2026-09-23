import { Check, Mountain, Repeat } from "lucide-react";
import type { ReactNode } from "react";
import type { Task } from "@/lib/api";
import { relativeDay } from "@/lib/format";
import { useBootstrap, useRolesMap } from "@/lib/hooks";
import { useToggleDone } from "@/lib/mutations";
import { cn } from "@/lib/utils";
import { useAppState } from "./app-state";
import { QuadrantBadge, RoleDot } from "./badges";

/** A compact, clickable task line used in lists. */
export function TaskRow({ task, actions, showQuadrant = true, className }: { task: Task; actions?: ReactNode; showQuadrant?: boolean; className?: string }) {
  const { today } = useBootstrap();
  const roles = useRolesMap();
  const role = task.roleId ? roles.get(task.roleId) : undefined;
  const toggle = useToggleDone();
  const { openTask } = useAppState();
  const done = task.status === "done";
  const closed = task.status === "dropped" || task.status === "missed";

  return (
    <div className={cn("group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/60", className)}>
      <button
        type="button"
        onClick={() => toggle(task)}
        disabled={closed}
        aria-label={done ? "Mark as not done" : "Mark as done"}
        className={cn(
          "grid size-4.5 shrink-0 place-items-center rounded-md border-2 disabled:opacity-40",
          done ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary",
        )}
        style={!done && role ? { borderColor: role.color } : undefined}
      >
        {done && <Check className="size-3" />}
      </button>
      <button type="button" onClick={() => openTask(task.id)} className="min-w-0 flex-1 text-left">
        <div className={cn("flex items-center gap-1.5 text-sm", (done || closed) && "text-muted-foreground line-through")}>
          {task.kind === "goal" && <Mountain className="size-3.5 shrink-0 text-primary" />}
          <span className="truncate">{task.title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          {role && (
            <span className="inline-flex items-center gap-1">
              <RoleDot color={role.color} /> {role.name}
            </span>
          )}
          {task.scheduledDate && <span>planned {relativeDay(task.scheduledDate, today)}</span>}
          {task.dueDate && (
            <span className={cn(task.dueDate < today && task.status === "open" && "font-medium text-destructive")}>
              due {relativeDay(task.dueDate, today)}
            </span>
          )}
          {task.carryCount > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Repeat className="size-2.5" /> {task.carryCount}
            </span>
          )}
          {closed && task.statusReason && <span>{task.statusReason.replace(/_/g, " ")}</span>}
        </div>
      </button>
      {actions}
      {showQuadrant && <QuadrantBadge q={task.quadrant} size="xs" />}
    </div>
  );
}
