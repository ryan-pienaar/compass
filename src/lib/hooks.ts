import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { Role } from "./api";
import { bootstrapQuery } from "./queries";

/** App-wide data: settings, roles, today's date, counts. Always loaded by the root route. */
export function useBootstrap() {
  return useSuspenseQuery(bootstrapQuery()).data;
}

export function useRolesMap(): Map<string, Role> {
  const { data } = useQuery(bootstrapQuery());
  return useMemo(() => new Map((data?.roles ?? []).map((r) => [r.id, r])), [data?.roles]);
}

/**
 * Debounced autosave: calls `save` with the latest value `delay` ms after edits stop.
 * Only fires when the value differs from what was last saved (or the initial value),
 * so mounting (including React StrictMode's double effects) never triggers a save.
 * An edit still waiting when the component unmounts (sheet closed, next step) is saved then.
 */
export function useAutosave<T>(value: T, save: (v: T) => void, delay = 700, enabled = true) {
  const lastSaved = useRef(JSON.stringify(value));
  const unsaved = useRef<{ value: T; serialized: string } | null>(null);
  const [pending, setPending] = useState(false);
  const commit = useEffectEvent((u: { value: T; serialized: string }) => {
    unsaved.current = null;
    lastSaved.current = u.serialized;
    save(u.value);
  });
  useEffect(() => {
    const serialized = JSON.stringify(value);
    if (!enabled || serialized === lastSaved.current) {
      unsaved.current = null;
      setPending(false);
      return;
    }
    const u = { value, serialized };
    unsaved.current = u;
    setPending(true);
    const t = setTimeout(() => {
      commit(u);
      setPending(false);
    }, delay);
    return () => clearTimeout(t);
  }, [value, delay, enabled]);
  useEffect(
    () => () => {
      if (unsaved.current) commit(unsaved.current);
    },
    [],
  );
  return pending;
}

/** Re-renders every `ms` so time-based UI (now-line, timers) stays current. */
export function useNow(ms = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
