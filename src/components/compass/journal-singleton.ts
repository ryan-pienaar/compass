import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { todayISO } from "@shared/dates.ts";
import { api, call, type JournalEntry } from "@/lib/api";
import { useApiMutation } from "@/lib/mutations";
import { journalQuery } from "@/lib/queries";

/**
 * One evolving journal entry of a given kind (e.g. the tribute exercise):
 * created on first save, updated afterwards.
 */
export function useSingletonEntry(kind: string) {
  const { data, isLoading: loading, isFetchedAfterMount } = useQuery(journalQuery({ kind, limit: 1 }));
  // Saves skip invalidation, so the cache can lag behind the server: forms wait for a fetch made after mount.
  const isLoading = loading || !isFetchedAfterMount;
  const entry: JournalEntry | null = data?.[0] ?? null;
  const createdId = useRef<string | null>(null);
  const save = useApiMutation(
    async (payload: { body: string; data: Record<string, unknown>; title?: string }) => {
      const id = entry?.id ?? createdId.current;
      if (id) return call(api.journal[":id"].$patch({ param: { id }, json: payload }));
      const created = await call(api.journal.$post({ json: { ...payload, kind, date: todayISO() } }));
      createdId.current = created.id;
      return created;
    },
    { invalidate: false },
  );
  return { entry, isLoading, save };
}
