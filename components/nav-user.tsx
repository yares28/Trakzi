"use client"

import {
  IconLogin,
  IconLogout,
  IconUser,
  IconSettings,
} from "@tabler/icons-react"
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useUser,
  useClerk,
} from "@clerk/nextjs"
import { useDemoMode } from "@/lib/demo/demo-context"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SettingsPanel } from "@/components/settings-panel"
import { DateFilter } from "@/components/date-filter"
import { clearAllCachesOnLogout } from "@/lib/clear-cache-on-logout"


interface NavUserProps {
  availableYears?: number[]
}

export function NavUser({ availableYears = [] }: NavUserProps) {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const { isMobile, setOpenMobile } = useSidebar()
  const { isDemoMode, exitDemo } = useDemoMode()

  // Handle sign out: clear Redis + Vercel + client caches, then sign out
  const handleSignOut = async () => {
    if (isMobile) {
      setOpenMobile(false)
    }
    await clearAllCachesOnLogout()
    await signOut({ redirectUrl: "/" })
  }

  const settingsButton = (
    <SettingsPanel>
      <SidebarMenuButton
        tooltip="Settings"
        size="lg"
        type="button"
        aria-label="Settings"
        className="w-12 flex-none justify-center group-data-[collapsible=icon]:w-10"
      >
        <IconSettings />
        <span className="sr-only">Settings</span>
      </SidebarMenuButton>
    </SettingsPanel>
  )

  // Time filter button — sized to match the Settings SidebarMenuButton so the
  // three footer actions (settings, time filter, user avatar) align neatly in
  // both open and collapsed (icon) states.
  const dateFilterButton = (
    <DateFilter
      availableYears={availableYears}
      triggerVariant="ghost"
      triggerSize="icon"
      triggerClassName="h-12 w-12 flex-none rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10"
    />
  )

  // Shared layout for the three-button footer row.
  // Open   → row, spaced evenly across full width (justify-between).
  // Icon   → stacked vertically, centered.
  const rowClassName =
    "flex w-full items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-start group-data-[collapsible=icon]:gap-1"

  // All three footer buttons share these dimensions so they align perfectly.
  const equalSizeClasses =
    "w-12 h-12 flex-none justify-center group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {isDemoMode ? (
          <div className={rowClassName}>
            {settingsButton}
            {dateFilterButton}
            <SidebarMenuButton
              size="lg"
              tooltip="Exit demo — sign up free"
              aria-label="Exit demo"
              className={equalSizeClasses}
              onClick={exitDemo}
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                  D
                </AvatarFallback>
              </Avatar>
              <span className="sr-only">Exit demo</span>
            </SidebarMenuButton>
          </div>
        ) : (
          <>
            <SignedOut>
              <div className={rowClassName}>
                {settingsButton}
                {dateFilterButton}
                <SignInButton mode="redirect">
                  <SidebarMenuButton
                    size="lg"
                    tooltip="Sign in"
                    aria-label="Sign in"
                    className={equalSizeClasses}
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">
                        <IconLogin className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="sr-only">Sign in</span>
                  </SidebarMenuButton>
                </SignInButton>
              </div>
            </SignedOut>

            <SignedIn>
              {isLoaded && user ? (
                <div className={rowClassName}>
                  {settingsButton}
                  {dateFilterButton}
                  {/* Custom dropdown for both mobile and desktop so sign out always clears caches */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={user.fullName || user.firstName || "Account"}
                        className="w-12 h-12 flex-none flex items-center justify-center rounded-md hover:bg-sidebar-accent transition-colors group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10"
                      >
                        <Avatar className="h-8 w-8 rounded-lg">
                          <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
                          <AvatarFallback className="rounded-lg">
                            <IconUser className="size-4" />
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="top"
                      align="end"
                      className="w-56"
                      sideOffset={8}
                    >
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {user.fullName || user.firstName || "User"}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.primaryEmailAddress?.emailAddress}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleSignOut}
                        className="text-destructive focus:text-destructive cursor-pointer"
                      >
                        <IconLogout className="mr-2 h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className={rowClassName}>
                  {settingsButton}
                  {dateFilterButton}
                  <SidebarMenuButton
                    size="lg"
                    aria-label="Loading account"
                    className={equalSizeClasses}
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg animate-pulse" />
                    </Avatar>
                    <span className="sr-only">Loading account</span>
                  </SidebarMenuButton>
                </div>
              )}
            </SignedIn>
          </>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
