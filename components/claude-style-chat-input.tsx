"use client"

import React, { useState, useRef, useEffect } from "react"
import { ArrowUp, Square } from "lucide-react"

interface ClaudeChatInputProps {
  onSendMessage: (message: string) => void
  onStop?: () => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
}

export const ClaudeChatInput = React.forwardRef<HTMLTextAreaElement, ClaudeChatInputProps>(
  ({ onSendMessage, onStop, isLoading = false, disabled = false, placeholder = "Ask about spending, budgets, categories…" }, ref) => {
    const [message, setMessage] = useState("")
    const internalRef = useRef<HTMLTextAreaElement>(null)
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) ?? internalRef

    // Auto-resize textarea
    useEffect(() => {
      const el = textareaRef.current
      if (el) {
        el.style.height = "auto"
        el.style.height = Math.min(el.scrollHeight, 384) + "px"
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
        if (isLoading) {
          onStop?.()
        } else {
          handleSend()
        }
      }
    }

    const hasContent = message.trim().length > 0

    return (
      <div className="relative w-full max-w-2xl mx-auto font-sans">
        <div className={`
          !box-content flex flex-col mx-2 md:mx-0 items-stretch transition-all duration-200 relative z-10 rounded-2xl cursor-text
          border border-bg-300 dark:border-transparent
          shadow-[0_0_15px_rgba(0,0,0,0.08)] hover:shadow-[0_0_20px_rgba(0,0,0,0.12)]
          focus-within:shadow-[0_0_25px_rgba(0,0,0,0.15)]
          bg-white dark:bg-[#30302E] antialiased
        `}>
          <div className="flex flex-col px-3 pt-3 pb-2 gap-2">
            {/* Textarea */}
            <div className="relative mb-1">
              <div className="max-h-96 w-full overflow-y-auto font-sans break-words transition-opacity duration-200 min-h-[2.5rem] pl-1">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  disabled={disabled}
                  className="w-full bg-transparent border-0 outline-none text-text-100 text-[16px] placeholder:text-text-400 resize-none overflow-hidden py-0 leading-relaxed block font-normal antialiased disabled:opacity-50"
                  rows={1}
                  style={{ minHeight: "1.5em" }}
                />
              </div>
            </div>

            {/* Action bar */}
            <div className="flex justify-end items-center">
              {isLoading ? (
                <button
                  onClick={onStop}
                  className="inline-flex items-center justify-center relative shrink-0 transition-colors h-8 w-8 rounded-xl active:scale-95 bg-accent text-bg-0 hover:bg-accent-hover shadow-md"
                  type="button"
                  aria-label="Stop generating"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!hasContent || disabled}
                  className={`
                    inline-flex items-center justify-center relative shrink-0 transition-colors h-8 w-8 rounded-xl active:scale-95
                    ${hasContent && !disabled
                      ? "bg-accent text-bg-0 hover:bg-accent-hover shadow-md"
                      : "bg-accent/30 text-bg-0/60 cursor-default"}
                  `}
                  type="button"
                  aria-label="Send message"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
)

ClaudeChatInput.displayName = "ClaudeChatInput"

export default ClaudeChatInput
