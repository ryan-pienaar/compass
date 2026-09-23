import { Link, useLocation } from "@tanstack/react-router";
import { CalendarCheck, Compass, Monitor, Moon, Plus, Settings, Sun } from "lucide-react";
import { useTheme } from "@/components/theme";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { api, call } from "@/lib/api";
import { formatWeekRange } from "@/lib/format";
import { useBootstrap } from "@/lib/hooks";
import { useApiMutation } from "@/lib/mutations";
import type { ThemePreference } from "@shared/settings.ts";
import { useAppState } from "./app-state";
import { NAV_GROUPS } from "./nav";

export function AppSidebar() {
  const { planTarget, weekStart, counts } = useBootstrap();
  const { pathname } = useLocation();
  const { openCapture } = useAppState();
  const { setOpenMobile, isMobile } = useSidebar();
  const closeOnMobile = () => isMobile && setOpenMobile(false);

  const badgeFor = (to: string) => {
    if (to === "/tasks" && counts.inbox > 0) return counts.inbox;
    if (to === "/stewardships" && counts.checkinsDue > 0) return counts.checkinsDue;
    return null;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3">
        <div className="flex items-center gap-2 px-1 pt-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-4.5" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="text-sm leading-tight font-semibold">Compass</div>
            <div className="truncate text-xs text-muted-foreground">Put first things first</div>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Capture (N)"
              onClick={() => {
                closeOnMobile();
                openCapture();
              }}
              className="border bg-background shadow-xs hover:bg-muted"
            >
              <Plus />
              <span>Capture</span>
              <kbd className="ml-auto rounded border px-1 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">N</kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {planTarget && (
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Plan your week"
                render={<Link to="/plan/$start" params={{ start: planTarget }} onClick={closeOnMobile} />}
                isActive={pathname.startsWith("/plan")}
                className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground data-active:bg-primary/90 data-active:text-primary-foreground"
              >
                <CalendarCheck />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span>Plan your week</span>
                  <span className="truncate text-[11px] opacity-80">
                    {planTarget === weekStart ? "This week" : "Next week"} · {formatWeekRange(planTarget)}
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const badge = badgeFor(item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      isActive={pathname === item.to || pathname.startsWith(`${item.to}/`)}
                      render={<Link to={item.to} onClick={closeOnMobile} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {badge != null && <SidebarMenuBadge>{badge}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings" isActive={pathname === "/settings"} render={<Link to="/settings" onClick={closeOnMobile} />}>
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <ThemeMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const save = useApiMutation((t: ThemePreference) => call(api.settings.$patch({ json: { theme: t } })));
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<SidebarMenuButton tooltip="Theme" />}>
        <Icon />
        <span>Theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="w-40">
        <DropdownMenuRadioGroup
          value={theme ?? "system"}
          onValueChange={(v) => {
            const t = v as ThemePreference;
            setTheme(t);
            save.mutate(t);
          }}
        >
          <DropdownMenuRadioItem value="light">
            <Sun /> Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon /> Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor /> System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
