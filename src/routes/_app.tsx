import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useTheme } from "@/components/theme";
import { useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { AppSidebar } from "@/components/app-sidebar";
import { AppStateProvider, useAppState } from "@/components/app-state";
import { CaptureDialog } from "@/components/capture-dialog";
import { CommandPalette } from "@/components/command-palette";
import { FocusMode } from "@/components/focus-mode";
import { TaskSheet } from "@/components/task-sheet";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { useBootstrap } from "@/lib/hooks";
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

function TopBar() {
  const { openCapture, setPaletteOpen } = useAppState();
  return (
    <div className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-backdrop-filter:bg-background/70 md:border-none md:bg-transparent md:backdrop-blur-none">
      <SidebarTrigger />
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" className="hidden text-muted-foreground sm:inline-flex" onClick={() => setPaletteOpen(true)}>
          <Search /> Search
          <Kbd className="ml-2">Ctrl K</Kbd>
        </Button>
        <Button size="sm" onClick={() => openCapture()}>
          <Plus /> Capture
        </Button>
      </div>
    </div>
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
