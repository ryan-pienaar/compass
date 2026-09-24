import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useTheme } from "@/components/theme";
import { useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { AppSidebar } from "@/components/app-sidebar";
import { AppStateProvider, useAppState } from "@/components/app-state";
import { CaptureDialog } from "@/components/capture-dialog";
import { CommandPalette } from "@/components/command-palette";
import { FocusMode } from "@/components/focus-mode";
import { IconButton } from "@/components/icon-button";
import { TaskSheet } from "@/components/task-sheet";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { useBootstrap } from "@/lib/hooks";
import { MOD_KEY } from "@/lib/platform";
import { bootstrapQuery } from "@/lib/queries";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context }) => {
    const boot = await context.queryClient.ensureQueryData(bootstrapQuery());
    if (!boot.settings.onboarded) throw redirect({ to: "/welcome" });
  },
  pendingComponent: () => (
    <div className="grid min-h-svh place-items-center">
      <Spinner />
    </div>
  ),
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppStateProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <TopBar />
          <Outlet />
        </SidebarInset>
        <CaptureDialog />
        <TaskSheet />
        <FocusMode />
        <CommandPalette />
        <GlobalHotkeys />
        <ThemeSync />
      </SidebarProvider>
    </AppStateProvider>
  );
}

/**
 * Translucent at every width. The hairline appears once the page scrolls: a 1px sentinel sits at the top of the
 * inset, and the bar gets `data-scrolled` when the sentinel leaves the viewport.
 */
function TopBar() {
  const { openCapture, setPaletteOpen } = useAppState();
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <>
      <div ref={sentinel} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" />
      <div
        data-scrolled={scrolled || undefined}
        className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-transparent bg-background/80 px-3 backdrop-blur-md backdrop-saturate-150 transition-colors duration-180 data-[scrolled]:border-border-subtle sm:px-4 lg:px-6"
      >
        <SidebarTrigger />
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden w-56 justify-start text-muted-foreground sm:inline-flex"
            onClick={() => setPaletteOpen(true)}
          >
            <Search />
            Search or jump to…
            <Kbd className="ml-auto">{MOD_KEY} K</Kbd>
          </Button>
          <IconButton label="Search" icon={<Search />} tooltipSide="bottom" className="sm:hidden" onClick={() => setPaletteOpen(true)} />
          <Button variant="outline" size="sm" onClick={() => openCapture()}>
            <Plus />
            Capture
            <Kbd className="hidden md:inline-flex">N</Kbd>
          </Button>
        </div>
      </div>
    </>
  );
}

function GlobalHotkeys() {
  const { openCapture, setPaletteOpen, paletteOpen } = useAppState();
  useHotkeys("n", (e) => {
    e.preventDefault();
    openCapture();
  });
  useHotkeys("mod+k", (e) => {
    e.preventDefault();
    setPaletteOpen(!paletteOpen);
  }, { enableOnFormTags: true }, [paletteOpen]);
  return null;
}

/** Applies the saved theme preference once settings load. */
function ThemeSync() {
  const { settings } = useBootstrap();
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme(settings.theme);
  }, [settings.theme, setTheme]);
  return null;
}
