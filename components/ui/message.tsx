"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Orb } from "@/components/ui/orb"

type MessageProps = React.HTMLAttributes<HTMLDivElement> & {
  from: "user" | "assistant"
}

type MessageContentProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "contained" | "flat"
}

type MessageAvatarProps = React.ComponentPropsWithoutRef<typeof Avatar> & {
  src?: string
  name?: string
}

const Message = React.forwardRef<HTMLDivElement, MessageProps>(
  ({ from, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="message"
        data-from={from}
        className={cn(
          "group/message flex w-full gap-3 md:gap-4",
          from === "user" ? "flex-row-reverse text-right" : "flex-row text-left",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Message.displayName = "Message"

const MessageAvatar = React.forwardRef<HTMLDivElement, MessageAvatarProps>(
  ({ src, name, className, ...props }, ref) => {
    const fallbackText =
      name?.trim()?.slice(0, 2).toUpperCase() || "AI"
    
    // Check if this is an assistant avatar (Trakzi icon)
    const isAssistant = src === "/Trakzi/Trakziicon.png" || name === "Trakzi AI"
    
    // Get theme colors for orb
    const [orbColors, setOrbColors] = React.useState<[string, string]>(["#E78A53", "#4A90E2"])
    
    React.useEffect(() => {
      if (typeof window === "undefined") return
      const getComputedCssVariable = (variable: string) => {
        return getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
      }
      const primaryColor = getComputedCssVariable("--primary")
      const secondaryColor = getComputedCssVariable("--secondary")
      if (primaryColor && secondaryColor) {
        setOrbColors([primaryColor, secondaryColor])
      }
    }, [])

    return (
      <Avatar
        ref={ref}
        className={cn(
          "size-10 ring-2 ring-offset-2 ring-offset-background shadow-sm transition-colors overflow-hidden",
          "group-data-[from=user]/message:ring-primary/40 group-data-[from=user]/message:bg-primary group-data-[from=user]/message:text-primary-foreground",
          "group-data-[from=assistant]/message:ring-secondary/40 group-data-[from=assistant]/message:bg-muted/80 group-data-[from=assistant]/message:text-foreground",
          className
        )}
        {...props}
      >
        {isAssistant ? (
          <div className="size-full flex items-center justify-center" style={{ width: "40px", height: "40px" }}>
            <Orb 
              colors={orbColors}
              className="size-full"
            />
          </div>
        ) : (
          <>
            <AvatarImage src={src} alt={name} />
            <AvatarFallback
              className={cn(
                "font-semibold uppercase tracking-tight text-xs",
                "group-data-[from=user]/message:bg-primary group-data-[from=user]/message:text-primary-foreground",
                "group-data-[from=assistant]/message:bg-secondary/20 group-data-[from=assistant]/message:text-foreground dark:group-data-[from=assistant]/message:bg-secondary/10"
              )}
            >
              {fallbackText}
            </AvatarFallback>
          </>
        )}
      </Avatar>
    )
  }
)
MessageAvatar.displayName = "MessageAvatar"

const MessageContent = React.forwardRef<HTMLDivElement, MessageContentProps>(
  ({ variant = "contained", className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="message-content"
        data-variant={variant}
        className={cn(
          "relative inline-flex max-w-[min(720px,100%)] flex-col gap-2 whitespace-pre-wrap break-words rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm transition-colors",
          "group-data-[from=user]/message:text-white group-data-[from=assistant]/message:text-foreground",
          "group-data-[from=user]/message:items-end group-data-[from=assistant]/message:items-start",
          variant === "flat"
            ? "border-transparent bg-transparent p-0 shadow-none"
            : "group-data-[from=user]/message:bg-primary group-data-[from=user]/message:border-transparent group-data-[from=assistant]/message:bg-muted group-data-[from=assistant]/message:border-border dark:group-data-[from=assistant]/message:bg-muted/50",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
MessageContent.displayName = "MessageContent"

export { Message, MessageAvatar, MessageContent }

