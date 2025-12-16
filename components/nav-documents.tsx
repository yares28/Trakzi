"use client"

import { usePathname } from "next/navigation"
import React from "react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

// Use a more flexible icon type that accepts any component
type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }>

export function NavDocuments({
  items,
}: {
  items: {
    name: string
    url: string
    icon: IconComponent
    items?: {
      name: string
      url: string
      icon?: IconComponent
    }[]
  }[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Documents</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = pathname === item.url || (item.url !== "/" && pathname?.startsWith(item.url))
          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton tooltip={item.name} isActive={isActive} asChild>
                <a href={item.url}>
                  <item.icon />
                  <span>{item.name}</span>
                </a>
              </SidebarMenuButton>
              {item.items?.length ? (
                <SidebarMenuSub>
                  {item.items.map((subItem) => {
                    const isSubActive = pathname === subItem.url
                    return (
                      <SidebarMenuSubItem key={subItem.name}>
                        <SidebarMenuSubButton asChild isActive={isSubActive}>
                          <a href={subItem.url}>
                            {subItem.icon && <subItem.icon />}
                            <span>{subItem.name}</span>
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )
                  })}
                </SidebarMenuSub>
              ) : null}
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
