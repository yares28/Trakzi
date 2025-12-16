"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Loader({ className, ...props }: LoaderProps) {
    return (
        <div
            className={cn(
                "flex items-center gap-1.5 px-4 py-3",
                className
            )}
            {...props}
        >
            <span className="sr-only">Loading...</span>
            <span className="inline-block h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="inline-block h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="inline-block h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
    )
}
