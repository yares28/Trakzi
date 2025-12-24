"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { safeCapture } from "@/lib/posthog-safe"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Orb } from "@/components/ui/orb"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion, type Variants } from "framer-motion"
import {
  IconLoader2,
  IconPlayerStop,
  IconTrash,
  IconBolt,
} from "@tabler/icons-react"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { PromptInput, PromptInputTextarea, PromptInputSubmit } from "@/components/ai-elements/prompt-input"
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning"
import { ChatMessage } from "@/components/chat/chat-message"
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
  "Show me my monthly spending trends",
  "Am I saving enough money?",
  "What patterns do you see in my transactions?",
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

function StatPill({ label, value, score }: { label: string; value: string; score?: number }) {
  const scoreColor = score !== undefined
    ? score >= 70 ? "text-green-500" : score >= 40 ? "text-yellow-500" : "text-red-500"
    : ""

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1 text-[11px] shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums font-medium", scoreColor || "text-foreground")}>{value}</span>
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

  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  const [orbColors, setOrbColors] = useState<[string, string]>(["#e78a53", "#e78a53"])

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const abortRef = useRef<AbortController | null>(null)
  const lastUserPromptRef = useRef<string>("")

  const searchParams = useSearchParams()
  const initialPromptSent = useRef(false)

  // Get user's currency setting
  const { currency } = useCurrency()

  // Hydrate from localStorage
  useEffect(() => {
    const hydrated = safeParseMessages(typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null)
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

  // Read theme primary for Orb
  useEffect(() => {
    const root = document.documentElement
    const primaryColor = getComputedStyle(root).getPropertyValue("--primary").trim()

    const convertOklchToHex = (oklchValue: string): string => {
      if (!oklchValue || !oklchValue.startsWith("oklch")) return "#e78a53"
      try {
        const tempEl = document.createElement("div")
        tempEl.style.color = oklchValue
        document.body.appendChild(tempEl)
        const rgb = window.getComputedStyle(tempEl).color
        document.body.removeChild(tempEl)

        const match = rgb.match(/\d+/g)
        if (match && match.length >= 3) {
          const r = parseInt(match[0]).toString(16).padStart(2, "0")
          const g = parseInt(match[1]).toString(16).padStart(2, "0")
          const b = parseInt(match[2]).toString(16).padStart(2, "0")
          return `#${r}${g}${b}`
        }
      } catch {
        // ignore
      }
      return "#e78a53"
    }

    const orange = convertOklchToHex(primaryColor) || "#e78a53"
    setOrbColors([orange, orange])
  }, [])

  // Load dashboard stats (all pages)
  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/dashboard-stats")
        if (res.ok) setStats(await res.json())
      } catch (e) {
        console.error("Failed to load stats:", e)
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
    setInput("")
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [stopStreaming])

  const buildPayload = useCallback((msgs: Message[]) => msgs.map((m) => ({ role: m.role, content: m.content })), [])

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
              setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: full } : m)))
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

      setInput("")
      setIsLoading(true)

      // Track AI chat message sent
      safeCapture('ai_chat_message_sent', {
        message_length: trimmed.length,
        message_word_count: trimmed.split(/\s+/).length,
        is_first_message: messagesRef.current.filter(m => m.role === 'user').length === 0,
      })

      const next = [...messagesRef.current, userMessage, assistantMessage]
      setMessages(next)

      try {
        await streamAssistant([...messagesRef.current, userMessage], assistantId)
      } catch (error: any) {
        const msg =
          error?.name === "AbortError"
            ? "Generation stopped."
            : error?.message || "Sorry, I encountered an error. Please try again."

        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: msg } : m)))
      } finally {
        abortRef.current = null
        setIsLoading(false)
        setIsStreaming(false)
        requestAnimationFrame(() => {
          textareaRef.current?.focus()
        })
      }
    },
    [isLoading, streamAssistant]
  )

  // Auto-send prompt from URL (from dashboard quick action chips)
  useEffect(() => {
    const promptFromUrl = searchParams.get("prompt")
    if (promptFromUrl && !initialPromptSent.current && !isLoadingStats) {
      initialPromptSent.current = true
      // Small delay to ensure component is fully mounted
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
      if (current[i].role === "assistant") {
        lastAssistantIndex = i
        break
      }
    }
    if (lastAssistantIndex === -1) return

    let lastUserIndex = -1
    for (let i = lastAssistantIndex - 1; i >= 0; i--) {
      if (current[i].role === "user") {
        lastUserIndex = i
        break
      }
    }
    if (lastUserIndex === -1) return

    const prompt = current[lastUserIndex].content
    lastUserPromptRef.current = prompt

    const baseConversation = current.slice(0, lastUserIndex + 1)

    const assistantId = crypto.randomUUID()
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    }

    setIsLoading(true)
    setIsStreaming(false)

    setMessages([...baseConversation, assistantMessage])

    try {
      await streamAssistant(baseConversation, assistantId)
    } catch (error: any) {
      const msg =
        error?.name === "AbortError"
          ? "Generation stopped."
          : error?.message || "Sorry, I encountered an error. Please try again."
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: msg } : m)))
    } finally {
      abortRef.current = null
      setIsLoading(false)
      setIsStreaming(false)
      requestAnimationFrame(() => {
        textareaRef.current?.focus()
      })
    }
  }, [isLoading, streamAssistant])

  const headerSubtitle = useMemo(() => {
    if (isLoadingStats) return "Loading your data..."
    if (!stats) return "No data available"
    // Combine transactions + receipt items
    const totalTransactions = stats.analytics.transactionCount || 0
    const receiptItems = stats.fridge.transactionCount || 0
    const total = totalTransactions + receiptItems
    return `${total.toLocaleString()} transactions analyzed`
  }, [stats, isLoadingStats])

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading])

  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].id
    }
    return null
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (canSend) sendMessage(input)
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-background via-background to-muted/15">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2">
          <motion.div
            className="h-64 w-[42rem] rounded-full bg-primary/10 blur-3xl"
            animate={{ y: [0, -12, 0], x: [0, 18, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="absolute -bottom-24 left-1/3 -translate-x-1/2">
          <motion.div
            className="h-64 w-[34rem] rounded-full bg-muted/30 blur-3xl"
            animate={{ y: [0, 14, 0], x: [0, -16, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Header */}
      <div className="shrink-0 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-2xl border bg-muted/30">
              <Orb
                colors={orbColors}
                agentState={isStreaming ? "talking" : null}
                className="h-full w-full"
              />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Financial Assistant</h2>
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
                  <IconBolt className="h-3 w-3" />
                  Trakzi AI
                </span>
              </div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                {isLoadingStats && <IconLoader2 className="h-3.5 w-3.5 animate-spin" />}
                {headerSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Transaction sources breakdown */}
            {stats && (
              <div className="hidden lg:flex items-center gap-2 pr-2 mr-1 border-r">
                <StatPill label="Spending" value={`${stats.analytics.transactionCount || 0}`} />
                <StatPill label="Receipts" value={`${stats.fridge.transactionCount || 0}`} />
              </div>
            )}

            {messages.length > 0 && (
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
            )}

            {isLoading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={stopStreaming}
                className="text-muted-foreground hover:text-foreground"
                title="Stop generating"
              >
                <IconPlayerStop className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Body with Conversation auto-scroll */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <Conversation className="flex-1">
          <ConversationContent className="mx-auto max-w-4xl">
            <AnimatePresence mode="wait" initial={false}>
              {messages.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ConversationEmptyState
                    icon={
                      <div className="h-16 w-16 overflow-hidden rounded-2xl">
                        <Orb colors={orbColors} className="h-full w-full" />
                      </div>
                    }
                    title="Ask anything about your finances"
                    description={
                      stats && stats.analytics.hasEnoughTransactions
                        ? "Get insights on categories, trends, and cashflow. Ask naturally—I'll do the analysis."
                        : "Import statements to unlock personalized insights and AI scores. You can still ask general questions in the meantime."
                    }
                  >
                    {/* Stats pills - show if user has enough transactions */}
                    {stats && stats.analytics.hasEnoughTransactions ? (
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        <StatPill label="Analytics" value={`${stats.analytics.score}%`} score={stats.analytics.score} />
                        <StatPill label="Savings" value={`${stats.savings.savingsRate}%`} score={stats.savings.score} />
                        <StatPill label="Fridge" value={`${stats.fridge.score}%`} score={stats.fridge.score} />
                      </div>
                    ) : (
                      <div className="mt-5 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 px-4 py-3 text-center">
                        <p className="text-sm text-muted-foreground">
                          🔒 <span className="font-medium">AI Scores Locked</span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground/80">
                          Import at least {stats?.analytics?.transactionCount ? `${100 - stats.analytics.transactionCount} more` : '100'} transactions to unlock personalized financial scores
                        </p>
                      </div>
                    )}

                    {/* Suggested questions */}
                    <motion.div
                      variants={suggestionList}
                      initial="hidden"
                      animate="show"
                      className="mt-6 flex flex-wrap justify-center gap-2"
                    >
                      {SUGGESTED_QUESTIONS.map((q) => (
                        <motion.button
                          key={q}
                          variants={suggestionItem}
                          onClick={() => sendMessage(q)}
                          disabled={isLoading}
                          className={cn(
                            "rounded-full border bg-background/60 px-4 py-2 text-xs font-medium shadow-sm",
                            "transition-all hover:-translate-y-0.5 hover:bg-muted/60 hover:border-primary/30 hover:shadow-md",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            "active:translate-y-0 active:scale-[0.99]",
                            "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                          )}
                        >
                          {q}
                        </motion.button>
                      ))}
                    </motion.div>
                  </ConversationEmptyState>
                </motion.div>
              ) : (
                <motion.div
                  key="messages"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="space-y-2"
                >
                  {messages.map((m) => {
                    const isLastAssistant = m.role === "assistant" && m.id === lastAssistantId
                    const showReasoning = isLastAssistant && (isLoading || isStreaming) && !m.content

                    return (
                      <div key={m.id}>
                        {/* Show Reasoning indicator for assistant while thinking */}
                        {showReasoning && (
                          <Reasoning isStreaming={isLoading || isStreaming} className="mb-2">
                            <ReasoningTrigger />
                            <ReasoningContent>
                              Analyzing your financial data and generating a response...
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Extra breathing room above footer */}
            <div className="h-6" />
          </ConversationContent>

          <ConversationScrollButton />
        </Conversation>

        {/* Sticky composer */}
        <div className="shrink-0 border-t bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputTextarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about spending, budgeting, categories, trends…"
                disabled={isLoading}
              />
              <PromptInputSubmit
                status={isLoading ? "streaming" : "ready"}
                disabled={!canSend}
                onClick={isLoading ? stopStreaming : undefined}
              />
            </PromptInput>
          </div>
        </div>
      </div>
    </div>
  )
}
