import * as React from "react"
import { cn } from "cn"

import {
  fieldGhost,
  fieldShell,
  fieldText,
  type FieldSize,
  type FieldVoice,
} from "@/components/ui/input"

const textareaSize: Record<FieldSize, string | undefined> = {
  sm: "px-2.5",
  default: undefined,
  lg: "px-3.5",
}

type TextareaProps = Omit<React.ComponentProps<"textarea">, "size"> & {
  size?: FieldSize
  /** `paper` is the mission editor only: its container shows focus instead. */
  variant?: "default" | "ghost" | "paper"
  voice?: FieldVoice
}

function Textarea({
  className,
  size = "default",
  variant = "default",
  voice,
  ...props
}: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldShell,
        // Without field-sizing (it can't grow to fit), the manual resize handle stays as the fallback.
        "flex min-h-20 px-3 py-2.5 field-sizing-content resize-y supports-[field-sizing:content]:resize-none",
        textareaSize[size],
        fieldText(className, voice, size),
        variant === "ghost" && cn(fieldGhost, "resize-none py-1.5"),
        variant === "paper" &&
          "min-h-[60vh] resize-none rounded-none border-0 bg-transparent px-0 py-0 shadow-none hover:border-0 focus-visible:outline-none",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
export type { TextareaProps }
