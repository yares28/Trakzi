"use client"

import React, { useState } from "react"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import { Response } from "@/components/ui/response"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { IconCheck, IconCopy, IconRefresh } from "@tabler/icons-react"

interface ChatMessageProps {
  role: "user" | "assistant"
  content: string
  isStreaming?: boolean
  isThinking?: boolean
  timestamp?: Date
  showRegenerate?: boolean
  onRegenerate?: () => void
}

function TypingDot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="inline-block h-1.5 w-1.5 rounded-full bg-primary"
      animate={{
        opacity: [0.3, 1, 0.3],
        scale: [0.8, 1.1, 0.8],
        y: [0, -3, 0]
      }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay }}
    />
  )
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1.5" aria-hidden="true">
      <TypingDot delay={0} />
      <TypingDot delay={0.2} />
      <TypingDot delay={0.4} />
    </span>
  )
}

// Animation variants for message containers
const messageVariants = {
  initial: (isUser: boolean) => ({
    opacity: 0,
    y: 20,
    x: isUser ? 30 : -30,
    scale: 0.95,
  }),
  animate: {
    opacity: 1,
    y: 0,
    x: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 350,
      damping: 30,
      mass: 0.8,
    },
  },
  exit: (isUser: boolean) => ({
    opacity: 0,
    x: isUser ? 20 : -20,
    transition: {
      duration: 0.2,
    },
  }),
}

const contentVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.3,
      delay: 0.1
    }
  },
}

export function ChatMessage({
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
  const displayName = isUser ? user?.firstName || user?.fullName || "You" : "Trakzi AI"
  const avatarSrc = isUser ? user?.imageUrl || undefined : "/Trakzi/Trakziicon.png"

  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(content || "")
      setCopied(true)
      window.setTimeout(() => setCopied(false), 900)
    } catch {
      // ignore
    }
  }

  return (
    <motion.div
      layout="position"
      custom={isUser}
      variants={messageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="group space-y-1 py-3"
    >
      <Message from={role} className="items-start">
        {/* Animated avatar entrance */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 20,
            delay: 0.1
          }}
        >
          <MessageAvatar src={avatarSrc} name={displayName} />
        </motion.div>

        <motion.div
          variants={contentVariants}
          initial="initial"
          animate="animate"
        >
          <MessageContent
            className={cn(
              "relative rounded-2xl backdrop-blur supports-[backdrop-filter]:bg-opacity-90",
              "group-data-[from=user]/message:ml-auto",
              // Add subtle shadow animation on hover
              "transition-shadow duration-300 hover:shadow-md"
            )}
          >
            {/* User messages: simple text with fade-in */}
            {isUser ? (
              <motion.div
                className="prose prose-sm dark:prose-invert max-w-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {content.split("\n").map((line, i) => (
                  <p key={i} className={cn("text-sm leading-relaxed my-1.5", !line.trim() && "h-2")}>
                    {line || "\u00A0"}
                  </p>
                ))}
              </motion.div>
            ) : (
              /* Assistant messages: use Response component for streaming markdown */
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <Response>{content}</Response>
              </div>
            )}

            {/* Animated typing indicator */}
            <AnimatePresence>
              {(isStreaming || isThinking) && (
                <motion.div
                  className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  <TypingDots />
                  <span className="text-[10px] text-muted-foreground/60">
                    {isThinking ? "Thinking..." : "Generating..."}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom action row (assistant only) - always visible at bottom-right */}
            {!isUser && content?.trim() && !isStreaming && !isThinking && (
              <motion.div
                className="absolute -bottom-5 right-2 flex items-center gap-1 rounded-full border bg-background/90 px-2 py-1 shadow-sm backdrop-blur"
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.3 }}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={onCopy}
                  title="Copy"
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <IconCheck className="h-3.5 w-3.5 text-green-500" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <IconCopy className="h-3.5 w-3.5" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>

                {showRegenerate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={onRegenerate}
                    title="Regenerate"
                  >
                    <IconRefresh className="h-3.5 w-3.5" />
                  </Button>
                )}
              </motion.div>
            )}
          </MessageContent>
        </motion.div>
      </Message>

      {/* Animated timestamp */}
      {timestamp && (
        <motion.span
          className={cn("block text-[10px] text-muted-foreground", isUser ? "text-right pr-12" : "text-left pl-12")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.2 }}
        >
          {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </motion.span>
      )}
    </motion.div>
  )
}
