"use client"

import { useEffect, useState } from "react"
import { useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

export default function SSOCallback() {
  const { handleRedirectCallback } = useClerk()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // handleRedirectCallback processes the OAuth response
        // Clerk handles redirecting to afterSignInUrl/afterSignUpUrl automatically
        await handleRedirectCallback({
          afterSignInUrl: "/home",
          afterSignUpUrl: "/home",
        })
        // If we reach here without redirect, manually redirect after short delay
        // This handles edge cases where automatic redirect doesn't occur
        setTimeout(() => router.push("/home"), 1000)
      } catch (err: any) {
        console.error("SSO callback error:", err)
        const errorMessage = err?.errors?.[0]?.message || "Authentication failed"
        setError(errorMessage)
        setTimeout(() => router.push("/sign-in"), 3000)
      }
    }

    handleCallback()
  }, [handleRedirectCallback, router])

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-red-400 mb-4 text-lg">{error}</div>
          <p className="text-zinc-400 mb-4">Please try again or use a different sign-in method.</p>
          <p className="text-zinc-500 text-sm">Redirecting to sign in...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#e78a53] mx-auto mb-4"></div>
        <p className="text-zinc-400">Completing sign in...</p>
      </div>
    </div>
  )
}
