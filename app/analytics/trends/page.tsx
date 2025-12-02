"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AnalyticsTrendsRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace("/trends")
  }, [router])
  
  return null
}

