import * as React from "react"
import { cn } from "cn"

type LabelProps = React.ComponentProps<"label"> & {
  /** `sm`: the muted 13px field label used above inputs in forms and property grids. */
  size?: "sm" | "default"
}

function Label({ className, size = "default", ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      data-size={size}
      className={cn(
        "flex items-center gap-2 select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-45 peer-disabled:cursor-not-allowed peer-disabled:opacity-45",
        size === "sm"
          ? "text-xs font-medium text-muted-foreground"
          : "text-sm leading-5 font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Label }
export type { LabelProps }
