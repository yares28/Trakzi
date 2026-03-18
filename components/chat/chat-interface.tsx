"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { safeCapture } from "@/lib/posthog-safe"
import { useSearchParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion, type Variants } from "framer-motion"
import { IconLoader2, IconTrash } from "@tabler/icons-react"
import Link from "next/link"
import { Save, History } from "lucide-react"
import { ChatMessage } from "@/components/chat/chat-message"
import { ClaudeChatInput } from "@/components/claude-style-chat-input"
import { ChatHistorySheet } from "@/components/chat/chat-history-sheet"
import { useCurrency } from "@/components/currency-provider"
import { getAnomalyChips, type AnomalyChip } from "@/lib/chat/anomaly-chips"
import { shouldShowWeeklyDigest, markWeeklyDigestShown, WEEKLY_DIGEST_PROMPT } from "@/lib/chat/weekly-digest"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface DashboardStats {
  analytics: {
    score: number
    transactionCount: number
    hasEnoughTransactions?: boolean
    wantsPercent?: number
    needsPercent?: number
    otherPercent?: number
  }
  fridge: {
    score: number
    transactionCount: number
    hasEnoughTransactions?: boolean
    unhealthyPercent?: number
    healthyPercent?: number
  }
  savings: {
    score: number
    savingsRate: number
    transactionCount?: number
    gap?: number
    trend?: {
      direction?: string
      change?: number
      currentMonthRate?: number
      previousMonthRate?: number
    }
  }
  trends: {
    score: number
    transactionCount?: number
    categoryAnalysis?: Array<{
      category: string
      status: "below" | "average" | "above"
      difference: number
      userPercent: number
      avgPercent: number
    }>
  }
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
  show: { opacity: 1, transition: { staggerChildren: 0.055, delayChildren: 0.08 } },
}

const suggestionItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 500, damping: 36, mass: 0.8 } },
}

function ScorePill({ label, value, score }: { label: string; value: string; score?: number }) {
  const color =
    score !== undefined
      ? score >= 70 ? "text-green-500" : score >= 40 ? "text-yellow-500" : "text-red-500"
      : ""
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-background/60 px-3 py-1.5 text-xs shadow-sm backdrop-blur-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums font-semibold", color || "text-foreground")}>{value}</span>
    </div>
  )
}

function UsageInfo({ used, limit, resetsAt }: { used: number; limit: number; resetsAt: string | null }) {
  const remaining = Math.max(0, limit - used)

  const resetLabel = resetsAt
    ? (() => {
        const diff = new Date(resetsAt).getTime() - Date.now()
        if (diff <= 0) return "resets soon"
        const hours = Math.floor(diff / 3_600_000)
        const days = Math.floor(hours / 24)
        return days > 0 ? `resets in ${days}d` : `resets in ${hours}h`
      })()
    : null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-[11px] tabular-nums cursor-default select-none text-muted-foreground/40">
          {remaining}/{limit}
        </span>
      </TooltipTrigger>
      {resetLabel && (
        <TooltipContent side="top">
          {resetLabel}
        </TooltipContent>
      )}
    </Tooltip>
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

function generateChatTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user")
  if (!firstUser) return "Untitled Chat"
  const text = firstUser.content.slice(0, 60)
  return text.length < firstUser.content.length ? text + "..." : text
}

