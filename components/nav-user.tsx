"use client"

import {
  IconLogin,
  IconLogout,
  IconUser,
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
import { clearAllCachesOnLogout } from "@/lib/clear-cache-on-logout"


export function NavUser() {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const { isMobile, setOpenMobile } = useSidebar()
  const { isDemoMode, exitDemo } = useDemoMode()

  const handleSignOut = async () => {
    if (isMobile) {
      setOpenMobile(false)
    }
    await clearAllCachesOnLogout()
    await signOut({ redirectUrl: "/" })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {isDemoMode ? (
          <SidebarMenuButton
            size="sm"
            tooltip="Exit demo — sign up free"
            aria-label="Exit demo"
            className="h-10 w-full"
            onClick={exitDemo}
          >
            <Avatar className="h-6 w-6 flex-shrink-0 rounded-md">
              <AvatarFallback className="rounded-md bg-gradient-to-br from-primary/70 to-primary text-primary-foreground text-[10px]">
                D
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col text-left group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-medium">Demo Mode</span>
              <span className="truncate text-xs text-muted-foreground">Click to exit</span>
            </div>
          </SidebarMenuButton>
        ) : (
          <>
            <SignedOut>
              <SignInButton mode="redirect">
                <SidebarMenuButton
                  size="sm"
                  tooltip="Sign in"
                  aria-label="Sign in"
                  className="h-10 w-full"
                >
                  <Avatar className="h-6 w-6 flex-shrink-0 rounded-md">
                    <AvatarFallback className="rounded-md">
                      <IconLogin className="size-[13px]" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm group-data-[collapsible=icon]:hidden">
                    Sign in
                  </span>
                </SidebarMenuButton>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              {isLoaded && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="sm"
                      aria-label={user.fullName || user.firstName || "Account"}
                      className="h-10 w-full"
                      tooltip={user.fullName || user.firstName || "Account"}
                    >
                      <Avatar className="h-6 w-6 flex-shrink-0 rounded-md">
                        <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
                        <AvatarFallback className="rounded-md">
                          <IconUser className="size-[13px]" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-1 flex-col text-left group-data-[collapsible=icon]:hidden">
                        <span className="truncate text-sm font-medium leading-none">
                          {user.fullName || user.firstName || "User"}
                        </span>
                        <span className="truncate text-xs leading-none text-muted-foreground mt-0.5">
                          {user.primaryEmailAddress?.emailAddress}
                        </span>
                      </div>
                    </SidebarMenuButton>
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
              ) : (
                <SidebarMenuButton size="sm" aria-label="Loading account" className="h-10 w-full">
                  <Avatar className="h-6 w-6 flex-shrink-0 rounded-md">
                    <AvatarFallback className="rounded-md animate-pulse" />
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 group-data-[collapsible=icon]:hidden">
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-2.5 w-32 animate-pulse rounded bg-muted" />
                  </div>
                </SidebarMenuButton>
              )}
            </SignedIn>
          </>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
