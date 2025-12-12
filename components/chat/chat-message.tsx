"use client"

import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useUser } from "@clerk/nextjs"

interface ChatMessageProps {
  role: "user" | "assistant"
  content: string
  isStreaming?: boolean
  timestamp?: Date
}

export function ChatMessage({
  role,
  content,
  isStreaming,
  timestamp,
}: ChatMessageProps) {
  const { user } = useUser()
  const isUser = role === "user"
  const displayName = isUser ? (user?.firstName || user?.fullName || "You") : "Trakzi AI"
  const avatarSrc = isUser ? (user?.imageUrl || undefined) : "/Trakzi/Trakziicon.png"

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-1 py-3"
    >
      <Message from={role} className="items-start">
        <MessageAvatar src={avatarSrc} name={displayName} />
        <MessageContent className="backdrop-blur supports-[backdrop-filter]:bg-opacity-90">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {content.split("\n").map((line, i) => (
              <p key={i} className={cn("my-0", i > 0 && "mt-2")}>
                {line || "\u00A0"}
              </p>
            ))}
          </div>

          {isStreaming && (
            <div className="flex items-center gap-2 text-xs text-primary-foreground/70 group-data-[from=assistant]/message:text-primary">
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="inline-block h-1.5 w-1.5 rounded-full bg-current"
              />
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                className="inline-block h-1.5 w-1.5 rounded-full bg-current"
              />
              <motion.span
                animate={{ opacity: [0.2, 0.8, 1, 0.8, 0.2] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: 0.35 }}
                className="inline-block h-1.5 w-1.5 rounded-full bg-current"
              />
            </div>
          )}
        </MessageContent>
      </Message>

      {timestamp && (
        <span
          className={cn(
            "block text-[10px] text-muted-foreground",
            isUser ? "text-right pr-12" : "text-left pl-12"
          )}
        >
          {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </motion.div>
  )
}

