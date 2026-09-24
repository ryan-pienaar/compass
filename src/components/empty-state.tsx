import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * What an empty list says. Never show it while data is loading. `default` is centred with a
 * neutral icon circle and one `outline sm` action; `compact` is a single muted line whose action
 * is an inline link button (`Button variant="link" size="inline"`).
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  size = "default",
  className,
  ...props
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  size?: "default" | "compact";
} & Omit<ComponentProps<"div">, "title">) {
  if (size === "compact") {
    return (
      <div data-slot="empty-state" data-size="compact" className={cn("px-1 py-2 text-sm text-muted-foreground", className)} {...props}>
        {title}
        {description && <> {description}</>}
        {action && <> {action}</>}
      </div>
    );
  }
  return (
    <div data-slot="empty-state" className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)} {...props}>
      {icon && (
        <div aria-hidden className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">
          {icon}
        </div>
      )}
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
