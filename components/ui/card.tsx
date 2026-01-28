import * as React from "react"
import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  const finalClassName = cn(
    // Note: overflow-visible allows chart tooltips to extend beyond card boundaries
    // The rounded corners still work as they apply to the card's own border/background
    "text-card-foreground flex flex-col gap-6 rounded-xl border py-6 min-w-0",
    // Add visible shading for light mode to improve visibility
    "bg-muted/10 dark:bg-card",
    "shadow-md dark:shadow-sm",
    className
  )
  
  const cardRef = useRef<HTMLDivElement>(null)
  
  // #region agent log
  useEffect(() => {
    if (cardRef.current) {
      const computed = window.getComputedStyle(cardRef.current)
      const bgColor = computed.backgroundColor
      const hasBgMuted = finalClassName.includes('bg-muted')
      const hasBgCard = finalClassName.includes('bg-card')
      const parent = cardRef.current.parentElement
      const parentClasses = parent?.className || ''
      
      fetch('http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'card.tsx:Card',
          message: 'Card className and computed styles',
          data: {
            finalClassName,
            passedClassName: className,
            hasBgMuted,
            hasBgCard,
            computedBgColor: bgColor,
            parentClasses,
            parentTag: parent?.tagName,
            hasDataSlot: cardRef.current.hasAttribute('data-slot')
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'A,C,D'
        })
      }).catch(() => {})
    }
  }, [finalClassName, className])
  // #endregion

  return (
    <div
      ref={cardRef}
      data-slot="card"
      className={finalClassName}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
