import { useQuery } from "@tanstack/react-query";
import { CalendarDays, X } from "lucide-react";
import { useState } from "react";
import { fromISODate, toISODate } from "@shared/dates.ts";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { relativeDay } from "@/lib/format";
import { useBootstrap } from "@/lib/hooks";
import { goalsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { RoleDot } from "./badges";

const NONE = "__none__";

export function RoleSelect({
  value,
  onChange,
  placeholder = "No role",
  includeSaw = true,
  className,
  size = "default",
}: {
  value: string | null | undefined;
  onChange: (roleId: string | null) => void;
  placeholder?: string;
  includeSaw?: boolean;
  className?: string;
  size?: "sm" | "default";
}) {
  const { roles } = useBootstrap();
  const list = roles.filter((r) => includeSaw || !r.isSaw);
  const items = [
    { value: NONE, label: <span className="text-muted-foreground">{placeholder}</span> },
    ...list.map((r) => ({
      value: r.id,
      label: (
        <span className="flex items-center gap-2">
          <RoleDot color={r.color} />
          {r.name}
        </span>
      ),
    })),
  ];
  return (
    <Select items={items} value={value ?? NONE} onValueChange={(v) => onChange(v === NONE || v == null ? null : String(v))}>
      <SelectTrigger size={size} className={cn("min-w-40", className)}>
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
  );
}

export function GoalSelect({
  value,
  onChange,
  roleId,
  className,
  size = "default",
}: {
  value: string | null | undefined;
  onChange: (goalId: string | null) => void;
  /** When set, goals of this role are listed first. */
  roleId?: string | null;
  className?: string;
  size?: "sm" | "default";
}) {
  const { roles } = useBootstrap();
  const { data: goals = [] } = useQuery(goalsQuery());
  const active = goals.filter((g) => g.status === "active" || g.id === value);
  const groups = [...roles]
    .sort((a, b) => Number(b.id === roleId) - Number(a.id === roleId))
    .map((r) => ({ role: r, goals: active.filter((g) => g.roleId === r.id) }))
    .filter((g) => g.goals.length);
  const loose = active.filter((g) => !g.roleId || !roles.some((r) => r.id === g.roleId));
  const items = [{ value: NONE, label: <span className="text-muted-foreground">No long-term goal</span> }, ...active.map((g) => ({ value: g.id, label: g.title }))];
  return (
    <Select items={items} value={value ?? NONE} onValueChange={(v) => onChange(v === NONE || v == null ? null : String(v))}>
      <SelectTrigger size={size} className={cn("min-w-40 max-w-full", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-64">
        <SelectItem value={NONE}>
          <span className="text-muted-foreground">No long-term goal</span>
        </SelectItem>
        {groups.map(({ role, goals: gs }) => (
          <SelectGroup key={role.id}>
            <SelectLabel className="flex items-center gap-1.5">
              <RoleDot color={role.color} /> {role.name}
            </SelectLabel>
            {gs.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.title}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
        {loose.length > 0 && (
          <SelectGroup>
            <SelectLabel>Other</SelectLabel>
            {loose.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.title}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}

export function DateField({
  value,
  onChange,
  placeholder = "No date",
  className,
  size = "default",
  clearable = true,
}: {
  value: string | null | undefined;
  onChange: (date: string | null) => void;
  placeholder?: string;
  className?: string;
  size?: "sm" | "default";
  clearable?: boolean;
}) {
  const { today, settings } = useBootstrap();
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button variant="outline" size={size === "sm" ? "sm" : "default"} className={cn("justify-start font-normal", !value && "text-muted-foreground")} />
          }
        >
          <CalendarDays />
          {value ? relativeDay(value, today) : placeholder}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            weekStartsOn={settings.weekStartsOn}
            selected={value ? fromISODate(value) : undefined}
            defaultMonth={value ? fromISODate(value) : undefined}
            onSelect={(d) => {
              onChange(d ? toISODate(d) : null);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {clearable && value && (
        <Button variant="ghost" size={size === "sm" ? "icon-sm" : "icon"} aria-label="Clear date" onClick={() => onChange(null)}>
          <X />
        </Button>
      )}
    </div>
  );
}

export const ESTIMATES = [15, 30, 60, 90, 120, 180, 240];

export function EstimateSelect({
  value,
  onChange,
  className,
  size = "default",
}: {
  value: number | null | undefined;
  onChange: (minutes: number | null) => void;
  className?: string;
  size?: "sm" | "default";
}) {
  const label = (m: number) => (m < 60 ? `${m} min` : `${m / 60} h`);
  const items = [{ value: NONE, label: "No estimate" }, ...ESTIMATES.map((m) => ({ value: String(m), label: label(m) }))];
  if (value && !ESTIMATES.includes(value)) items.push({ value: String(value), label: label(value) });
  return (
    <Select items={items} value={value ? String(value) : NONE} onValueChange={(v) => onChange(v === NONE || v == null ? null : Number(v))}>
      <SelectTrigger size={size} className={cn("min-w-28", className)}>
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
  );
}
