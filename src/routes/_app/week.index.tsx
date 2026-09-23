import { createFileRoute, redirect } from "@tanstack/react-router";
import { bootstrapQuery } from "@/lib/queries";

export const Route = createFileRoute("/_app/week/")({
  beforeLoad: async ({ context }) => {
    const boot = await context.queryClient.ensureQueryData(bootstrapQuery());
    throw redirect({ to: "/week/$start", params: { start: boot.weekStart } });
  },
});
