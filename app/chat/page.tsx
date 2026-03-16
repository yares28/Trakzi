import { auth } from "@clerk/nextjs/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { ChatInterface } from "@/components/chat/chat-interface"
import { DemoChatInterface } from "@/components/chat/demo-chat-interface"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { getUserSubscription } from "@/lib/subscriptions"
import { isDemoCookie } from "@/lib/demo/demo-server"

export default async function ChatPage() {
  // Check for demo mode first
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()
  const isDemo = isDemoCookie(cookieHeader)

  if (isDemo) {
    return (
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72 - 15px)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col overflow-hidden">
            <DemoChatInterface />
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  // Protect this page with Clerk authentication
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  // Check user's subscription
  const subscription = await getUserSubscription(userId)
  const plan = subscription?.plan ?? 'free'

  const isFree = plan === 'free'

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72 - 15px)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col overflow-hidden">
          <ChatInterface isFree={isFree} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
