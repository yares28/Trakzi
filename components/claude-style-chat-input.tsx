"use client"

import React, { useState, useRef, useEffect } from "react"
import { ArrowUp, Square } from "lucide-react"
import { cn } from "@/lib/utils"

interface ClaudeChatInputProps {
  onSendMessage: (message: string) => void
  onStop?: () => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}

export const ClaudeChatInput = React.forwardRef<HTMLTextAreaElement, ClaudeChatInputProps>(
  (
    {
      onSendMessage,
      onStop,
      isLoading = false,
      disabled = false,
      placeholder = "Ask about spending, budgets, categories…",
      className,
    },
    ref
  ) => {
    const [message, setMessage] = useState("")
    const internalRef = useRef<HTMLTextAreaElement>(null)
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) ?? internalRef

    useEffect(() => {
      const el = textareaRef.current
      if (el) {
        el.style.height = "auto"
        el.style.height = Math.min(el.scrollHeight, 320) + "px"
      }
    }, [message, textareaRef])

    const handleSend = () => {
      const trimmed = message.trim()
      if (!trimmed || isLoading || disabled) return
      onSendMessage(trimmed)
      setMessage("")
      if (textareaRef.current) textareaRef.current.style.height = "auto"
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        if (isLoading) onStop?.()
        else handleSend()
      }
    }

    const hasContent = message.trim().length > 0

    return (
      /* Liquid glass container */
      <div className={cn("relative isolate w-full", className)}>
        {/* Glossy shimmer */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/30 via-white/10 to-transparent dark:from-white/8 dark:to-transparent z-10" />

        {/* Glass box */}
        <div
          className={cn(
            "relative flex flex-col gap-1.5 px-4 pt-3.5 pb-3",
            "rounded-2xl",
            "backdrop-blur-2xl",
            "bg-white/85 dark:bg-[#1e1e1e]/80",
            "border border-black/[0.07] dark:border-white/[0.08]",
            "shadow-[0_4px_30px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.05)]",
            "dark:shadow-[0_4px_30px_rgba(0,0,0,0.4),0_1px_3px_rgba(0,0,0,0.2)]",
            "transition-shadow duration-200",
            "focus-within:shadow-[0_6px_36px_rgba(0,0,0,0.13),0_2px_6px_rgba(0,0,0,0.06)]",
            "dark:focus-within:shadow-[0_6px_36px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.3)]"
          )}
        >
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none bg-transparent border-0 outline-none",
              "text-[15px] leading-relaxed",
              "text-foreground placeholder:text-muted-foreground/60",
              "disabled:opacity-50",
              "max-h-80 overflow-y-auto"
            )}
            style={{ minHeight: "1.5em" }}
          />

          {/* Action row */}
          <div className="flex items-center justify-end">
            {isLoading ? (
              <button
                onClick={onStop}
                type="button"
                aria-label="Stop generating"
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-xl",
                  "bg-primary text-white",
                  "hover:bg-primary/90 active:scale-95",
                  "transition-all duration-150 shadow-sm"
                )}
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!hasContent || disabled}
                type="button"
                aria-label="Send message"
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-xl",
                  "transition-all duration-150 active:scale-95",
                  hasContent && !disabled
                    ? "bg-primary text-white hover:bg-primary/90 shadow-sm"
                    : "bg-muted text-muted-foreground/40 cursor-default"
                )}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
)

ClaudeChatInput.displayName = "ClaudeChatInput"

export default ClaudeChatInput
