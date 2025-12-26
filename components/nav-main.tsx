"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconCirclePlusFilled } from "@tabler/icons-react"
import React, { useContext } from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { TransactionDialogContext } from "@/components/transaction-dialog-provider"

// Use a more flexible icon type that accepts any component
type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }> | React.ComponentType<React.ComponentProps<"div">>

export function NavMain({
  items,
  onQuickCreate,
}: {
  items: {
    title: string
    url: string
    icon?: IconComponent
  }[]
  onQuickCreate?: () => void
}) {
  const pathname = usePathname()
  const dialogContext = useContext(TransactionDialogContext)

  const handleQuickCreate = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // If onQuickCreate is provided (for backward compatibility), use it
    // Otherwise use the global dialog if available
    if (onQuickCreate) {
      onQuickCreate()
    } else if (dialogContext) {
      dialogContext.openDialog()
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Quick Create"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
              onClick={handleQuickCreate}
            >
              <IconCirclePlusFilled />
              <span>Quick Create</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = pathname === item.url || (item.url !== "/" && pathname?.startsWith(item.url))
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton tooltip={item.title} isActive={isActive} asChild>
                  <Link href={item.url} prefetch={false}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
