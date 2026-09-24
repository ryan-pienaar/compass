import { Check, ChevronLeft } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { STEP_LABELS, type PlanStep } from "@/components/plan/steps";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/*
 * The plan ritual's chrome: the stepper in the sticky header and the sticky action bar every
 * step ends on. The stepper sits in a `@container/steps` so its labels appear when the stepper
 * itself has room (sidebar open or not), not at a fixed viewport width.
 */

/**
 * The steps of the ritual as a rail: ink discs for steps behind you, a teal ring on the current
 * one, teal connectors filling up to it. Click any step to jump there. The current step's name is
 * always visible: beside its disc when the rail has room, as a caption under it on phones. Other
 * labels show when there is room; otherwise they stay in the accessible name and the tooltip.
 */
export function PlanStepper({
  steps,
  current,
  committed = false,
  onSelect,
  className,
}: {
  steps: readonly PlanStep[];
  current: PlanStep;
  /** The week is committed: the last disc stays filled. */
  committed?: boolean;
  onSelect: (step: PlanStep) => void;
  className?: string;
}) {
  const index = steps.indexOf(current);
  return (
    // Below @xs the current label hangs under the rail, so the rail makes room for it underneath.
    <ol aria-label="Planning steps" className={cn("flex items-center gap-1 @max-xs/steps:pb-4.5 @min-[13rem]/steps:gap-0", className)}>
      {steps.map((s, i) => {
        const isCurrent = s === current;
        const done = i < index || (committed && s === "commit");
        return (
          <li key={s} className="flex items-center">
            {i > 0 && (
              <span aria-hidden className="relative mx-0.5 hidden h-px w-2.5 overflow-hidden bg-border @min-[13rem]/steps:block @md/steps:mx-1 @md/steps:w-4 @2xl/steps:w-6">
                <span
                  className={cn(
                    "absolute inset-0 origin-left bg-primary transition-[scale] duration-320 ease-out",
                    i <= index ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </span>
            )}
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => onSelect(s)}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "group/step relative flex items-center gap-2 rounded-full p-0 text-xs font-medium transition-colors duration-120 hover:bg-subtle focus-ring-inset pointer-coarse:after:absolute pointer-coarse:after:-inset-2 @xs/steps:p-0.5 @md/steps:p-1",
                      // Room for the label: the pill pads out on the right.
                      isCurrent ? "@xs/steps:pr-2.5" : "@3xl/steps:pr-2.5",
                    )}
                  />
                }
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-2xs font-semibold tabular-nums transition-[background-color,color,box-shadow] duration-180",
                    done ? "bg-foreground text-background" : isCurrent ? "bg-card text-primary-ink" : "bg-muted text-muted-foreground",
                    isCurrent && "ring-2 ring-primary",
                  )}
                >
                  {done ? <Check aria-hidden className="size-3" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap",
                    isCurrent
                      ? cn(
                          // A caption under the disc on a narrow rail, clamped to the rail's ends.
                          "text-foreground @max-xs/steps:absolute @max-xs/steps:top-full @max-xs/steps:mt-1 @max-xs/steps:leading-none",
                          i === 0
                            ? "@max-xs/steps:left-0"
                            : i === steps.length - 1
                              ? "@max-xs/steps:right-0"
                              : "@max-xs/steps:left-1/2 @max-xs/steps:-translate-x-1/2",
                        )
                      : cn("sr-only @3xl/steps:not-sr-only", done ? "text-foreground" : "text-muted-foreground group-hover/step:text-foreground"),
                  )}
                >
                  {STEP_LABELS[s].label}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {/* One text run: the content is a flex row, so loose children would get its gap. */}
                <span>
                  <span className="font-semibold">{STEP_LABELS[s].label}</span> · {STEP_LABELS[s].hint}
                </span>
              </TooltipContent>
            </Tooltip>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * A step's content column. It grows to fill the page, so the ActionBar after it sits at the
 * bottom of short steps and sticks to the viewport on long ones. `className` sets the width.
 */
export function StepBody({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="plan-step" className={cn("mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6", className)} {...props} />;
}

/**
 * The foot of every plan step: Back on the left, a hint in the middle, the step's one primary
 * action on the right. `className` sets the inner width so it lines up with the step content.
 * `persistentHint` keeps the hint on phones too (on a row of its own) when it explains why the
 * primary action is disabled.
 */
export function ActionBar({
  onBack,
  backDisabled = false,
  hint,
  persistentHint = false,
  className,
  children,
}: {
  onBack?: () => void;
  backDisabled?: boolean;
  hint?: ReactNode;
  persistentHint?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-slot="plan-action-bar"
      className={cn(
        "sticky bottom-0 z-20 border-t border-border-subtle bg-background/85 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md backdrop-saturate-150",
        // With the hint on its own row the phone bar outgrows the global 5rem scroll padding, so
        // raise it while this bar is on the page: a focused field never lands under it.
        persistentHint && hint && "max-sm:[html:has(&)]:scroll-pb-32",
      )}
    >
      <div className={cn("mx-auto flex max-w-3xl flex-wrap items-center gap-x-2 gap-y-2 px-4 sm:flex-nowrap sm:gap-x-3 sm:px-6", className)}>
        {onBack && (
          // Icon-only on phones so the primary keeps its line; the word stays as the accessible name.
          <Button variant="ghost" onClick={onBack} disabled={backDisabled} className="-ml-2.5 max-sm:w-11 max-sm:px-0 sm:-ml-3.5">
            <ChevronLeft /> <span className="max-sm:sr-only">Back</span>
          </Button>
        )}
        {hint && (
          <div
            className={cn(
              "min-w-0 text-muted-foreground",
              persistentHint ? "order-first basis-full text-xs sm:order-none sm:flex-1 sm:basis-auto sm:text-sm" : "hidden flex-1 text-sm sm:block",
            )}
          >
            {hint}
          </div>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">{children}</div>
      </div>
    </div>
  );
}
