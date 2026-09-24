import { Info } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Three or more stats together: one container with hairlines between cells, not a card each. */
export function StatStrip({ cols = 4, className, ...props }: { cols?: 3 | 4 } & ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-strip"
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border-subtle shadow-sm ring-1 ring-edge max-sm:[&>:last-child:nth-child(odd)]:col-span-2",
        cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4",
        className,
      )}
      {...props}
    />
  );
}

/** A node worth a wrapper: not null, undefined, false or empty text. */
const present = (n: ReactNode) => n != null && n !== false && n !== "";

const statLabel = "flex items-center gap-1.5 text-xs font-medium text-muted-foreground";

/**
 * One stat: label, value (with unit), hint and an optional meter slot (children). `info` turns
 * the label into a button that opens a tooltip, so the explanation is keyboard-reachable.
 * `standalone` gives the cell its own raised surface when it isn't in a StatStrip.
 */
export function StatCell({
  label,
  value,
  unit,
  hint,
  info,
  tone = "default",
  standalone = false,
  className,
  children,
  ...props
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  hint?: ReactNode;
  info?: ReactNode;
  tone?: "default" | "warning";
  standalone?: boolean;
  children?: ReactNode;
} & ComponentProps<"div">) {
  const infoId = useId();
  return (
    <div data-slot="stat-cell" className={cn("min-w-0 bg-card px-4 py-3.5", standalone && "rounded-xl shadow-sm ring-1 ring-edge", className)} {...props}>
      {info ? (
        <>
          {/* Base UI tooltips carry no ARIA, so the button is described by a hidden copy of the text. */}
          <Tooltip>
            <TooltipTrigger
              render={<button type="button" aria-describedby={infoId} className={cn(statLabel, "rounded-xs text-left")} />}
            >
              {label}
              <Info aria-hidden className="size-3.5 shrink-0" />
            </TooltipTrigger>
            <TooltipContent>{info}</TooltipContent>
          </Tooltip>
          <span id={infoId} hidden>
            {info}
          </span>
        </>
      ) : (
        <div className={statLabel}>{label}</div>
      )}
      <div className={cn("mt-1 text-2xl font-semibold text-foreground tabular-nums", tone === "warning" && "text-warning")}>
        {value}
        {present(unit) && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
      </div>
      {present(hint) && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      {present(children) && <div className="mt-2.5">{children}</div>}
    </div>
  );
}
