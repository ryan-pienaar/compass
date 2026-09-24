import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * The Segmented option recipe (Folio §6.2): ink at rest, a raised card plate when pressed.
 * Inside a ToggleGroup (the track) the plate takes the inner radius.
 */
const toggleVariants = cva(
  "group/toggle relative inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium whitespace-nowrap text-muted-foreground transition-[color,background-color,box-shadow] duration-120 ease-out hover:text-foreground focus-ring-inset disabled:pointer-events-none disabled:opacity-45 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs aria-pressed:ring-1 aria-pressed:ring-edge dark:aria-pressed:bg-popover in-data-[slot=toggle-group]:rounded-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-border bg-card shadow-xs hover:border-border-strong dark:bg-muted",
      },
      size: {
        default: "h-8 min-w-8 px-3 pointer-coarse:h-10",
        sm: "h-7 min-w-7 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 min-w-9 px-3.5 pointer-coarse:h-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
