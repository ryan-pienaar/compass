import { Link, useLocation } from "@tanstack/react-router";
import { CalendarCheck, LogOut, Monitor, Moon, Plus, Settings, Sun, UserRound } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { useTheme } from "@/components/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Kbd } from "@/components/ui/kbd";
import { api, call } from "@/lib/api";
import { useAccount } from "@/lib/auth";
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

  // Inbox is a plain count; a due check-in is an invitation, so it gets the attention tone.
  const badgeFor = (to: string): { count: number; attention: boolean } | null => {
    if (to === "/tasks" && counts.inbox > 0) return { count: counts.inbox, attention: false };
    if (to === "/stewardships" && counts.checkinsDue > 0) return { count: counts.checkinsDue, attention: true };
    return null;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3">
        <BrandMark
          size="sm"
          withName
          className="px-1 pt-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:*:data-[slot=brand-mark-name]:hidden"
        />
        <SidebarMenu className="gap-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              variant="outline"
              tooltip="Capture (N)"
              onClick={() => {
                closeOnMobile();
                openCapture();
              }}
              className="h-9"
            >
              <Plus />
              <span>Capture</span>
              <Kbd className="ml-auto group-data-[collapsible=icon]:hidden">N</Kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {planTarget && (
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Plan your week"
                render={<Link to="/plan/$start" params={{ start: planTarget }} onClick={closeOnMobile} />}
                isActive={pathname.startsWith("/plan")}
                className="h-auto min-h-12 items-start rounded-lg bg-primary-soft px-2.5 py-2 text-primary-soft-foreground pointer-coarse:h-auto hover:bg-[color-mix(in_oklab,var(--primary-soft),var(--primary)_12%)] hover:text-primary-soft-foreground data-active:bg-[color-mix(in_oklab,var(--primary-soft),var(--primary)_12%)] data-active:hover:bg-[color-mix(in_oklab,var(--primary-soft),var(--primary)_12%)] data-active:text-primary-soft-foreground data-active:shadow-none data-active:ring-0 group-data-[collapsible=icon]:min-h-0 [&>svg]:mt-0.5 [&>svg]:text-primary-soft-foreground data-active:[&>svg]:text-primary-soft-foreground group-data-[collapsible=icon]:[&>svg]:mt-0"
              >
                <CalendarCheck />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">Plan your week</span>
                  <span className="truncate text-xs font-normal text-primary-ink">
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
                    {badge != null && <SidebarMenuBadge attention={badge.attention}>{badge.count}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border-subtle">
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
          <AccountItem />
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

/** Who is signed in, with a way out. Hidden in local development (no Auth0). */
function AccountItem() {
  const account = useAccount();
  if (!account) return null;
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger render={<SidebarMenuButton tooltip={account.name} />}>
          {account.picture ? (
            <img src={account.picture} alt="" referrerPolicy="no-referrer" className="size-6 shrink-0 rounded-full ring-1 ring-edge group-data-[collapsible=icon]:-mx-1" />
          ) : (
            <UserRound />
          )}
          <span className="truncate">{account.name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{account.email ?? account.name}</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={account.signOut}>
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
