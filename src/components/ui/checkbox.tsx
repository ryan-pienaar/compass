import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { cn } from "cn"

/**
 * The tick draws itself in (stroke-dashoffset 1 → 0). Base UI applies data-starting-style
 * only when the indicator mounts on a click, so boxes loaded as checked never animate.
 */
function CheckboxTick() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        pathLength={1}
        className="stroke-current [stroke-width:3] [stroke-linecap:round] [stroke-linejoin:round] [stroke-dasharray:1] [stroke-dashoffset:0] transition-[stroke-dashoffset] duration-180 ease-out in-data-starting-style:[stroke-dashoffset:1]"
      />
    </svg>
  )
}

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative grid size-4.5 shrink-0 place-items-center rounded-xs border-[1.5px] border-control bg-field text-primary-foreground transition-[background-color,border-color] duration-120 ease-out after:absolute after:-inset-2.5 pointer-coarse:after:-inset-3.5 data-checked:border-primary data-checked:bg-primary aria-invalid:border-destructive data-disabled:cursor-not-allowed data-disabled:opacity-45",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-items-center text-current"
      >
        <CheckboxTick />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
