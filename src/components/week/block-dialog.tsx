import { ExternalLink, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Quadrant } from "@shared/quadrant.ts";
import { useAppState } from "@/components/app-state";
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
      <DialogContent className="top-[8vh] translate-y-0 sm:max-w-md">
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
  const lo = Math.min(dayStartHour * 60, d.startMin);
  const hi = Math.max(dayEndHour * 60, d.endMin);
  const times = [];
  for (let m = lo; m <= hi; m += 15) times.push(m);
  const valid = d.endMin > d.startMin && (d.title.trim() || d.taskId);

  return (
    <form
      className="grid gap-4"
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
      {d.taskId ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="truncate">
            For: <span className="font-medium">{d.taskTitle ?? d.title}</span>
          </span>
          <Button type="button" variant="ghost" size="xs" onClick={() => openTask(d.taskId!)}>
            <ExternalLink /> Open
          </Button>
        </div>
      ) : null}
      <div className="grid gap-1.5">
        <Label htmlFor="block-title">Title</Label>
        <Input id="block-title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="e.g. Dentist, Team meeting" autoFocus={!d.taskId} />
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
        <div className="grid gap-1.5">
          <Label>Day</Label>
          <DateField value={d.date} onChange={(date) => date && setD({ ...d, date })} clearable={false} size="sm" />
        </div>
        <TimeSelect label="From" value={d.startMin} times={times.slice(0, -1)} onChange={(startMin) => setD({ ...d, startMin, endMin: Math.max(d.endMin, startMin + 15) })} />
        <TimeSelect label="To" value={d.endMin} times={times.filter((t) => t > d.startMin)} onChange={(endMin) => setD({ ...d, endMin })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Kind</Label>
          <Segmented
            size="sm"
            value={d.kind}
            onChange={(kind) => setD({ ...d, kind })}
            options={[
              { value: "focus", label: "Focus" },
              { value: "appointment", label: "Appointment" },
            ]}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Role</Label>
          <RoleSelect value={d.roleId} onChange={(roleId) => setD({ ...d, roleId })} size="sm" className="w-full" />
        </div>
      </div>
      {!d.taskId && (
        <div className="grid gap-1.5">
          <Label>Quadrant</Label>
          <Segmented<"1" | "2" | "3" | "4" | "none">
            size="sm"
            value={d.quadrant ? (String(d.quadrant) as "1") : "none"}
            onChange={(v) => setD({ ...d, quadrant: v === "none" ? null : (Number(v) as Quadrant) })}
            options={[
              { value: "1", label: "I" },
              { value: "2", label: "II" },
              { value: "3", label: "III" },
              { value: "4", label: "IV" },
              { value: "none", label: "–" },
            ]}
          />
        </div>
      )}
      {initial.id && (
        <div className="grid gap-1.5">
          <Label>How did it go?</Label>
          <Segmented
            size="sm"
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
        <Label>Notes</Label>
        <Textarea rows={2} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />
      </div>
      <DialogFooter className="sm:justify-between">
        {initial.id ? (
          <Button type="button" variant="ghost" className="text-destructive" onClick={() => onDelete(initial.id!)}>
            <Trash2 /> Remove
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid}>
            Save
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

function TimeSelect({ label, value, times, onChange }: { label: string; value: number; times: number[]; onChange: (m: number) => void }) {
  const items = times.map((t) => ({ value: String(t), label: formatMinutes(t) }));
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select items={items} value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger size="sm" className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((it) => (
            <SelectItem key={it.value} value={it.value}>
              {it.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
