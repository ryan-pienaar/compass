import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "default",
  className,
  "aria-label": ariaLabel,
}: {
  value: T | null;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; className?: string }[];
  size?: "sm" | "default";
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn("inline-flex rounded-lg border bg-muted/50 p-0.5", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
              active ? cn("bg-background text-foreground shadow-sm ring-1 ring-foreground/10", o.className) : "hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
