"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"
import { useDemoMode } from "@/lib/demo/demo-context"

export function DemoBanner() {
    const { isDemoMode, exitDemo } = useDemoMode()
    const pathname = usePathname()

    if (!isDemoMode || pathname === "/") return null

    return (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500/90 to-orange-500/90 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
            <span>
                🎯 You&apos;re exploring Trakzi with sample data.{" "}
                <Link
                    href="/sign-up"
                    className="underline underline-offset-2 hover:text-white/80 transition-colors font-semibold"
                    onClick={() => exitDemo()}
                >
                    Sign up free →
                </Link>
            </span>
            <button
                onClick={exitDemo}
                className="ml-2 rounded-full p-0.5 hover:bg-white/20 transition-colors"
                aria-label="Exit demo mode"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    )
}
