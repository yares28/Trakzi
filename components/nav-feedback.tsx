"use client"

import { IconMessageCircle } from "@tabler/icons-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavFeedback() {
  const pathname = usePathname()
  const isActive = pathname === "/feedback" || pathname.startsWith("/feedback/")

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="sm"
          tooltip="Feedback"
          aria-label="Feedback"
          isActive={isActive}
          asChild
        >
          <Link href="/feedback">
            <IconMessageCircle className="size-5" />
            <span className="group-data-[collapsible=icon]:hidden">Feedback</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
