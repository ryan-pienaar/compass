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
    <div className="grid min-h-svh place-items-center p-6">
      <div className="max-w-sm text-center">
        <Compass className="mx-auto mb-4 size-10 text-muted-foreground" />
        <h1 className="compass-display text-3xl">Off the map</h1>
        <p className="mt-2 text-muted-foreground">That page doesn&apos;t exist. Let&apos;s get you back to what matters.</p>
        <Button className="mt-6" render={<Link to="/today" />}>
          Go to Today
        </Button>
      </div>
    </div>
  );
}

function RootError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className="grid min-h-svh place-items-center p-6">
      <div className="max-w-md text-center">
        <TriangleAlert className="mx-auto mb-4 size-10 text-destructive" />
        <h1 className="compass-display text-3xl">Something went wrong</h1>
        <p className="mt-2 break-words text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          If the app just started, the local server may still be starting. Your data is safe in the local database.
        </p>
        <div className="mt-6 flex justify-center gap-2">
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
