import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { LucideProvider } from "lucide-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/components/theme";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 0, retry: 1, refetchOnWindowFocus: true },
  },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  // Root cross-fade when the page changes (styled by ::view-transition-* in index.css). Search-param-only
  // navigations such as URL tabs don't animate. A hidden tab skips it: Chrome aborts transitions in a
  // hidden document and the rejection would go unhandled (returning false runs the update directly).
  defaultViewTransition: {
    types: ({ pathChanged }) => (pathChanged && document.visibilityState === "visible" ? ["nav"] : false),
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <LucideProvider strokeWidth={1.5} nonScalingStroke>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delay={300}>
            <AuthProvider onRedirect={(returnTo) => router.history.replace(returnTo)}>
              <RouterProvider router={router} />
            </AuthProvider>
            <Toaster position="bottom-right" closeButton />
          </TooltipProvider>
        </QueryClientProvider>
      </LucideProvider>
    </ThemeProvider>
  </StrictMode>,
);
