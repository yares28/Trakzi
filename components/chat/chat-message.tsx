"use client"

import { cn } from "@/lib/utils"
import { IconUser, IconSparkles } from "@tabler/icons-react"
import { motion } from "framer-motion"

interface ChatMessageProps {
  role: "user" | "assistant"
  content: string
  isStreaming?: boolean
  timestamp?: Date
}

export function ChatMessage({ role, content, isStreaming, timestamp }: ChatMessageProps) {
  const isUser = role === "user"

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex gap-3 py-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-purple-500 to-indigo-600 text-white"
        )}
      >
        {isUser ? (
          <IconUser className="h-4 w-4" />
        ) : (
          <IconSparkles className="h-4 w-4" />
        )}
      </div>

      {/* Message content */}
      <div
        className={cn(
          "flex flex-col max-w-[85%] md:max-w-[75%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-md"
              : "bg-muted text-foreground rounded-tl-md"
          )}
        >
          {/* Render content with basic formatting */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {content.split('\n').map((line, i) => (
              <p key={i} className={cn(
                "my-0",
                i > 0 && "mt-2"
              )}>
                {line || '\u00A0'}
              </p>
            ))}
          </div>
          
          {/* Streaming indicator */}
          {isStreaming && (
            <span className="inline-flex ml-1">
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="inline-block w-1.5 h-4 bg-current rounded-full"
              />
            </span>
          )}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <span className="text-[10px] text-muted-foreground mt-1 px-1">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </motion.div>
  )
}

