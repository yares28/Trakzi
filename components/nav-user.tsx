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
import { clearAllCachesOnLogout } from "@/lib/clear-cache-on-logout"


export function NavUser() {
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

  // Show demo user when in demo mode
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {isDemoMode ? (
          <div className="flex w-full items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
            {settingsButton}
            <SidebarMenuButton
              size="lg"
              className="w-auto flex-1 min-w-0 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center"
              onClick={exitDemo}
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                  D
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">Demo User</span>
                <span className="text-muted-foreground truncate text-xs">
                  Sign up free →
                </span>
              </div>
            </SidebarMenuButton>
          </div>
        ) : (
          <>
            <SignedOut>
              <div className="flex w-full items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
                {settingsButton}
                <SignInButton mode="redirect">
                  <SidebarMenuButton
                    size="lg"
                    className="w-auto flex-1 min-w-0 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">
                        <IconLogin className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate font-medium">Guest User</span>
                      <span className="text-muted-foreground truncate text-xs">
                        Click to login
                      </span>
                    </div>
                  </SidebarMenuButton>
                </SignInButton>
              </div>
            </SignedOut>

            <SignedIn>
              {isLoaded && user ? (
                <div className="flex w-full items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
                  {settingsButton}
                  {/* Custom dropdown for both mobile and desktop so sign out always clears caches */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex flex-1 min-w-0 items-center gap-2 p-2 rounded-lg hover:bg-sidebar-accent transition-colors group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center">
                        <Avatar className="h-8 w-8 rounded-lg">
                          <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
                          <AvatarFallback className="rounded-lg">
                            <IconUser className="size-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                          <span className="truncate font-medium">
                            {user.firstName || user.fullName || "User"}
                          </span>
                          <span className="text-muted-foreground truncate text-xs">
                            {user.primaryEmailAddress?.emailAddress || ""}
                          </span>
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="top"
                      align="start"
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
                <div className="flex w-full items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
                  {settingsButton}
                  <SidebarMenuButton size="lg" className="w-auto flex-1 min-w-0 group-data-[collapsible=icon]:flex-none">
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate font-medium">Loading...</span>
                    </div>
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
