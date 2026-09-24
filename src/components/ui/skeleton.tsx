import { cn } from "cn"

/*
 * Folio §6.1 Skeleton: invisible for 200ms, then fades in and pulses (animate-skeleton).
 * Static under reduced motion (index.css targets data-slot="skeleton"). No text-effect sweeps here.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-lg bg-muted animate-skeleton", className)}
      {...props}
    />
  )
}

export { Skeleton }
