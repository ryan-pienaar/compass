import { useQuery } from "@tanstack/react-query";
import { CalendarDays, X } from "lucide-react";
import { useRef, useState } from "react";
import { fromISODate, toISODate } from "@shared/dates.ts";
import { WEEKDAY_NAMES } from "@shared/settings.ts";
import { IconButton } from "@/components/icon-button";
import { Calendar } from "@/components/ui/calendar";
import { fieldShell } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { relativeDay } from "@/lib/format";
import { useBootstrap } from "@/lib/hooks";
import { goalsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { RoleDot } from "./badges";

const NONE = "__none__";

type PickerSize = "sm" | "default";
/** `ghost`: borderless until hovered or open (the task-sheet property grid). */
type PickerVariant = "default" | "ghost";

export function RoleSelect({
  value,
  onChange,
  placeholder = "No role",
  includeSaw = true,
  className,
  size = "default",
  variant = "default",
  id,
}: {
  value: string | null | undefined;
  onChange: (roleId: string | null) => void;
  placeholder?: string;
  includeSaw?: boolean;
  className?: string;
  size?: PickerSize;
  variant?: PickerVariant;
  /** For a `<Label htmlFor>`. */
  id?: string;
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
      <SelectTrigger id={id} size={size} variant={variant} className={cn("w-fit min-w-40", className)}>
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
  variant = "default",
  id,
}: {
  value: string | null | undefined;
  onChange: (goalId: string | null) => void;
  /** When set, goals of this role are listed first. */
  roleId?: string | null;
  className?: string;
  size?: PickerSize;
  variant?: PickerVariant;
  /** For a `<Label htmlFor>`. */
  id?: string;
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
      <SelectTrigger id={id} size={size} variant={variant} className={cn("w-fit min-w-40 max-w-full", className)}>
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

/**
 * A date as a field: a trigger styled like a Select (it opens a calendar popover) and, beside it,
 * a clear button. The clear button stays mounted and turns invisible when there is no date, so the
 * row never jumps; the trigger reserves room for it.
 */
export function DateField({
  value,
  onChange,
  placeholder = "No date",
  className,
  size = "default",
  variant = "default",
  clearable = true,
  id,
}: {
  value: string | null | undefined;
  onChange: (date: string | null) => void;
  placeholder?: string;
  className?: string;
  size?: PickerSize;
  variant?: PickerVariant;
  clearable?: boolean;
  /** For a `<Label htmlFor>`; lands on the trigger button. */
  id?: string;
}) {
  const { today, settings } = useBootstrap();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <div className={cn("relative inline-flex", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          ref={triggerRef}
          id={id}
          data-slot="date-field-trigger"
          className={cn(
            fieldShell,
            "flex h-9 items-center gap-2 px-3 text-left text-sm whitespace-nowrap select-none data-[popup-open]:border-ring pointer-coarse:h-11",
            size === "sm" && "h-8 px-2.5",
            clearable && "pr-8",
            variant === "ghost" &&
              "border-transparent bg-transparent shadow-none hover:border-input hover:bg-field data-[popup-open]:border-ring",
            !value && "text-faint-foreground",
          )}
        >
          <CalendarDays aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">{value ? relativeDay(value, today) : placeholder}</span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
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
      {clearable && (
        <IconButton
          label="Clear date"
          icon={<X />}
          size="icon-xs"
          className={cn("absolute top-1/2 right-1 -translate-y-1/2", !value && "invisible")}
          onClick={() => {
            onChange(null);
            triggerRef.current?.focus();
          }}
        />
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
  variant = "default",
  id,
}: {
  value: number | null | undefined;
  onChange: (minutes: number | null) => void;
  className?: string;
  size?: PickerSize;
  variant?: PickerVariant;
  /** For a `<Label htmlFor>`. */
  id?: string;
}) {
  const label = (m: number) => (m < 60 ? `${m} min` : `${m / 60} h`);
  const items = [{ value: NONE, label: "No estimate" }, ...ESTIMATES.map((m) => ({ value: String(m), label: label(m) }))];
  if (value && !ESTIMATES.includes(value)) items.push({ value: String(value), label: label(value) });
  return (
    <Select items={items} value={value ? String(value) : NONE} onValueChange={(v) => onChange(v === NONE || v == null ? null : Number(v))}>
      <SelectTrigger id={id} size={size} variant={variant} className={cn("w-fit min-w-28", className)}>
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

/** Weekday picker (0 = Sunday). Settings and Welcome share it; it defaults to the settings-row width. */
export function DaySelect({
  value,
  onChange,
  className,
  size = "default",
  variant = "default",
  id,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  size?: PickerSize;
  variant?: PickerVariant;
  /** For a `<Label htmlFor>`. */
  id?: string;
}) {
  const items = WEEKDAY_NAMES.map((d, i) => ({ value: String(i), label: d }));
  return (
    <Select items={items} value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger id={id} size={size} variant={variant} className={cn("w-44", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((d) => (
          <SelectItem key={d.value} value={d.value}>
            {d.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Whole-hour picker between `min` and `max` (inclusive), shown as 24-hour "07:00". */
export function HourSelect({
  value,
  min,
  max,
  onChange,
  className,
  size = "default",
  variant = "default",
  id,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  className?: string;
  size?: PickerSize;
  variant?: PickerVariant;
  /** For a `<Label htmlFor>`. */
  id?: string;
}) {
  const items = Array.from({ length: max - min + 1 }, (_, i) => min + i).map((h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}:00` }));
  return (
    <Select items={items} value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger id={id} size={size} variant={variant} className={cn("w-44 tabular-nums", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((h) => (
          <SelectItem key={h.value} value={h.value} className="tabular-nums">
            {h.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
