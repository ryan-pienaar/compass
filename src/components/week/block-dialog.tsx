import { ExternalLink, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import type { Quadrant } from "@shared/quadrant.ts";
import { useAppState } from "@/components/app-state";
import { QuadrantDot } from "@/components/badges";
import { DateField, RoleSelect } from "@/components/pickers";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Block } from "@/lib/api";
import { formatMinutes } from "@/lib/format";

export interface BlockDraft {
  id?: string;
  date: string;
  startMin: number;
  endMin: number;
  title: string;
  notes: string;
  roleId: string | null;
  kind: "focus" | "appointment";
  quadrant: Quadrant | null;
  status: "planned" | "done" | "skipped";
  taskId: string | null;
  taskTitle?: string | null;
}

export function draftFromBlock(b: Block): BlockDraft {
  return {
    id: b.id,
    date: b.date,
    startMin: b.startMin,
    endMin: b.endMin,
    title: b.title,
    notes: b.notes,
    roleId: b.roleId,
    kind: b.kind,
    quadrant: (b.quadrant as Quadrant | null) ?? null,
    status: b.status,
    taskId: b.taskId,
    taskTitle: b.taskTitle,
  };
}

export function BlockDialog({
  draft,
  onClose,
  onSave,
  onDelete,
  dayStartHour,
  dayEndHour,
}: {
  draft: BlockDraft | null;
  onClose: () => void;
  onSave: (d: BlockDraft) => void;
  onDelete: (id: string) => void;
  dayStartHour: number;
  dayEndHour: number;
}) {
  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent placement="top">
        {draft && (
          <BlockForm
            key={draft.id ?? `${draft.date}-${draft.startMin}`}
            initial={draft}
            onClose={onClose}
            onSave={onSave}
            onDelete={onDelete}
            dayStartHour={dayStartHour}
            dayEndHour={dayEndHour}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Quadrant options: the numeral beside its colour dot (the dot never stands alone). */
const QUADRANT_OPTIONS: { value: "1" | "2" | "3" | "4" | "none"; label: React.ReactNode }[] = [
  ...([1, 2, 3, 4] as const).map((q) => ({
    value: String(q) as "1" | "2" | "3" | "4",
    label: (
      <>
        <QuadrantDot q={q} />
        {["I", "II", "III", "IV"][q - 1]}
      </>
    ),
  })),
  {
    value: "none",
    label: (
      <>
        <span aria-hidden>–</span>
        <span className="sr-only">None</span>
      </>
    ),
  },
];

function BlockForm({
  initial,
  onClose,
  onSave,
  onDelete,
  dayStartHour,
  dayEndHour,
}: {
  initial: BlockDraft;
  onClose: () => void;
  onSave: (d: BlockDraft) => void;
  onDelete: (id: string) => void;
  dayStartHour: number;
  dayEndHour: number;
}) {
  const { openTask } = useAppState();
  const [d, setD] = useState<BlockDraft>(initial);
  const id = useId();
  const lo = Math.min(dayStartHour * 60, d.startMin);
  const hi = Math.max(dayEndHour * 60, d.endMin);
  const times = [];
  for (let m = lo; m <= hi; m += 15) times.push(m);
  const valid = d.endMin > d.startMin && (d.title.trim() || d.taskId);

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave(d);
      }}
    >
      <DialogHeader>
        <DialogTitle>{initial.id ? "Edit time block" : "New time block"}</DialogTitle>
        <DialogDescription>
          {d.kind === "focus" ? "Time reserved for something that matters to you." : "A commitment with other people or a fixed event."}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        {d.taskId ? (
          <div className="-my-1 flex min-w-0 items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate">
              <span className="text-muted-foreground">For: </span>
              <span className="font-medium">{d.taskTitle ?? d.title}</span>
            </span>
            <Button type="button" variant="ghost" size="xs" className="-mr-2.5" onClick={() => openTask(d.taskId!)}>
              <ExternalLink /> Open
            </Button>
          </div>
        ) : null}
        <div className="grid gap-1.5">
          <Label size="sm" htmlFor={`${id}-title`}>
            Title
          </Label>
          <Input
            id={`${id}-title`}
            value={d.title}
            onChange={(e) => setD({ ...d, title: e.target.value })}
            placeholder="e.g. Dentist, Team meeting"
            autoFocus={!d.taskId}
          />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-2">
          <div className="grid min-w-0 gap-1.5">
            <Label size="sm" htmlFor={`${id}-day`}>
              Day
            </Label>
            <DateField id={`${id}-day`} value={d.date} onChange={(date) => date && setD({ ...d, date })} clearable={false} />
          </div>
          <TimeSelect
            id={`${id}-from`}
            label="From"
            value={d.startMin}
            times={times.slice(0, -1)}
            onChange={(startMin) => setD({ ...d, startMin, endMin: Math.max(d.endMin, startMin + 15) })}
          />
          <TimeSelect id={`${id}-to`} label="To" value={d.endMin} times={times.filter((t) => t > d.startMin)} onChange={(endMin) => setD({ ...d, endMin })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-3">
          <div className="grid gap-1.5">
            <Label size="sm" id={`${id}-kind`}>
              Kind
            </Label>
            <Segmented
              aria-labelledby={`${id}-kind`}
              className="w-full [&>button]:flex-auto"
              value={d.kind}
              onChange={(kind) => setD({ ...d, kind })}
              options={[
                { value: "focus", label: "Focus" },
                { value: "appointment", label: "Appointment" },
              ]}
            />
          </div>
          <div className="grid gap-1.5">
            <Label size="sm" htmlFor={`${id}-role`}>
              Role
            </Label>
            <RoleSelect id={`${id}-role`} value={d.roleId} onChange={(roleId) => setD({ ...d, roleId })} className="w-full" />
          </div>
        </div>
        {!d.taskId && (
          <div className="grid gap-1.5">
            <Label size="sm" id={`${id}-quadrant`}>
              Quadrant
            </Label>
            <Segmented<"1" | "2" | "3" | "4" | "none">
              aria-labelledby={`${id}-quadrant`}
              className="w-full [&>button]:flex-1"
              value={d.quadrant ? (String(d.quadrant) as "1") : "none"}
              onChange={(v) => setD({ ...d, quadrant: v === "none" ? null : (Number(v) as Quadrant) })}
              options={QUADRANT_OPTIONS}
            />
          </div>
        )}
        {initial.id && (
          <div className="grid gap-1.5">
            <Label size="sm" id={`${id}-status`}>
              How did it go?
            </Label>
            <Segmented
              aria-labelledby={`${id}-status`}
              className="w-full [&>button]:flex-auto"
              value={d.status}
              onChange={(status) => setD({ ...d, status })}
              options={[
                { value: "planned", label: "Planned" },
                { value: "done", label: "Done" },
                { value: "skipped", label: "Didn't happen" },
              ]}
            />
          </div>
        )}
        <div className="grid gap-1.5">
          <Label size="sm" htmlFor={`${id}-notes`}>
            Notes
          </Label>
          <Textarea id={`${id}-notes`} rows={2} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />
        </div>
      </div>
      <DialogFooter
        start={
          initial.id ? (
            <Button type="button" variant="destructive-ghost" className="-ml-3" onClick={() => onDelete(initial.id!)}>
              <Trash2 /> Remove
            </Button>
          ) : null
        }
      >
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!valid}>
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}

function TimeSelect({ id, label, value, times, onChange }: { id: string; label: string; value: number; times: number[]; onChange: (m: number) => void }) {
  const items = times.map((t) => ({ value: String(t), label: formatMinutes(t) }));
  // A block that ends off the 15-minute grid (06:40) still shows its time on the trigger, not "400".
  // Label lookup only: the list itself is unchanged.
  const labels = items.some((it) => it.value === String(value)) ? items : [...items, { value: String(value), label: formatMinutes(value) }];
  return (
    <div className="grid gap-1.5">
      <Label size="sm" htmlFor={id}>
        {label}
      </Label>
      <Select items={labels} value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger id={id} className="w-24 tabular-nums">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((it) => (
            <SelectItem key={it.value} value={it.value} className="tabular-nums">
              {it.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
