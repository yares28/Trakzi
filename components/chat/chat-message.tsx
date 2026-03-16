"use client"

import React, { memo, useMemo, useState } from "react"
import Image from "next/image"
import { Response } from "@/components/ui/response"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useUser } from "@clerk/nextjs"
import { Check, Copy, RefreshCw } from "lucide-react"
import { parseChartContent, hasChartMarkers } from "@/lib/chat/parse-chart-spec"
import { ChatBubbleChart } from "@/components/chat/chat-bubble-chart"

/** Renders streaming text token-by-token with a smooth blur-to-clear fade-in. */
function StreamingText({ content }: { content: string }) {
  const tokens = useMemo(() => content.split(/(\s+)/), [content])
  return (
    // overflow-x:hidden clips the blur bleed that causes horizontal scrollbars
    <span className="whitespace-pre-wrap break-words block overflow-x-hidden">
      {tokens.map((token, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, filter: "blur(6px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {token}
        </motion.span>
      ))}
    </span>
  )
}

interface ChatMessageProps {
  role: "user" | "assistant"
  content: string
  isStreaming?: boolean
  isThinking?: boolean
  timestamp?: Date
  showRegenerate?: boolean
  onRegenerate?: () => void
}

/** Renders AI response content, splitting out any embedded chart markers. */
function RenderedContent({ content }: { content: string }) {
  const parsed = useMemo(() => {
    if (!hasChartMarkers(content)) return null
    return parseChartContent(content)
  }, [content])

  if (!parsed) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-2">
        <Response>{content}</Response>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {parsed.segments.map((seg, i) => {
        if (seg.kind === "chart") {
          return <ChatBubbleChart key={i} spec={seg.spec} />
        }
        if (!seg.text.trim()) return null
        return (
          <div key={i} className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-2">
            <Response>{seg.text}</Response>
          </div>
        )
      })}
    </div>
  )
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] py-0.5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: "1s" }}
        />
      ))}
    </span>
  )
}

export const ChatMessage = memo(function ChatMessage({
  role,
  content,
  isStreaming,
  isThinking,
  timestamp,
  showRegenerate,
  onRegenerate,
}: ChatMessageProps) {
  const { user } = useUser()
  const isUser = role === "user"
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(content || "")
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // ignore
    }
  }

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 32, mass: 0.7 }}
      className={cn(
        "group flex gap-2.5 px-1",
        isUser ? "flex-row-reverse items-end" : "flex-row items-start"
      )}
    >
      {/* Avatar */}
      <div className="shrink-0 mb-0.5">
        {isUser ? (
          user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt="You"
              className="h-7 w-7 rounded-full object-cover ring-1 ring-border/40"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-semibold text-primary">
              {(user?.firstName?.[0] || "Y").toUpperCase()}
            </div>
          )
        ) : (
          <Image
            src="/Trakzi/Trakziicon.png"
            alt="Trakzi AI"
            width={28}
            height={28}
            className="rounded-xl"
          />
        )}
      </div>

      {/* Bubble + actions */}
      <div className={cn("flex flex-col gap-1 min-w-0", isUser ? "items-end" : "items-start", "max-w-[78%]")}>
        {/* Bubble */}
        <div
          className={cn(
            "relative px-3.5 py-2.5 text-[14px] leading-relaxed",
            isUser
              ? [
                  "bg-primary text-primary-foreground",
                  "rounded-2xl rounded-br-sm",
                  "shadow-sm",
                ]
              : [
                  "bg-muted/70 text-foreground",
                  "rounded-2xl rounded-bl-sm",
                  "border border-border/30",
                ]
          )}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap break-words">{content}</span>
          ) : isThinking ? (
            <TypingDots />
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              {isStreaming && content ? (
                <motion.div
                  key="streaming"
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                >
                  <StreamingText content={content} />
                </motion.div>
              ) : (
                <motion.div
                  key="settled"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <RenderedContent content={content} />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Timestamp + actions row — shown on hover */}
        <div
          className={cn(
            "flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
            isUser ? "flex-row-reverse" : "flex-row",
            "px-1"
          )}
        >
          {timestamp && (
            <span className="text-[10px] text-muted-foreground/50 tabular-nums">
              {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}

          {!isUser && content?.trim() && !isStreaming && !isThinking && (
            <>
              <button
                onClick={onCopy}
                title="Copy"
                className="flex items-center justify-center h-5 w-5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Check className="h-3 w-3 text-green-500" />
                    </motion.span>
                  ) : (
                    <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Copy className="h-3 w-3" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {showRegenerate && (
                <button
                  onClick={onRegenerate}
                  title="Regenerate"
                  className="flex items-center justify-center h-5 w-5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
})

ChatMessage.displayName = "ChatMessage"
