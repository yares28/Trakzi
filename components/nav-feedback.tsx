"use client"

import { IconBulb } from "@tabler/icons-react"
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
          tooltip="Feedback"
          aria-label="Feedback"
          isActive={isActive}
          asChild
        >
          <Link href="/feedback">
            <IconBulb />
            <span>Feedback</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
