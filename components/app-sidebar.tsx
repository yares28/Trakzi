"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconMessageChatbot,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react"
import { useTheme } from "next-themes"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Savings",
      url: "/savings",
      icon: IconListDetails,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: IconChartBar,
    },
    {
      title: "Trends",
      url: "/trends",
      icon: IconChartBar,
    },
    {
      title: "Chat",
      url: "/chat",
      icon: IconMessageChatbot,
    },
    {
      title: "Fridge",
      url: "/fridge",
      icon: IconCamera,
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "/data-library",
      icon: IconDatabase,
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onQuickCreate?: () => void
}

export function AppSidebar({ onQuickCreate, ...props }: AppSidebarProps) {
  const { theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const { state } = useSidebar()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <Sidebar
      collapsible="icon"
      style={
        {
          "--sidebar-width": "calc(16rem - 5px)",
          "--sidebar-width-icon": "calc(4.5rem - 5px)",
        } as React.CSSProperties
      }
      {...props}
    >
      <SidebarHeader className="flex items-center justify-center pr-[15px]">
        <SidebarMenu className="flex w-full items-center justify-center">
          <SidebarMenuItem className="w-auto h-auto">
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-4 !h-auto group-data-[collapsible=icon]:!p-3 group-data-[collapsible=icon]:!h-[4rem] group-data-[collapsible=icon]:!w-[4rem] group-data-[collapsible=icon]:!justify-center"
              aria-label="Home"
            >
              <Link href="/">
                <>
                  {mounted ? (
                    <Image
                      src={theme === "dark" ? "/Trakzi/TrakzilogoB.png" : "/Trakzi/Trakzilogo.png"}
                      alt="Trakzi"
                      width={180}
                      height={60}
                      className="hidden h-16 w-auto object-contain group-data-[state=expanded]:block"
                    />
                  ) : (
                    <div className="hidden h-16 w-[180px] group-data-[state=expanded]:block" />
                  )}
                  {mounted ? (
                    <Image
                      src="/Trakzi/Trakziicon.png"
                      alt="Trakzi icon"
                      width={64}
                      height={64}
                      className="hidden h-12 w-auto object-contain group-data-[state=collapsed]:block"
                    />
                  ) : (
                    <div className="hidden h-12 w-[64px] group-data-[state=collapsed]:block" />
                  )}
                </>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} onQuickCreate={onQuickCreate} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
