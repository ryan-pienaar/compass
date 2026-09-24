import { CornerDownLeft, Plus } from "lucide-react";
import type { ComponentProps, Ref } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

const inputClass =
  "h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-hidden placeholder:text-faint-foreground disabled:cursor-not-allowed md:text-sm";

/**
 * One-line add: a form that prevents the default submit and calls `onSubmit()`. Callers keep
 * their own trim and validation. The visible submit button is the single-pointer path; Enter
 * also submits. `field` is a raised field; `inline` sits at the foot of wells and role groups.
 */
export function QuickAdd({
  value,
  onValueChange,
  onSubmit,
  placeholder,
  "aria-label": ariaLabel,
  submitLabel = "Add",
  pending = false,
  disabled = false,
  variant = "field",
  autoFocus,
  inputRef,
  className,
  ...props
}: {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  "aria-label": string;
  submitLabel?: string;
  pending?: boolean;
  disabled?: boolean;
  variant?: "field" | "inline";
  autoFocus?: boolean;
  inputRef?: Ref<HTMLInputElement>;
} & Omit<ComponentProps<"form">, "onSubmit" | "children">) {
  const hasText = !!value.trim();
  const input = (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      disabled={disabled}
      autoFocus={autoFocus}
      className={inputClass}
    />
  );
  return (
    <form
      data-slot="quick-add"
      data-variant={variant}
      className={cn(
        variant === "field"
          ? "group/qa flex h-10 items-center gap-2 rounded-lg bg-field pr-1 pl-3 shadow-xs ring-1 ring-edge transition-shadow duration-120 hover:ring-border-strong focus-within:ring-2 focus-within:ring-ring pointer-coarse:h-12"
          : "flex h-9 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors duration-120 hover:bg-subtle focus-within:bg-field focus-within:ring-2 focus-within:ring-ring pointer-coarse:h-11",
        className,
      )}
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Plus aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      {input}
      {variant === "field" ? (
        <>
          <Kbd aria-hidden className="opacity-0 transition-opacity group-focus-within/qa:opacity-100 pointer-coarse:hidden">
            ↵
          </Kbd>
          <Button type="submit" size="sm" variant="ghost" disabled={!hasText || pending || disabled} aria-busy={pending || undefined}>
            {submitLabel}
          </Button>
        </>
      ) : (
        hasText && (
          <Button type="submit" size="icon-xs" variant="ghost" aria-label={submitLabel} disabled={pending || disabled} aria-busy={pending || undefined}>
            <CornerDownLeft />
          </Button>
        )
      )}
    </form>
  );
}
