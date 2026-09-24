import { cn } from "cn"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        // Inside a primary Button the keycap adapts through the named `group/button` only:
        // menus, tabs and the sidebar also emit data-variant="default", so never use in-data-[variant=default].
        // The in-button plate darkens the teal (black/15): a lighter plate drops the 12px label below 4.5:1.
        "pointer-events-none inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-xs border border-border bg-card px-1 font-sans text-2xs font-medium text-muted-foreground tabular-nums shadow-[0_1px_0_var(--border)] select-none in-data-[slot=tooltip-content]:border-transparent in-data-[slot=tooltip-content]:bg-background/15 in-data-[slot=tooltip-content]:text-background in-data-[slot=tooltip-content]:shadow-none group-data-[variant=default]/button:border-transparent group-data-[variant=default]/button:bg-black/15 group-data-[variant=default]/button:text-primary-foreground group-data-[variant=default]/button:shadow-none",
        className
      )}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
