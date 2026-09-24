import { useCallback, useEffect, useState, type CSSProperties } from "react";

export type EnterProps = { className?: string; style?: CSSProperties };

const SETTLE_MS = 600;
const MAX_STAGGER_INDEX = 8;

/**
 * List enter, once per mount of a view. For the first 600ms `enter(i)` returns the `rise-in`
 * animation with a 30ms stagger (capped at 8); after that it returns `{}`, so refetches and
 * filter changes never replay it and the class is gone before any drag lift.
 *
 *   const enter = useEnterOnce();
 *   const e = enter(i);
 *   <li className={cn("…", e.className)} style={e.style}>
 */
export function useEnterOnce(): (index: number) => EnterProps {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(t);
  }, []);
  return useCallback(
    (index: number): EnterProps =>
      settled
        ? {}
        : {
            className: "animate-rise-in",
            style: { animationDelay: `calc(${Math.min(Math.max(0, index), MAX_STAGGER_INDEX)} * var(--motion-stagger))` },
          },
    [settled],
  );
}
