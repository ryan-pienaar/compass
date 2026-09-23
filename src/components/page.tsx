import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Page({ children, className, width = "default" }: { children: ReactNode; className?: string; width?: "default" | "wide" | "narrow" | "full" }) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 pt-6 pb-16 sm:px-6 lg:px-8",
        width === "narrow" && "max-w-3xl",
        width === "default" && "max-w-6xl",
        width === "wide" && "max-w-[1500px]",
        width === "full" && "max-w-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0 space-y-1">
        {eyebrow && <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** A short principle reminder, set in the serif "compass" voice. */
export function PrincipleNote({ children, className, icon }: { children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <div className={cn("flex gap-3 rounded-xl border border-dashed bg-card/60 px-4 py-3 text-sm text-muted-foreground", className)}>
      {icon && <div className="mt-0.5 shrink-0 text-primary">{icon}</div>}
      <div className="compass-text !text-[0.95rem] leading-snug">{children}</div>
    </div>
  );
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-2 flex items-center justify-between gap-2", className)}>
      <h2 className="text-sm font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}
