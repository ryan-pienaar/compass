import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

/**
 * The bordered-field shell (Folio §6.1). Reused by Input, Textarea, SelectTrigger,
 * the DateField trigger and InputGroup so every field reads the same.
 */
const fieldShell =
  "w-full min-w-0 rounded-lg border border-input bg-field text-foreground shadow-xs transition-[border-color,box-shadow,background-color] duration-120 ease-out placeholder:text-faint-foreground hover:border-muted-foreground focus-field focus-visible:border-ring disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-faint-foreground aria-invalid:border-destructive"

type FieldSize = "sm" | "default" | "lg"
type FieldVoice = "sm" | "md" | "lg"

/** Serif voice for reflective fields. It replaces the default 16px/14px text classes; every voice is 16px or more, so iOS never zooms. */
const fieldVoice: Record<FieldVoice, string> = {
  sm: "voice-sm",
  md: "voice",
  lg: "voice-lg",
}

/** Inline-edit look: borderless until hovered or focused. */
const fieldGhost =
  "-mx-1.5 h-auto min-h-8 border-transparent bg-transparent px-1.5 shadow-none hover:border-transparent hover:bg-subtle focus-visible:border-ring focus-visible:bg-field"

/**
 * `cn` keeps a responsive `md:text-sm` next to a caller's plain `text-lg`, and the
 * responsive one then wins from `md` up. When the caller sets its own size, drop ours.
 */
const hasOwnTextSize = (className: unknown) =>
  typeof className === "string" &&
  /(?:^|\s)!?text-(?:2xs|xs|sm|md|base|lg|[2-5]?xl)(?=\s|$)/.test(className)

/** The text classes a field uses: a voice, a caller's size, or the 16px-mobile/14px-desktop default. */
function fieldText(
  className: unknown,
  voice: FieldVoice | undefined,
  size: FieldSize
) {
  if (voice) return fieldVoice[voice]
  if (hasOwnTextSize(className)) return undefined
  return size === "lg" ? "text-base" : "text-base md:text-sm"
}

const inputSize: Record<FieldSize, string> = {
  sm: "h-8 px-2.5",
  default: "h-9 px-3",
  lg: "h-11 px-3.5",
}

type InputProps = Omit<React.ComponentProps<"input">, "size"> & {
  size?: FieldSize
  variant?: "default" | "ghost"
  voice?: FieldVoice
}

function Input({
  className,
  type,
  size = "default",
  variant = "default",
  voice,
  ...props
}: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        fieldShell,
        inputSize[size],
        "pointer-coarse:h-11",
        fieldText(className, voice, size),
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        variant === "ghost" && fieldGhost,
        className
      )}
      {...props}
    />
  )
}

export { Input, fieldShell, fieldText, fieldGhost }
export type { InputProps, FieldSize, FieldVoice }
