import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { ChatInterface } from "@/components/chat/chat-interface"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { getUserSubscription } from "@/lib/subscriptions"
import { Lock, ArrowLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function ChatPage() {
  // Protect this page with Clerk authentication
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  // Check user's subscription
  const subscription = await getUserSubscription(userId)
  const plan = subscription?.plan ?? 'free'

  // Free users cannot access chat
  if (plan === 'free') {
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
          <div className="flex flex-1 flex-col items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <Lock className="w-10 h-10 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold mb-3">Chat Requires an Upgrade</h1>
              <p className="text-muted-foreground mb-8">
                AI Chat is available on all plans. Free users get 10 messages per week. Upgrade to Pro or Max for more.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild variant="outline">
                  <Link href="/home">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go Back
                  </Link>
                </Button>
                <Button asChild className="bg-gradient-to-r from-primary to-primary/80">
                  <Link href="/dashboard">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Upgrade Plan
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

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
          <ChatInterface />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
