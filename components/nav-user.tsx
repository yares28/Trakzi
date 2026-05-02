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
import { AccountFilter } from "@/components/account-filter"
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
        size="sm"
        type="button"
        aria-label="Settings"
        className="w-9 h-9 flex-none justify-center group-data-[collapsible=icon]:w-[26px] group-data-[collapsible=icon]:h-[26px]"
      >
        <IconSettings className="size-[15px]" />
        <span className="sr-only">Settings</span>
      </SidebarMenuButton>
    </SettingsPanel>
  )

  const dateFilterButton = (
    <DateFilter
      availableYears={availableYears}
      triggerVariant="ghost"
      triggerSize="icon"
      triggerClassName="h-9 w-9 flex-none rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:h-[26px] group-data-[collapsible=icon]:w-[26px]"
    />
  )

  const accountFilterButton = (
    <AccountFilter
      triggerVariant="ghost"
      triggerSize="icon"
      triggerClassName="h-9 w-9 flex-none rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:h-[26px] group-data-[collapsible=icon]:w-[26px]"
    />
  )

  // Expanded: utility icons grouped left, avatar right.
  // Icon mode: 2×2 grid so the footer stays compact.
  const rowClassName =
    "flex w-full items-center justify-between gap-1 group-data-[collapsible=icon]:grid group-data-[collapsible=icon]:grid-cols-2 group-data-[collapsible=icon]:justify-items-center group-data-[collapsible=icon]:gap-[3px]"

  const utilGroupClassName =
    "flex items-center gap-1 group-data-[collapsible=icon]:contents"

  const equalSizeClasses =
    "w-9 h-9 flex-none justify-center group-data-[collapsible=icon]:w-[26px] group-data-[collapsible=icon]:h-[26px]"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {isDemoMode ? (
          <div className={rowClassName}>
            <div className={utilGroupClassName}>
              {settingsButton}
              {dateFilterButton}
              {accountFilterButton}
            </div>
            <SidebarMenuButton
              size="sm"
              tooltip="Exit demo — sign up free"
              aria-label="Exit demo"
              className={equalSizeClasses}
              onClick={exitDemo}
            >
              <Avatar className="h-6 w-6 rounded-md">
                <AvatarFallback className="rounded-md bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[10px]">
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
                <div className={utilGroupClassName}>
                  {settingsButton}
                  {dateFilterButton}
                  {accountFilterButton}
                </div>
                <SignInButton mode="redirect">
                  <SidebarMenuButton
                    size="sm"
                    tooltip="Sign in"
                    aria-label="Sign in"
                    className={equalSizeClasses}
                  >
                    <Avatar className="h-6 w-6 rounded-md">
                      <AvatarFallback className="rounded-md">
                        <IconLogin className="size-[13px]" />
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
                  <div className={utilGroupClassName}>
                    {settingsButton}
                    {dateFilterButton}
                    {accountFilterButton}
                  </div>
                  {/* Custom dropdown for both mobile and desktop so sign out always clears caches */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={user.fullName || user.firstName || "Account"}
                        className="w-9 h-9 flex-none flex items-center justify-center rounded-md hover:bg-sidebar-accent transition-colors group-data-[collapsible=icon]:w-[26px] group-data-[collapsible=icon]:h-[26px]"
                      >
                        <Avatar className="h-6 w-6 rounded-md">
                          <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
                          <AvatarFallback className="rounded-md">
                            <IconUser className="size-[13px]" />
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
                  <div className={utilGroupClassName}>
                    {settingsButton}
                    {dateFilterButton}
                    {accountFilterButton}
                  </div>
                  <SidebarMenuButton
                    size="sm"
                    aria-label="Loading account"
                    className={equalSizeClasses}
                  >
                    <Avatar className="h-6 w-6 rounded-md">
                      <AvatarFallback className="rounded-md animate-pulse" />
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
