"use client"

import React, { useMemo, useState } from "react"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
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
      className="inline-block h-1.5 w-1.5 rounded-full bg-current"
      animate={{ opacity: [0.25, 0.85, 0.25], y: [0, -2, 0] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay }}
    />
  )
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1.5" aria-hidden="true">
      <TypingDot delay={0} />
      <TypingDot delay={0.15} />
      <TypingDot delay={0.3} />
    </span>
  )
}

/**
 * Lightweight markdown renderer (same as before but kept safe & minimal).
 */
function parseMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []

  let currentList: Array<{ text: string; indent: number }> = []
  let listType: "ul" | "ol" | null = null

  let inCodeBlock = false
  let codeBuffer: string[] = []
  let codeLang = ""

  let quoteBuffer: string[] = []

  const parseInlineMarkdown = (line: string): React.ReactNode => {
    const parts: React.ReactNode[] = []
    const segments = line.split(/(`[^`]+`)/g).filter(Boolean)

    let key = 0
    for (const seg of segments) {
      if (seg.startsWith("`") && seg.endsWith("`")) {
        parts.push(
          <code key={`code-${key++}`} className="rounded-md border bg-muted/40 px-1 py-0.5 font-mono text-[12px]">
            {seg.slice(1, -1)}
          </code>
        )
        continue
      }

      const boldRegex = /\*\*(.+?)\*\*/g
      let lastIndex = 0
      let match: RegExpExecArray | null
      let innerKey = 0

      while ((match = boldRegex.exec(seg)) !== null) {
        if (match.index > lastIndex) parts.push(seg.substring(lastIndex, match.index))
        parts.push(
          <strong key={`b-${key++}-${innerKey++}`} className="font-semibold text-foreground">
            {match[1]}
          </strong>
        )
        lastIndex = match.index + match[0].length
      }
      if (lastIndex < seg.length) parts.push(seg.substring(lastIndex))
    }

    return parts.length ? <>{parts}</> : line
  }

  const flushList = () => {
    if (!currentList.length || !listType) return
    const ListTag = listType === "ul" ? "ul" : "ol"

    const renderItems = (items: Array<{ text: string; indent: number }>, baseIndent = 0): React.ReactNode[] => {
      const out: React.ReactNode[] = []
      let i = 0

      while (i < items.length) {
        const item = items[i]
        const indent = item.indent - baseIndent
        if (indent !== 0) break

        const nested: Array<{ text: string; indent: number }> = []
        let j = i + 1
        while (j < items.length && items[j].indent > baseIndent) {
          nested.push(items[j])
          j++
        }

        out.push(
          <li key={`li-${baseIndent}-${i}`} className="text-sm leading-relaxed">
            {parseInlineMarkdown(item.text.trim())}
            {nested.length > 0 && (
              <ul className="ml-6 mt-2 list-disc space-y-2">
                {renderItems(
                  nested.map((n) => ({ ...n, indent: n.indent - 1 })),
                  baseIndent + 1
                )}
              </ul>
            )}
          </li>
        )
        i = nested.length ? j : i + 1
      }

      return out
    }

    elements.push(
      <ListTag
        key={`list-${elements.length}`}
        className={cn("ml-5 my-2 space-y-2", listType === "ul" ? "list-disc" : "list-decimal")}
      >
        {renderItems(currentList)}
      </ListTag>
    )

    currentList = []
    listType = null
  }

  const flushQuote = () => {
    if (!quoteBuffer.length) return

    elements.push(
      <blockquote
        key={`quote-${elements.length}`}
        className="my-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-foreground shadow-sm"
      >
        <div className="space-y-1 border-l-2 border-primary/30 pl-3">
          {quoteBuffer.map((line, i) => (
            <p key={`q-${i}`} className="text-sm leading-relaxed">
              {parseInlineMarkdown(line.trim())}
            </p>
          ))}
        </div>
      </blockquote>
    )

    quoteBuffer = []
  }

  const flushCode = () => {
    if (!codeBuffer.length) return
    const code = codeBuffer.join("\n")
    elements.push(
      <pre key={`code-${elements.length}`} className="my-3 overflow-x-auto rounded-xl border bg-muted/30 p-3 text-xs">
        <code data-lang={codeLang || undefined}>{code}</code>
      </pre>
    )
    codeBuffer = []
    codeLang = ""
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const raw = lines[lineIndex]
    const trimmed = raw.trim()

    const fence = trimmed.match(/^```(\w+)?\s*$/)
    if (fence) {
      flushList()
      flushQuote()
      if (!inCodeBlock) {
        inCodeBlock = true
        codeLang = fence[1] || ""
      } else {
        inCodeBlock = false
        flushCode()
      }
      continue
    }

    if (inCodeBlock) {
      codeBuffer.push(raw.replace(/\r$/, ""))
      continue
    }

    const quoteMatch = raw.match(/^\s*>\s?(.*)$/)
    if (quoteMatch) {
      flushList()
      quoteBuffer.push(quoteMatch[1] ?? "")
      continue
    } else {
      flushQuote()
    }

    if (!trimmed) {
      flushList()
      flushQuote()
      elements.push(<div key={`sp-${lineIndex}`} className="h-2" />)
      continue
    }

    const hrMatch = trimmed.match(/^(?:-{3,}|\*{3,}|_{3,})$/)
    if (hrMatch) {
      flushList()
      elements.push(<hr key={`hr-${lineIndex}`} className="my-3 border-border/70" />)
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      flushList()
      const level = headingMatch[1].length
      const title = headingMatch[2]

      const headingClass = cn(
        "mt-4 text-foreground",
        level === 1 && "text-base font-semibold tracking-tight",
        level === 2 && "text-sm font-semibold tracking-tight",
        level === 3 && "text-sm font-semibold",
        level >= 4 && "text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      )

      const HeadingTag = (level === 1 ? "h3" : level === 2 ? "h4" : level === 3 ? "h5" : "h6") as
        | "h3"
        | "h4"
        | "h5"
        | "h6"
      elements.push(
        <HeadingTag key={`h-${lineIndex}`} className={headingClass}>
          {parseInlineMarkdown(title.trim())}
        </HeadingTag>
      )
      continue
    }

    const ulMatch = raw.match(/^(\s*)[-*+]\s+(.+)$/)
    const olMatch = raw.match(/^(\s*)\d+\.\s+(.+)$/)

    if (ulMatch) {
      const indent = ulMatch[1].length
      if (listType !== "ul") {
        flushList()
        listType = "ul"
      }
      currentList.push({ text: ulMatch[2], indent })
      continue
    }

    if (olMatch) {
      const indent = olMatch[1].length
      if (listType !== "ol") {
        flushList()
        listType = "ol"
      }
      currentList.push({ text: olMatch[2], indent })
      continue
    }

    flushList()
    elements.push(
      <p key={`p-${lineIndex}`} className="text-sm leading-relaxed my-1.5">
        {parseInlineMarkdown(trimmed)}
      </p>
    )
  }

  flushList()
  flushQuote()
  if (inCodeBlock) flushCode()
  return elements.length ? elements : [<p key="empty">{"\u00A0"}</p>]
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

  const formattedContent = useMemo(() => {
    if (isUser) {
      return content.split("\n").map((line, i) => (
        <p key={i} className={cn("text-sm leading-relaxed my-1.5", !line.trim() && "h-2")}>
          {line || "\u00A0"}
        </p>
      ))
    }
    return parseMarkdown(content)
  }, [content, isUser])

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
      initial={{ opacity: 0, y: 10, x: isUser ? 10 : -10 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.9 }}
      className="group space-y-1 py-3"
    >
      <Message from={role} className="items-start">
        <MessageAvatar src={avatarSrc} name={displayName} />

        <MessageContent
          className={cn(
            "relative rounded-2xl backdrop-blur supports-[backdrop-filter]:bg-opacity-90",
            "group-data-[from=user]/message:ml-auto"
          )}
        >
          <div className="prose prose-sm dark:prose-invert max-w-none">{formattedContent}</div>

          {(isStreaming || isThinking) && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <TypingDots />
            </div>
          )}

          {/* Bottom action row (assistant only). Regenerate only for last assistant message */}
          {!isUser && content?.trim() && (
            <div className="mt-3 flex items-center justify-end gap-1 opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onCopy} title="Copy">
                {copied ? <IconCheck className="h-4 w-4" /> : <IconCopy className="h-4 w-4" />}
              </Button>

              {showRegenerate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onRegenerate}
                  title="Regenerate"
                >
                  <IconRefresh className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </MessageContent>
      </Message>

      {timestamp && (
        <span className={cn("block text-[10px] text-muted-foreground", isUser ? "text-right pr-12" : "text-left pl-12")}>
          {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </motion.div>
  )
}
