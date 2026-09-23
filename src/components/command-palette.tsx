import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CalendarCheck, Plus, Sun } from "lucide-react";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { useBootstrap } from "@/lib/hooks";
import { tasksQuery } from "@/lib/queries";
import { useAppState } from "./app-state";
import { QuadrantBadge } from "./badges";
import { NAV_GROUPS } from "./nav";

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
              <CommandShortcut>N</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => run(() => navigate({ to: "/plan/$start", params: { start: planTarget ?? weekStart } }))}>
              <CalendarCheck /> Plan the week
            </CommandItem>
            <CommandItem onSelect={() => run(() => navigate({ to: "/today" }))}>
              <Sun /> Review today
            </CommandItem>
          </CommandGroup>
          {NAV_GROUPS.map((g) => (
            <CommandGroup key={g.label} heading={g.label}>
              {g.items.map((item) => (
                <CommandItem key={item.to} onSelect={() => run(() => navigate({ to: item.to }))}>
                  <item.icon /> {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          {tasks.length > 0 && (
            <CommandGroup heading="Open tasks">
              {tasks.slice(0, 200).map((t) => (
                <CommandItem key={t.id} value={`task ${t.title} ${t.id}`} onSelect={() => run(() => openTask(t.id))}>
                  <QuadrantBadge q={t.quadrant} size="xs" />
                  <span className="truncate">{t.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
