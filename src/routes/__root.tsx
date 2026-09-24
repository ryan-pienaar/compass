import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Link, Outlet, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { Compass, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => <Outlet />,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

function NotFound() {
  return (
    <div className="grid min-h-svh place-items-center bg-background p-6">
      <div className="max-w-md text-center">
        <div aria-hidden className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-muted">
          <Compass className="size-5 text-muted-foreground" />
        </div>
        <h1 className="voice-display text-3xl text-foreground">Off the map</h1>
        <p className="mt-2 text-md text-muted-foreground">That page doesn&apos;t exist. Let&apos;s get you back to what matters.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button render={<Link to="/today" />}>Go to Today</Button>
        </div>
      </div>
    </div>
  );
}

function RootError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className="grid min-h-svh place-items-center bg-background p-6">
      <div className="max-w-md text-center">
        {/* An error is not a destructive act: amber, never red. */}
        <div aria-hidden className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-warning-soft">
          <TriangleAlert className="size-5 text-warning" />
        </div>
        <h1 className="voice-display text-3xl text-foreground">Something went wrong</h1>
        <p className="mt-2 text-md text-muted-foreground">The problem is on our side. Try again in a moment.</p>
        <p className="mt-2 text-xs break-words text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              reset();
              void router.invalidate();
            }}
          >
            Try again
          </Button>
          <Button variant="outline" render={<Link to="/today" />}>
            Go to Today
          </Button>
        </div>
      </div>
    </div>
  );
}
