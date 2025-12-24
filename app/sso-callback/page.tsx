"use client"

import { useEffect } from "react"
import { useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

export default function SSOCallback() {
  const { handleRedirectCallback } = useClerk()
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await handleRedirectCallback({
          afterSignInUrl: "/home",
          afterSignUpUrl: "/home",
        })
      } catch (err) {
        console.error("SSO callback error:", err)
        router.push("/sign-in")
      }
    }

    handleCallback()
  }, [handleRedirectCallback, router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#e78a53] mx-auto mb-4"></div>
        <p className="text-zinc-400">Completing sign in...</p>
      </div>
    </div>
  )
}


























