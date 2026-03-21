"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DocNavItem {
  title: string
  href: string
}

interface DocNavGroup {
  title: string
  items: DocNavItem[]
}

function getDocsNav(locale: "en" | "es"): DocNavGroup[] {
  if (locale === "es") {
    return [
      {
        title: "Para Empezar",
        items: [
          { title: "Introducción", href: "/es/docs" },
        ],
      },
      {
        title: "Guías",
        items: [
          { title: "Cómo Hacer un Presupuesto", href: "/es/docs/como-hacer-un-presupuesto" },
          { title: "Cómo Controlar Gastos", href: "/es/docs/como-controlar-gastos" },
          { title: "Dividir Gastos en un Piso", href: "/es/docs/como-dividir-gastos-piso" },
          { title: "Ahorro en Supermercado", href: "/es/docs/consejos-ahorro-supermercado" },
        ],
      },
      {
        title: "Comparaciones",
        items: [
          { title: "Trakzi vs YNAB", href: "/es/compare/trakzi-vs-ynab" },
          { title: "Trakzi vs Splitwise", href: "/es/compare/trakzi-vs-splitwise" },
          { title: "Trakzi vs Monarch", href: "/es/compare/trakzi-vs-monarch" },
        ],
      },
    ]
  }

  return [
    {
      title: "Getting Started",
      items: [
        { title: "Introduction", href: "/docs" },
      ],
    },
    {
      title: "Guides",
      items: [
        { title: "How to Budget Your Money", href: "/docs/how-to-budget-your-money" },
        { title: "How to Track Expenses", href: "/docs/how-to-track-expenses" },
        { title: "Split Bills With Roommates", href: "/docs/split-bills-with-roommates" },
        { title: "Grocery Budget Tips", href: "/docs/grocery-budget-tips" },
      ],
    },
    {
      title: "Comparisons",
      items: [
        { title: "Trakzi vs YNAB", href: "/compare/trakzi-vs-ynab" },
        { title: "Trakzi vs Splitwise", href: "/compare/trakzi-vs-splitwise" },
        { title: "Trakzi vs Monarch", href: "/compare/trakzi-vs-monarch" },
      ],
    },
  ]
}

export function DocsSidebar({ locale = "en" }: { locale?: "en" | "es" }) {
  const pathname = usePathname()
  const nav = getDocsNav(locale)

  return (
    <Sidebar collapsible="none" className="border-r border-border/50 bg-background/50 backdrop-blur-sm w-64 flex-shrink-0">
      <SidebarHeader className="border-b border-border/50 px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/Trakzi/TrakzilogoB.png" alt="Trakzi" className="h-6 w-auto" draggable={false} />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="flex-1">
          {nav.map((group) => (
            <SidebarGroup key={group.title} className="px-2 py-2">
              <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-zinc-500 px-2 mb-1">
                {group.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        className="text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 data-[active=true]:bg-zinc-800/50 data-[active=true]:text-[#e78a53]"
                      >
                        <Link href={item.href}>
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  )
}
