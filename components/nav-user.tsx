"use client"

import {
  IconLogin,
} from "@tabler/icons-react"
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/nextjs"

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavUser() {
  const { user, isLoaded } = useUser()

  // Show sign-in button when not authenticated
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SignedOut>
          <SignInButton mode="redirect">
            <SidebarMenuButton size="lg" className="w-full">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg">
                  <IconLogin className="size-4" />
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Guest User</span>
                <span className="text-muted-foreground truncate text-xs">
                  Click to login
                </span>
              </div>
            </SidebarMenuButton>
          </SignInButton>
        </SignedOut>

        <SignedIn>
          {isLoaded && user ? (
            <div className="flex items-center w-full gap-2 p-2">
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8 rounded-lg",
                    userButtonPopoverCard: "shadow-lg",
                  },
                }}
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {user.firstName || user.fullName || "User"}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.primaryEmailAddress?.emailAddress || ""}
                </span>
              </div>
            </div>
          ) : (
            <SidebarMenuButton size="lg" className="w-full">
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Loading...</span>
              </div>
            </SidebarMenuButton>
          )}
        </SignedIn>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
