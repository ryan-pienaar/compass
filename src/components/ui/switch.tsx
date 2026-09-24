"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "cn"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        // Forced colours flatten fills and drop shadows, so the track gets a real border there (its
        // padding shrinks by the border width, keeping the thumb's travel) and the thumb a system colour.
        "peer group/switch relative inline-flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors duration-180 ease-out after:absolute after:-inset-2.5 data-checked:bg-primary data-unchecked:bg-control data-disabled:cursor-not-allowed data-disabled:opacity-45 forced-colors:border forced-colors:border-[ButtonText] forced-colors:p-px",
        size === "sm" && "h-5 w-8",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-white shadow-xs transition-[translate] duration-180 ease-out data-checked:translate-x-4 forced-color-adjust-none forced-colors:bg-[ButtonText]",
          size === "sm" && "size-4 data-checked:translate-x-3"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