function ChatInterfaceInner({ isFree = false }: { isFree?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([])
  const messagesRef = useRef<Message[]>([])
  useEffect(() => { messagesRef.current = messages }, [messages])

  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [chatUsage, setChatUsage] = useState<{ used: number; limit: number | null; resetsAt: string | null } | null>(null)

  // Feature 5: Chat History
  const [historyOpen, setHistoryOpen] = useState(false)
  const [isSavingChat, setIsSavingChat] = useState(false)

  // Scroll-based input visibility
  const [inputVisible, setInputVisible] = useState(true)
  const lastScrollTop = useRef(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const searchParams = useSearchParams()
  const initialPromptSent = useRef(false)
  const bottomAnchorRef = useRef<HTMLDivElement>(null)
  const digestSentRef = useRef(false)

  const { currency } = useCurrency()
  const { user } = useUser()
  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "there"

  // Feature 1: Anomaly chips derived from stats
  const anomalyChips = useMemo<AnomalyChip[]>(() => {
    if (!stats) return []
    return getAnomalyChips({
      savings: stats.savings,
      trends: stats.trends,
      analytics: stats.analytics,
      fridge: stats.fridge,
    })
  }, [stats])

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
    } catch { /* ignore */ }
  }, [messages])

  // Load dashboard stats + chat usage
  useEffect(() => {
    async function loadStats() {
      try {
        const [statsRes, usageRes] = await Promise.all([
          fetch("/api/dashboard-stats"),
          fetch("/api/ai/chat-usage"),
        ])
        if (statsRes.ok) setStats(await statsRes.json())
        if (usageRes.ok) setChatUsage(await usageRes.json())
      } catch { /* ignore */ }
      finally { setIsLoadingStats(false) }
    }
    loadStats()
  }, [])

  // Scroll direction detection on the conversation container
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const atBottom = scrollTop + clientHeight >= scrollHeight - 60

    if (atBottom) {
      setInputVisible(true)
    } else if (scrollTop < lastScrollTop.current) {
      // Scrolling up — hide input
      setInputVisible(false)
    } else {
      // Scrolling down — show input
      setInputVisible(true)
    }
    lastScrollTop.current = scrollTop
  }, [])

  // Auto-scroll to bottom on new messages & show input
  useEffect(() => {
    const el = scrollContainerRef.current
    if (el && messages.length > 0) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
      setInputVisible(true)
    }
  }, [messages.length])

  const refreshChatUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/chat-usage")
      if (res.ok) setChatUsage(await res.json())
    } catch { /* ignore */ }
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
        const lines = decoder.decode(value).split("\n")
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
          } catch { /* ignore malformed chunk */ }
        }
      }
    },
    [buildPayload, currency]
  )

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed || isLoading) return

      const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: trimmed, timestamp: new Date() }
      const assistantId = crypto.randomUUID()
      const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", timestamp: new Date() }

      setIsLoading(true)

      safeCapture("ai_chat_message_sent", {
        message_length: trimmed.length,
        is_first_message: messagesRef.current.filter((m) => m.role === "user").length === 0,
      })

      setMessages([...messagesRef.current, userMsg, assistantMsg])

      try {
        await streamAssistant([...messagesRef.current, userMsg], assistantId)
      } catch (err: unknown) {
        const msg = (err as Error)?.name === "AbortError"
          ? "Generation stopped."
          : (err as Error)?.message || "Sorry, something went wrong. Please try again."
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: msg } : m)))
      } finally {
        abortRef.current = null
        setIsLoading(false)
        setIsStreaming(false)
        requestAnimationFrame(() => textareaRef.current?.focus())
        void refreshChatUsage()
      }
    },
    [isLoading, streamAssistant, refreshChatUsage]
  )

  // Feature 4: Weekly digest — auto-trigger on first open of the week
  useEffect(() => {
    if (isLoadingStats || digestSentRef.current) return
    if (!shouldShowWeeklyDigest()) return
    digestSentRef.current = true
    markWeeklyDigestShown()
    const t = setTimeout(() => sendMessage(WEEKLY_DIGEST_PROMPT), 600)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingStats])

  // Auto-send from URL param
  useEffect(() => {
    const prompt = searchParams.get("prompt")
    if (prompt && !initialPromptSent.current && !isLoadingStats) {
      initialPromptSent.current = true
      const t = setTimeout(() => sendMessage(decodeURIComponent(prompt)), 300)
      return () => clearTimeout(t)
    }
  }, [searchParams, isLoadingStats, sendMessage])

  const regenerateLast = useCallback(async () => {
    if (isLoading) return
    const current = messagesRef.current

    let lastAiIdx = -1
    for (let i = current.length - 1; i >= 0; i--) {
      if (current[i].role === "assistant") { lastAiIdx = i; break }
    }
    if (lastAiIdx === -1) return

    let lastUserIdx = -1
    for (let i = lastAiIdx - 1; i >= 0; i--) {
      if (current[i].role === "user") { lastUserIdx = i; break }
    }
    if (lastUserIdx === -1) return

    const base = current.slice(0, lastUserIdx + 1)
    const assistantId = crypto.randomUUID()

    setIsLoading(true)
    setIsStreaming(false)

    // Track regenerate as a chat message (counts toward plan limit via API)
    safeCapture("ai_chat_message_sent", {
      message_length: base[lastUserIdx].content.length,
      is_regenerate: true,
    })

    setMessages([...base, { id: assistantId, role: "assistant", content: "", timestamp: new Date() }])

    try {
      await streamAssistant(base, assistantId)
    } catch (err: unknown) {
      const msg = (err as Error)?.name === "AbortError"
        ? "Generation stopped."
        : (err as Error)?.message || "Sorry, something went wrong. Please try again."
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: msg } : m)))
    } finally {
      abortRef.current = null
      setIsLoading(false)
      setIsStreaming(false)
      requestAnimationFrame(() => textareaRef.current?.focus())
      void refreshChatUsage()
    }
  }, [isLoading, streamAssistant, refreshChatUsage])

  // Feature 5: Save current chat
  const saveChat = useCallback(async () => {
    const current = messagesRef.current
    if (current.length === 0 || isSavingChat) return
    setIsSavingChat(true)
    try {
      const title = generateChatTitle(current)
      await fetch("/api/chat/histories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          messages: current.map((m) => ({ ...m, timestamp: m.timestamp.toISOString() })),
        }),
      })
    } catch { /* ignore */ }
    finally { setIsSavingChat(false) }
  }, [isSavingChat])

  // Feature 5: Load saved chat
  const loadChat = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/chat/histories/${id}`)
      if (!res.ok) return
      const data = await res.json() as { history: { messages: Array<Omit<Message, "timestamp"> & { timestamp: string }> } }
      const loaded = data.history.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }))
      setMessages(loaded)
    } catch { /* ignore */ }
  }, [])

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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {/* Subtle ambient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-[50rem] rounded-full bg-primary/6 blur-3xl"
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Feature 5: History sheet */}
      <ChatHistorySheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onLoad={loadChat}
      />

      <AnimatePresence mode="wait" initial={false}>
        {isEmpty ? (
          /* ─── EMPTY STATE ─── */
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="flex flex-1 flex-col items-center justify-center px-4 py-8 overflow-y-auto"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.05 }}
              className="mb-4"
            >
              <Image
                src="/Trakzi/Trakziicon.png"
                alt="Trakzi"
                width={52}
                height={52}
                className="rounded-2xl shadow-md"
                priority
              />
            </motion.div>

            {/* Greeting */}
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.28 }}
              className="mb-1 text-[22px] font-semibold tracking-tight text-foreground"
            >
              Hello, {firstName}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.28 }}
              className="mb-6 text-sm text-muted-foreground"
            >
              Your AI finance advisor — ask anything about your money
            </motion.p>

            {/* Financial context panel */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.28 }}
              className="mb-5 w-full max-w-md"
            >
              {isLoadingStats ? (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
                  <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading your financial data…
                </div>
              ) : stats && stats.analytics.hasEnoughTransactions ? (
                <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-3.5">
                  <p className="mb-2.5 text-center text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Your snapshot · {totalTransactions.toLocaleString()} transactions
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    <ScorePill label="Spending" value={`${stats.analytics.score}%`} score={stats.analytics.score} />
                    <ScorePill label="Savings" value={`${stats.savings.savingsRate}%`} score={stats.savings.score} />
                    <ScorePill label="Fridge" value={`${stats.fridge.score}%`} score={stats.fridge.score} />
                    <ScorePill label="Transactions" value={totalTransactions.toLocaleString()} />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-muted-foreground/20 bg-muted/15 px-4 py-3 text-center">
                  <p className="text-sm font-medium text-muted-foreground">🔒 AI Scores Locked</p>
                  <p className="mt-0.5 text-xs text-muted-foreground/60">
                    {stats
                      ? `Import ${Math.max(0, 100 - (stats.analytics.transactionCount || 0))} more transactions to unlock`
                      : "Import transactions to unlock personalized scores"}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Suggestion chips — hidden for free users */}
            {!isFree && (
              <motion.div
                variants={suggestionList}
                initial="hidden"
                animate="show"
                className="mb-7 flex flex-wrap justify-center gap-1.5 max-w-lg"
              >
                {anomalyChips.map((chip) => (
                  <motion.button
                    key={chip.label}
                    variants={suggestionItem}
                    onClick={() => {
                      safeCapture("quick_ai_prompt_clicked", { prompt_text: chip.prompt, is_anomaly: true })
                      sendMessage(chip.prompt)
                    }}
                    disabled={isLoading}
                    className={cn(
                      "rounded-full border px-4 py-2 text-xs font-medium",
                      "transition-all hover:-translate-y-0.5 hover:shadow-sm",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                      "active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
                      chip.type === "warning"
                        ? "border-yellow-500/40 bg-yellow-500/8 hover:bg-yellow-500/12 text-foreground"
                        : chip.type === "success"
                        ? "border-green-500/40 bg-green-500/8 hover:bg-green-500/12 text-foreground"
                        : "border-blue-500/40 bg-blue-500/8 hover:bg-blue-500/12 text-foreground"
                    )}
                  >
                    {chip.type === "warning" ? "⚠️ " : chip.type === "success" ? "✅ " : "ℹ️ "}
                    {chip.label}
                  </motion.button>
                ))}

                {SUGGESTED_QUESTIONS.slice(0, anomalyChips.length > 0 ? 3 : 6).map((q) => (
                  <motion.button
                    key={q}
                    variants={suggestionItem}
                    onClick={() => {
                      safeCapture("quick_ai_prompt_clicked", { prompt_text: q })
                      sendMessage(q)
                    }}
                    disabled={isLoading}
                    className={cn(
                      "rounded-full border border-border/50 bg-background/80 px-4 py-2 text-xs font-medium",
                      "transition-all hover:-translate-y-0.5 hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                      "active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  >
                    {q}
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* Centered input */}
            <div className="w-full max-w-2xl">
              {isFree ? (
                <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-5 py-4 text-center">
                  <p className="text-sm font-medium text-foreground mb-0.5">Upgrade to chat with your finances</p>
                  <p className="text-xs text-muted-foreground mb-3">Free plan includes read-only access. Pro &amp; Max get 50–100 AI messages per week.</p>
                  <Button asChild size="sm" className="bg-gradient-to-r from-primary to-primary/80">
                    <Link href="/dashboard">Upgrade Plan</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <ClaudeChatInput
                    ref={textareaRef}
                    onSendMessage={sendMessage}
                    onStop={stopStreaming}
                    isLoading={isLoading}
                  />
                  <div className="mt-1.5 flex items-center justify-between px-1">
                    {chatUsage && chatUsage.limit !== null ? (
                      <UsageInfo used={chatUsage.used} limit={chatUsage.limit} resetsAt={chatUsage.resetsAt} />
                    ) : <span />}
                    <p className="text-[11px] text-muted-foreground/40">
                      AI can make mistakes — verify important financial decisions.
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ) : (
          /* ─── CONVERSATION STATE ─── */
          <motion.div
            key="conversation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-1 flex-col min-h-0"
          >
            {/* Compact header */}
            <div className="shrink-0 bg-background/80 backdrop-blur-sm border-b border-border/30">
              <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Image src="/Trakzi/Trakziicon.png" alt="Trakzi" width={24} height={24} className="rounded-lg" />
                  <span className="text-sm font-medium">Trakzi AI</span>
                  {stats && !isLoadingStats && (
                    <span className="hidden sm:inline text-xs text-muted-foreground/60">
                      · {totalTransactions.toLocaleString()} transactions
                    </span>
                  )}
                  {chatUsage && chatUsage.limit !== null && (
                    <UsageInfo used={chatUsage.used} limit={chatUsage.limit} resetsAt={chatUsage.resetsAt} />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {/* Feature 5: Save chat */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={saveChat}
                    disabled={isSavingChat || messages.length === 0}
                    className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-foreground"
                    title="Save conversation"
                  >
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                  {/* Feature 5: History */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setHistoryOpen(true)}
                    className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-foreground"
                    title="Chat history"
                  >
                    <History className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearChat}
                    className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-destructive"
                    title="Clear chat"
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Scrollable messages — fills remaining height */}
            <div className="relative flex-1 min-h-0">
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="absolute inset-0 overflow-y-auto overflow-x-hidden"
              >
                <div className="mx-auto max-w-3xl px-4 pt-5 pb-36 space-y-3">
                  {messages.map((m) => {
                    const isLastAssistant = m.role === "assistant" && m.id === lastAssistantId
                    return (
                      <ChatMessage
                        key={m.id}
                        role={m.role}
                        content={m.content}
                        timestamp={m.timestamp}
                        isStreaming={isStreaming && m.role === "assistant" && m.id === lastAssistantId}
                        isThinking={isLoading && m.role === "assistant" && m.id === lastAssistantId && !m.content}
                        showRegenerate={isLastAssistant && !isLoading && messages.length > 1}
                        onRegenerate={regenerateLast}
                      />
                    )
                  })}
                  <div ref={bottomAnchorRef} />
                </div>
              </div>

              {/* Floating glass input — slides up/down based on scroll direction */}
              <div
                className={cn(
                  "absolute bottom-0 inset-x-0 px-4 pb-4 pt-2",
                  "transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                  inputVisible ? "translate-y-0" : "translate-y-[110%]"
                )}
              >
                <div className="mx-auto max-w-3xl">
                  {isFree ? (
                    <div className="rounded-2xl border border-dashed border-primary/20 bg-background/90 backdrop-blur-sm px-4 py-3 text-center flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">AI Chat requires a paid plan</p>
                      <Button asChild size="sm" variant="default" className="shrink-0 text-xs h-7">
                        <Link href="/dashboard">Upgrade</Link>
                      </Button>
                    </div>
                  ) : (
                    <ClaudeChatInput
                      ref={textareaRef}
                      onSendMessage={sendMessage}
                      onStop={stopStreaming}
                      isLoading={isLoading}
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function ChatInterface({ isFree = false }: { isFree?: boolean }) {
  return (
    <Suspense fallback={null}>
      <ChatInterfaceInner isFree={isFree} />
    </Suspense>
  )
}
