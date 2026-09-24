import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType } from "hono/client";
import { toast } from "sonner";
import { api, call } from "./api";

interface Options<TVars, TData, TCtx> {
  /** Toast shown on success (string or builder). */
  success?: string | ((data: TData, vars: TVars) => string);
  onMutate?: (vars: TVars) => Promise<TCtx> | TCtx;
  onSuccess?: (data: TData, vars: TVars) => void;
  onError?: (error: Error, vars: TVars, ctx: TCtx | undefined) => void;
  /** Refetch everything afterwards (default). Local data is small, so this is cheap and never stale. */
  invalidate?: boolean;
}

export function useApiMutation<TVars, TData, TCtx = unknown>(
  fn: (vars: TVars) => Promise<TData>,
  opts: Options<TVars, TData, TCtx> = {},
) {
  const qc = useQueryClient();
  return useMutation<TData, Error, TVars, TCtx>({
    mutationFn: fn,
    onMutate: opts.onMutate,
    onSuccess: (data, vars) => {
      if (opts.success) toast.success(typeof opts.success === "function" ? opts.success(data, vars) : opts.success);
      opts.onSuccess?.(data, vars);
    },
    onError: (error, vars, ctx) => {
      toast.error(error.message || "Something went wrong");
      opts.onError?.(error, vars, ctx);
    },
    onSettled: () => {
      if (opts.invalidate !== false) void qc.invalidateQueries();
    },
  });
}

export type TaskCreate = InferRequestType<typeof api.tasks.$post>["json"];
export type TaskPatch = InferRequestType<(typeof api.tasks)[":id"]["$patch"]>["json"];
export type BlockCreate = InferRequestType<typeof api.blocks.$post>["json"];
export type BlockPatch = InferRequestType<(typeof api.blocks)[":id"]["$patch"]>["json"];
export type RescheduleReason = NonNullable<
  InferRequestType<(typeof api.tasks)[":id"]["reschedule"]["$post"]>["json"]["reason"]
>;

export function useTaskActions() {
  const create = useApiMutation((json: TaskCreate) => call(api.tasks.$post({ json })));
  const update = useApiMutation(({ id, ...json }: { id: string } & TaskPatch) =>
    call(api.tasks[":id"].$patch({ param: { id }, json })),
  );
  const remove = useApiMutation((id: string) => call(api.tasks[":id"].$delete({ param: { id } })), {
    success: "Deleted",
  });
  const prevent = useApiMutation(
    ({ id, title }: { id: string; title?: string }) => call(api.tasks[":id"].prevent.$post({ param: { id }, json: { title } })),
    { success: "Prevention step added to Quadrant II" },
  );
  const reschedule = useApiMutation(
    ({ id, ...json }: { id: string; toDate: string | null; reason?: RescheduleReason; note?: string }) =>
      call(api.tasks[":id"].reschedule.$post({ param: { id }, json })),
  );
  return { create, update, remove, prevent, reschedule };
}

export function useBlockActions() {
  const create = useApiMutation((json: BlockCreate) => call(api.blocks.$post({ json })));
  const update = useApiMutation(({ id, ...json }: { id: string } & BlockPatch) =>
    call(api.blocks[":id"].$patch({ param: { id }, json })),
  );
  const remove = useApiMutation((id: string) => call(api.blocks[":id"].$delete({ param: { id } })));
  return { create, update, remove };
}

/** Toggle done with an Undo toast, the kindest way to handle mis-clicks. */
export function useToggleDone() {
  const { update } = useTaskActions();
  return (task: { id: string; status: string; title: string }) => {
    const next = task.status === "done" ? "open" : "done";
    update.mutate(
      { id: task.id, status: next },
      {
        onSuccess: () => {
          if (next === "done") {
            toast.success(`Done: ${task.title}`, {
              action: { label: "Undo", onClick: () => update.mutate({ id: task.id, status: "open" }) },
              duration: 10_000,
            });
          }
        },
      },
    );
  };
}
