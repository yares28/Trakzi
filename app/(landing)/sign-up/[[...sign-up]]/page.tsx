"use client"
import { useEffect } from "react"
import { SignUp } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { useDemoMode } from "@/lib/demo/demo-context"

export default function SignUpPage() {
  const { clearDemoMode } = useDemoMode()

  useEffect(() => {
    clearDemoMode()
  }, [clearDemoMode])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/50 to-background p-4">
      <SignUp
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
