"use client"
import { useEffect } from "react"
import { SignIn } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { useDemoMode } from "@/lib/demo/demo-context"

export default function SignInPage() {
  const { clearDemoMode } = useDemoMode()

  // Clear demo mode the moment the sign-in page mounts — no matter how the
  // user got here (direct link, OAuth redirect, back-navigation). This is the
  // definitive break between demo and a real account session.
  useEffect(() => {
    clearDemoMode()
  }, [clearDemoMode])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/50 to-background p-4">
      <SignIn
        forceRedirectUrl="/home"
        appearance={{
          baseTheme: dark,
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl border border-border/50",
          },
        }}
      />
    </div>
  )
}
