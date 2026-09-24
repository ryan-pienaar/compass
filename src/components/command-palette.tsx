import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CalendarCheck, Plus, Sun } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { useBootstrap } from "@/lib/hooks";
import { tasksQuery } from "@/lib/queries";
import { useAppState } from "./app-state";
import { QuadrantBadge } from "./badges";
import { NAV_GROUPS } from "./nav";

const PAGES = NAV_GROUPS.flatMap((g) => g.items);

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, openCapture, openTask } = useAppState();
  const navigate = useNavigate();
  const { weekStart, planTarget } = useBootstrap();
  const { data: tasks = [] } = useQuery({ ...tasksQuery({ view: "open" }), enabled: paletteOpen });

  const run = (fn: () => void) => {
    setPaletteOpen(false);
    fn();
  };

  return (
    <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen} title="Go anywhere" description="Search pages, actions and open tasks">
      <Command>
        <CommandInput placeholder="Search pages, actions and tasks…" />
        <CommandList>
          <CommandEmpty>Nothing found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => run(() => openCapture())}>
              <Plus /> Capture something
              <CommandShortcut className="pointer-coarse:hidden">N</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => run(() => navigate({ to: "/plan/$start", params: { start: planTarget ?? weekStart } }))}>
              <CalendarCheck /> Plan the week
            </CommandItem>
            <CommandItem onSelect={() => run(() => navigate({ to: "/today" }))}>
              <Sun /> Review today
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Pages">
            {PAGES.map((item) => (
              <CommandItem key={item.to} onSelect={() => run(() => navigate({ to: item.to }))}>
                <item.icon /> {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          {tasks.length > 0 && (
            <CommandGroup heading="Open tasks">
              {tasks.slice(0, 200).map((t) => (
                <CommandItem key={t.id} value={`task ${t.title} ${t.id}`} onSelect={() => run(() => openTask(t.id))}>
                  {/* Keeps titles aligned with the icon-led items above; a circle here would read as a done check. */}
                  <span aria-hidden className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  <QuadrantBadge q={t.quadrant} size="xs" className="ml-auto" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
        <CommandFooter className="pointer-coarse:hidden">
          <span className="inline-flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> to move
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>↵</Kbd> to open
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>Esc</Kbd> to close
          </span>
        </CommandFooter>
      </Command>
    </CommandDialog>
  );
}
