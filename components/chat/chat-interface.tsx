"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { safeCapture } from "@/lib/posthog-safe"
import { useSearchParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion, type Variants } from "framer-motion"
import { IconLoader2, IconTrash } from "@tabler/icons-react"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning"
import { ChatMessage } from "@/components/chat/chat-message"
import { ClaudeChatInput } from "@/components/claude-style-chat-input"
import { useCurrency } from "@/components/currency-provider"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface DashboardStats {
  analytics: { score: number; transactionCount: number; hasEnoughTransactions?: boolean }
  fridge: { score: number; transactionCount: number; hasEnoughTransactions?: boolean }
  savings: { score: number; savingsRate: number; transactionCount?: number }
  trends: { score: number; transactionCount?: number }
}

const STORAGE_KEY = "trakzi.chat.v1"

const SUGGESTED_QUESTIONS = [
  "What are my top spending categories?",
  "How can I reduce my expenses?",
  "Am I saving enough money?",
  "Show my monthly spending trends",
  "Where am I overspending?",
  "Give me a full budget review",
]

const suggestionList: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.06 } },
}

const suggestionItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 500, damping: 34, mass: 0.9 },
  },
}

function ScorePill({ label, value, score }: { label: string; value: string; score?: number }) {
  const scoreColor =
    score !== undefined
      ? score >= 70
        ? "text-green-500"
        : score >= 40
          ? "text-yellow-500"
          : "text-red-500"
      : ""

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums font-semibold", scoreColor || "text-foreground")}>{value}</span>
    </div>
  )
}

