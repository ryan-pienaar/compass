import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Thumb = { x: number; w: number };

/**
 * A one-of-many choice: a sunken track with a raised thumb that slides to the pressed option.
 * The thumb is measured from the pressed button, so option widths can differ. `wrap` lets the
 * options flow onto several rows (no thumb there; the pressed option carries its own plate).
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "default",
  wrap = false,
  className,
  "aria-label": ariaLabel,
  ...props
}: {
  value: T | null;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; className?: string }[];
  size?: "sm" | "default";
  wrap?: boolean;
  className?: string;
  "aria-label"?: string;
} & Omit<ComponentProps<"div">, "onChange" | "children" | "role" | "ref" | "defaultValue">) {
  const trackRef = useRef<HTMLDivElement>(null);
  const optionKey = options.map((o) => o.value).join("|");
  const [thumb, setThumb] = useState<Thumb | null>(null);
  // The thumb only transitions once it has been placed, so it never slides in from the left edge.
  const [placed, setPlaced] = useState(false);

  useLayoutEffect(() => {
    const track = trackRef.current;
    // Hidden thumb: forget the placement, so the next one appears in place instead of sliding.
    const hide = () => {
      setThumb(null);
      setPlaced(false);
    };
    if (!track || wrap) {
      hide();
      return;
    }
    const measure = () => {
      const pressed = track.querySelector<HTMLElement>(':scope > button[aria-pressed="true"]');
      if (!pressed) {
        hide();
        return;
      }
      const next = { x: pressed.offsetLeft, w: pressed.offsetWidth };
      setThumb((prev) => (prev && prev.x === next.x && prev.w === next.w ? prev : next));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    for (const button of track.querySelectorAll(":scope > button")) observer.observe(button);
    return () => observer.disconnect();
  }, [value, wrap, size, optionKey]);

  useEffect(() => {
    if (!thumb || placed) return;
    const frame = requestAnimationFrame(() => setPlaced(true));
    return () => cancelAnimationFrame(frame);
  }, [thumb, placed]);

  const showThumb = !wrap && thumb !== null;

  // The track hairline uses inset-ring-*, not `ring-1 ring-inset`: with an `inset` colour token in
  // the theme, `ring-inset` also sets the ring colour to --inset and hides the hairline.
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      {...props}
      ref={trackRef}
      className={cn(
        "relative isolate inline-flex h-9 max-w-full items-center rounded-lg bg-inset p-0.5 inset-ring inset-ring-border-subtle pointer-coarse:h-11 dark:inset-ring-edge",
        size === "sm" && "h-8",
        wrap && "h-auto flex-wrap pointer-coarse:h-auto",
        className,
      )}
    >
      {showThumb && (
        <span
          aria-hidden
          style={{ "--seg-x": `${thumb.x}px`, "--seg-w": `${thumb.w}px` } as CSSProperties}
          className={cn(
            "pointer-events-none absolute inset-y-0.5 left-0 -z-10 w-(--seg-w) translate-x-(--seg-x) rounded-sm bg-card shadow-xs ring-1 ring-edge transition-[translate,width] duration-180 ease-in-out motion-reduce:transition-none dark:bg-popover",
            !placed && "transition-none",
          )}
        />
      )}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative h-8 min-w-8 rounded-sm px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-120 hover:text-foreground aria-pressed:font-semibold aria-pressed:text-foreground focus-ring-inset pointer-coarse:h-10 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
              size === "sm" && "h-7 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
              // No thumb yet (first paint, or wrap mode): the pressed option carries the plate itself.
              !showThumb && "aria-pressed:bg-card aria-pressed:shadow-xs aria-pressed:ring-1 aria-pressed:ring-edge dark:aria-pressed:bg-popover",
              o.className,
            )}
          >
            {/* Both copies share one grid cell; the invisible semibold one fixes the width, so selecting never shifts the row. */}
            <span className="inline-grid *:col-start-1 *:row-start-1">
              <span aria-hidden className="invisible inline-flex items-center justify-center gap-1.5 font-semibold">
                {o.label}
              </span>
              <span className="inline-flex items-center justify-center gap-1.5">{o.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
