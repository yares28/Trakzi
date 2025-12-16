"use client"

import * as React from "react"
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom"
import { Button } from "@/components/ui/button"
import { IconArrowDown } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface ConversationProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

export function Conversation({ children, className, ...props }: ConversationProps) {
    return (
        <StickToBottom
            className={cn("relative flex flex-1 flex-col overflow-y-auto", className)}
            {...props}
        >
            {children}
        </StickToBottom>
    )
}

interface ConversationContentProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

export function ConversationContent({ children, className, ...props }: ConversationContentProps) {
    return (
        <StickToBottom.Content className={cn("flex flex-1 flex-col gap-4 px-4 py-6", className)} {...props}>
            {children}
        </StickToBottom.Content>
    )
}

interface ConversationEmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string
    description?: string
    icon?: React.ReactNode
    children?: React.ReactNode
}

export function ConversationEmptyState({
    title = "No messages yet",
    description = "Start a conversation to see messages here",
    icon,
    children,
    className,
    ...props
}: ConversationEmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-1 flex-col items-center justify-center gap-4 text-center px-4",
                className
            )}
            {...props}
        >
            {icon && (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border bg-muted/50 text-muted-foreground">
                    {icon}
                </div>
            )}
            <div className="space-y-2">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
            </div>
            {children}
        </div>
    )
}

interface ConversationScrollButtonProps extends React.ComponentProps<typeof Button> { }

export function ConversationScrollButton({ className, ...props }: ConversationScrollButtonProps) {
    const { isAtBottom, scrollToBottom } = useStickToBottomContext()

    if (isAtBottom) return null

    return (
        <Button
            variant="secondary"
            size="icon"
            className={cn(
                "absolute bottom-4 right-4 z-10 rounded-full shadow-lg transition-all",
                "hover:shadow-xl hover:scale-105",
                className
            )}
            onClick={() => scrollToBottom()}
            {...props}
        >
            <IconArrowDown className="h-4 w-4" />
            <span className="sr-only">Scroll to bottom</span>
        </Button>
    )
}
