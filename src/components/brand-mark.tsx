import { Compass } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const TILE_SIZE = {
  sm: "size-7 rounded-lg [&_svg]:size-4",
  md: "size-8 rounded-lg [&_svg]:size-4.5",
  lg: "size-10 rounded-xl [&_svg]:size-5",
} as const;

const TILE = "grid shrink-0 place-items-center bg-primary text-primary-foreground shadow-xs inset-shadow-2xs";

/**
 * The Compass mark: a teal tile holding the compass glyph, optionally followed by the name in the serif voice.
 * `className` and other props land on the root: the tile alone, or the tile-and-name row with `withName`.
 * The name carries `data-slot="brand-mark-name"` so a container (the collapsed sidebar) can hide it.
 */
export function BrandMark({
  size = "md",
  withName = false,
  className,
  ...props
}: { size?: "sm" | "md" | "lg"; withName?: boolean } & ComponentProps<"div">) {
  if (!withName) {
    return (
      <div data-slot="brand-mark" className={cn(TILE, TILE_SIZE[size], className)} {...props}>
        <Compass aria-hidden />
      </div>
    );
  }
  return (
    <div data-slot="brand-mark" className={cn("flex min-w-0 items-center gap-2", className)} {...props}>
      <span className={cn(TILE, TILE_SIZE[size])}>
        <Compass aria-hidden />
      </span>
      <span data-slot="brand-mark-name" className="truncate font-serif text-lg font-medium text-foreground">
        Compass
      </span>
    </div>
  );
}
