import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Autosave status: a breathing teal dot and "Saving…", then the idle label (default "Saved"). */
export function SaveStatus({ saving, label = "Saved", className, ...props }: { saving: boolean; label?: ReactNode } & ComponentProps<"p">) {
  return (
    <p
      aria-live="polite"
      data-slot="save-status"
      className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}
      {...props}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", saving ? "animate-breathe bg-primary" : "bg-border-strong")} />
      {saving ? "Saving…" : label}
    </p>
  );
}
