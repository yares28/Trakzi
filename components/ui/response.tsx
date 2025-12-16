"use client"

import * as React from "react"
import { Streamdown } from "streamdown"
import { cn } from "@/lib/utils"

export interface ResponseProps extends React.ComponentProps<typeof Streamdown> {
    children?: string
    className?: string
}

/**
 * A memoized wrapper around Streamdown that renders streaming markdown
 * with smooth character-by-character animations.
 */
export const Response = React.memo(function Response({
    children,
    className,
    ...props
}: ResponseProps) {
    return (
        <Streamdown
            className={cn(
                "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                className
            )}
            {...props}
        >
            {children}
        </Streamdown>
    )
})

Response.displayName = "Response"