function safeParseMessages(raw: string | null): Message[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Array<Omit<Message, "timestamp"> & { timestamp: string }>
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }))
  } catch {
    return []
  }
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const messagesRef = useRef<Message[]>([])
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lastUserPromptRef = useRef<string>("")
  const searchParams = useSearchParams()
  const initialPromptSent = useRef(false)

  const { currency } = useCurrency()
  const { user } = useUser()
  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "there"

  // Hydrate from localStorage
  useEffect(() => {
    const hydrated = safeParseMessages(
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null
    )
    setMessages(hydrated)
  }, [])

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(messages.map((m) => ({ ...m, timestamp: m.timestamp.toISOString() })))
      )
    } catch {
      // ignore
    }
  }, [messages])

  // Load dashboard stats
  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/dashboard-stats")
        if (res.ok) setStats(await res.json())
      } catch {
        // ignore
      } finally {
        setIsLoadingStats(false)
      }
    }
    loadStats()
  }, [])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    setIsLoading(false)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [])

  const clearChat = useCallback(() => {
    stopStreaming()
    setMessages([])
    lastUserPromptRef.current = ""
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [stopStreaming])

  const buildPayload = useCallback(
    (msgs: Message[]) => msgs.map((m) => ({ role: m.role, content: m.content })),
    []
  )

  const streamAssistant = useCallback(
    async (baseMessages: Message[], assistantId: string) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: buildPayload(baseMessages), currency }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to get response")
      }

      setIsStreaming(true)

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let full = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split("\n")

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6)
          if (!data || data === "[DONE]") continue
          try {
            const parsed = JSON.parse(data)
            if (parsed?.content) {
              full += parsed.content
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: full } : m))
              )
            }
          } catch {
            // ignore malformed chunk
          }
        }
      }
    },
    [buildPayload, currency]
  )

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed || isLoading) return

      lastUserPromptRef.current = trimmed

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      }
      const assistantId = crypto.randomUUID()
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      }

      setIsLoading(true)

      safeCapture("ai_chat_message_sent", {
        message_length: trimmed.length,
        message_word_count: trimmed.split(/\s+/).length,
        is_first_message: messagesRef.current.filter((m) => m.role === "user").length === 0,
      })

      const next = [...messagesRef.current, userMessage, assistantMessage]
      setMessages(next)

      try {
        await streamAssistant([...messagesRef.current, userMessage], assistantId)
      } catch (error: unknown) {
        const msg =
          (error as Error)?.name === "AbortError"
            ? "Generation stopped."
            : (error as Error)?.message || "Sorry, I encountered an error. Please try again."
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: msg } : m)))
      } finally {
        abortRef.current = null
        setIsLoading(false)
        setIsStreaming(false)
        requestAnimationFrame(() => textareaRef.current?.focus())
      }
    },
    [isLoading, streamAssistant]
  )

  // Auto-send prompt from URL
  useEffect(() => {
    const promptFromUrl = searchParams.get("prompt")
    if (promptFromUrl && !initialPromptSent.current && !isLoadingStats) {
      initialPromptSent.current = true
      const timer = setTimeout(() => {
        sendMessage(decodeURIComponent(promptFromUrl))
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [searchParams, isLoadingStats, sendMessage])

  const regenerateLast = useCallback(async () => {
    if (isLoading) return
    const current = messagesRef.current

    let lastAssistantIndex = -1
    for (let i = current.length - 1; i >= 0; i--) {
      if (current[i].role === "assistant") { lastAssistantIndex = i; break }
    }
    if (lastAssistantIndex === -1) return

    let lastUserIndex = -1
    for (let i = lastAssistantIndex - 1; i >= 0; i--) {
      if (current[i].role === "user") { lastUserIndex = i; break }
    }
    if (lastUserIndex === -1) return

    const baseConversation = current.slice(0, lastUserIndex + 1)
    const assistantId = crypto.randomUUID()
    const assistantMessage: Message = { id: assistantId, role: "assistant", content: "", timestamp: new Date() }

    setIsLoading(true)
    setIsStreaming(false)
    setMessages([...baseConversation, assistantMessage])

    try {
      await streamAssistant(baseConversation, assistantId)
    } catch (error: unknown) {
      const msg =
        (error as Error)?.name === "AbortError"
          ? "Generation stopped."
          : (error as Error)?.message || "Sorry, I encountered an error. Please try again."
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: msg } : m)))
    } finally {
      abortRef.current = null
      setIsLoading(false)
      setIsStreaming(false)
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }, [isLoading, streamAssistant])

  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].id
    }
    return null
  }, [messages])

  const totalTransactions = useMemo(() => {
    if (!stats) return 0
    return (stats.analytics.transactionCount || 0) + (stats.fridge.transactionCount || 0)
  }, [stats])

  const isEmpty = messages.length === 0

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-background via-background to-muted/15">
      {/* Ambient background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2">
          <motion.div
            className="h-64 w-[42rem] rounded-full bg-primary/8 blur-3xl"
            animate={{ y: [0, -12, 0], x: [0, 18, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="absolute -bottom-24 left-1/3 -translate-x-1/2">
          <motion.div
            className="h-64 w-[34rem] rounded-full bg-muted/25 blur-3xl"
            animate={{ y: [0, 14, 0], x: [0, -16, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {isEmpty ? (
          /* ── EMPTY STATE ─ centered greeting layout ── */
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="flex flex-1 flex-col items-center justify-center px-4 py-8 overflow-y-auto"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.05 }}
              className="mb-5"
            >
              <Image
                src="/Trakzi/Trakziicon.png"
                alt="Trakzi"
                width={56}
                height={56}
                className="rounded-2xl"
                priority
              />
            </motion.div>

            {/* Greeting */}
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="mb-1 text-2xl font-semibold tracking-tight text-foreground"
            >
              Hello, {firstName}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="mb-6 text-sm text-muted-foreground"
            >
              Your AI finance advisor — ask anything about your money
            </motion.p>

            {/* Financial context panel */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="mb-6 w-full max-w-lg"
            >
              {isLoadingStats ? (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading your financial data…
                </div>
              ) : stats && stats.analytics.hasEnoughTransactions ? (
                <div className="rounded-2xl border bg-card/60 backdrop-blur p-4">
                  <p className="mb-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Your financial snapshot · {totalTransactions.toLocaleString()} transactions
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <ScorePill label="Spending health" value={`${stats.analytics.score}%`} score={stats.analytics.score} />
                    <ScorePill label="Savings rate" value={`${stats.savings.savingsRate}%`} score={stats.savings.score} />
                    <ScorePill label="Fridge score" value={`${stats.fridge.score}%`} score={stats.fridge.score} />
                    <ScorePill label="Transactions" value={totalTransactions.toLocaleString()} />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/20 px-5 py-4 text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    🔒 AI Scores Locked
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {stats
                      ? `Import ${Math.max(0, 100 - (stats.analytics.transactionCount || 0))} more transactions to unlock personalized scores`
                      : "Import transactions to unlock personalized financial scores"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground/50">
                    {totalTransactions > 0 ? `${totalTransactions} transactions imported so far` : "No transactions yet"}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Suggestion chips */}
            <motion.div
              variants={suggestionList}
              initial="hidden"
              animate="show"
              className="mb-8 flex flex-wrap justify-center gap-2 max-w-lg"
            >
              {SUGGESTED_QUESTIONS.map((q) => (
                <motion.button
                  key={q}
                  variants={suggestionItem}
                  onClick={() => {
                    safeCapture("quick_ai_prompt_clicked", {
                      prompt_text: q,
                      prompt_type: q.toLowerCase().includes("spending")
                        ? "top_expenses"
                        : q.toLowerCase().includes("trend")
                          ? "monthly_trends"
                          : q.toLowerCase().includes("saving")
                            ? "savings_check"
                            : "general",
                    })
                    sendMessage(q)
                  }}
                  disabled={isLoading}
                  className={cn(
                    "rounded-full border bg-background/70 px-4 py-2 text-xs font-medium shadow-sm",
                    "transition-all hover:-translate-y-0.5 hover:bg-muted/60 hover:border-primary/30 hover:shadow-md",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    "active:translate-y-0 active:scale-[0.99]",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  {q}
                </motion.button>
              ))}
            </motion.div>

            {/* Input — centered under the chips */}
            <div className="w-full max-w-2xl">
              <ClaudeChatInput
                ref={textareaRef}
                onSendMessage={sendMessage}
                onStop={stopStreaming}
                isLoading={isLoading}
              />
            </div>
          </motion.div>
        ) : (
          /* ── CONVERSATION STATE ── */
          <motion.div
            key="conversation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 flex-col min-h-0"
          >
            {/* Minimal conversation header */}
            <div className="shrink-0 border-b bg-background/70 backdrop-blur">
              <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Image
                    src="/Trakzi/Trakziicon.png"
                    alt="Trakzi"
                    width={28}
                    height={28}
                    className="rounded-lg"
                  />
                  <span className="text-sm font-medium text-foreground">Trakzi AI</span>
                  {stats && (
                    <span className="hidden sm:inline text-xs text-muted-foreground">
                      · {totalTransactions.toLocaleString()} transactions
                    </span>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="text-muted-foreground hover:text-destructive"
                  title="Clear chat"
                >
                  <IconTrash className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="relative flex min-h-0 flex-1 flex-col">
              <Conversation className="flex-1">
                <ConversationContent className="mx-auto max-w-4xl">
                  <div className="space-y-2">
                    {messages.map((m) => {
                      const isLastAssistant = m.role === "assistant" && m.id === lastAssistantId
                      const showReasoning = isLastAssistant && (isLoading || isStreaming) && !m.content

                      return (
                        <div key={m.id}>
                          {showReasoning && (
                            <Reasoning isStreaming={isLoading || isStreaming} className="mb-2">
                              <ReasoningTrigger />
                              <ReasoningContent>
                                Analyzing your financial data and generating a response…
                              </ReasoningContent>
                            </Reasoning>
                          )}
                          <ChatMessage
                            role={m.role}
                            content={m.content}
                            timestamp={m.timestamp}
                            isStreaming={isStreaming && m.role === "assistant" && m.id === lastAssistantId}
                            isThinking={isLoading && m.role === "assistant" && m.id === lastAssistantId && !m.content}
                            showRegenerate={isLastAssistant && !isLoading && messages.length > 1}
                            onRegenerate={regenerateLast}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="h-6" />
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>

              {/* Sticky input */}
              <div className="shrink-0 border-t bg-background/70 backdrop-blur">
                <div className="mx-auto max-w-4xl px-4 py-3">
                  <ClaudeChatInput
                    ref={textareaRef}
                    onSendMessage={sendMessage}
                    onStop={stopStreaming}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
