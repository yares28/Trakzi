"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ChatMessage } from "@/components/chat/chat-message"
import { Orb } from "@/components/ui/orb"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion, type Variants } from "framer-motion"
import {
  IconArrowDown,
  IconLoader2,
  IconPlayerStop,
  IconRefresh,
  IconSend,
  IconTrash,
  IconBolt,
} from "@tabler/icons-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface FinancialContext {
  hasData: boolean
  summary: {
    totalIncome: number
    totalExpenses: number
    netSavings: number
    transactionCount: number
    topCategories: { name: string; total: number }[]
  } | null
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

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1 text-[11px] shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums font-medium text-foreground">{value}</span>
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

  const [context, setContext] = useState<FinancialContext | null>(null)
  const [isLoadingContext, setIsLoadingContext] = useState(true)

  const [orbColors, setOrbColors] = useState<[string, string]>(["#e78a53", "#e78a53"])

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLElement | null>(null)
  const bottomSentinelRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [isAtBottom, setIsAtBottom] = useState(true)

  const abortRef = useRef<AbortController | null>(null)
  const lastUserPromptRef = useRef<string>("")

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

  // Read theme primary for Orb (no color changes beyond your token)
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

  // Load context
  useEffect(() => {
    async function loadContext() {
      try {
        const res = await fetch("/api/ai/chat")
        if (res.ok) setContext(await res.json())
      } catch (e) {
        console.error("Failed to load context:", e)
      } finally {
        setIsLoadingContext(false)
      }
    }
    loadContext()
  }, [])

  // Capture ScrollArea viewport + bottom detection
  useEffect(() => {
    const viewport =
      (scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null) ?? null
    if (!viewport) return
    viewportRef.current = viewport

    const onScroll = () => {
      // close enough threshold
      const threshold = 24
      const atBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < threshold
      setIsAtBottom(atBottom)
    }

    viewport.addEventListener("scroll", onScroll, { passive: true })
    onScroll()

    return () => viewport.removeEventListener("scroll", onScroll)
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomSentinelRef.current?.scrollIntoView({ behavior, block: "end" })
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
        body: JSON.stringify({ messages: buildPayload(baseMessages) }),
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

              // ensure we truly reach bottom while streaming (only if user didn't scroll away)
              if (isAtBottom) requestAnimationFrame(() => scrollToBottom("auto"))
            }
          } catch {
            // ignore malformed chunk
          }
        }
      }
    },
    [buildPayload, isAtBottom, scrollToBottom]
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

      // Append exactly once (no snapshot hack => no duplicates, no duplicate keys)
      const next = [...messagesRef.current, userMessage, assistantMessage]
      setMessages(next)

      requestAnimationFrame(() => scrollToBottom("smooth"))

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
          scrollToBottom("smooth")
          textareaRef.current?.focus()
        })
      }
    },
    [isLoading, scrollToBottom, streamAssistant]
  )

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

    // find the last user message before that assistant
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

    // Base conversation is everything up to and including that user message, excluding last assistant
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
    requestAnimationFrame(() => scrollToBottom("smooth"))

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
        scrollToBottom("smooth")
        textareaRef.current?.focus()
      })
    }
  }, [isLoading, scrollToBottom, streamAssistant])

  const headerSubtitle = useMemo(() => {
    if (isLoadingContext) return "Loading your data..."
    if (!context?.hasData) return "No transaction data yet"
    return `${context.summary?.transactionCount ?? 0} transactions analyzed`
  }, [context, isLoadingContext])

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    []
  )

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading])

  // Only last assistant message gets regenerate
  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].id
    }
    return null
  }, [messages])

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-background via-background to-muted/15">
      {/* Subtle background (uses tokens only) */}
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
                agentState={isLoading ? "thinking" : isStreaming ? "talking" : null}
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
                {isLoadingContext && <IconLoader2 className="h-3.5 w-3.5 animate-spin" />}
                {headerSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {context?.hasData && context.summary && (
              <div className="hidden lg:flex items-center gap-2 pr-2 mr-1 border-r">
                <StatPill label="Income" value={currencyFormatter.format(context.summary.totalIncome)} />
                <StatPill label="Expenses" value={currencyFormatter.format(context.summary.totalExpenses)} />
                <StatPill label="Net" value={currencyFormatter.format(context.summary.netSavings)} />
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

      {/* Body */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Messages */}
        <div className="relative min-h-0 flex-1">
          <ScrollArea ref={scrollAreaRef} className="h-full">
            <div className="mx-auto max-w-4xl px-4 py-8">
              <AnimatePresence mode="wait" initial={false}>
                {messages.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="mx-auto mt-10 max-w-2xl"
                  >
                    <div className="rounded-3xl border bg-background/70 p-8 text-center shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/60">
                      <div className="mx-auto mb-5 h-16 w-16 overflow-hidden rounded-2xl border bg-muted/30">
                        <Orb colors={orbColors} className="h-full w-full" />
                      </div>

                      <h3 className="text-xl font-semibold tracking-tight">Ask anything about your finances</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {context?.hasData
                          ? "Get insights on categories, trends, and cashflow. Ask naturally—I'll do the analysis."
                          : "Import statements to unlock personalized insights. You can still ask general questions in the meantime."}
                      </p>

                      {context?.hasData && context.summary && (
                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                          <StatPill label="Income" value={currencyFormatter.format(context.summary.totalIncome)} />
                          <StatPill label="Expenses" value={currencyFormatter.format(context.summary.totalExpenses)} />
                          <StatPill label="Net" value={currencyFormatter.format(context.summary.netSavings)} />
                        </div>
                      )}

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
                    </div>
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
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={bottomSentinelRef} className="h-px w-full" />
              {/* extra breathing room above footer island */}
              <div className="h-6" />
            </div>
          </ScrollArea>

          <AnimatePresence>
            {!isAtBottom && messages.length > 0 && (
              <motion.div
                className="absolute bottom-28 right-6 z-20"
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="shadow-lg transition-shadow hover:shadow-xl"
                  onClick={() => scrollToBottom("smooth")}
                  title="Jump to latest"
                >
                  <IconArrowDown className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sticky island composer (real footer, not overlay) */}
        <div className="shrink-0 border-t bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <div className="rounded-2xl border bg-background/70 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-shadow focus-within:shadow-xl">
              <div className="flex items-end gap-2">
                <div className="relative flex-1 rounded-xl border bg-muted/20 px-3 py-2 transition-colors focus-within:border-primary/30 focus-within:bg-muted/10 focus-within:ring-2 focus-within:ring-ring/30">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about spending, budgeting, categories, trends…"
                    disabled={isLoading}
                    rows={1}
                    onKeyDown={(e) => {
                      // One and only one send path:
                      // Enter => send, Shift+Enter => newline.
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        if (canSend) sendMessage(input)
                      }
                    }}
                    className={cn(
                      "min-h-[46px] w-full resize-none bg-transparent py-1 text-sm",
                      "outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0",
                      "disabled:cursor-not-allowed disabled:opacity-60"
                    )}
                  />
                  <div className="pointer-events-none absolute bottom-2 right-2 text-[10px] text-muted-foreground">
                    Shift+Enter for newline
                  </div>
                </div>

                <AnimatePresence mode="popLayout" initial={false}>
                  {isLoading ? (
                    <motion.div
                      key="stop"
                      className="shrink-0"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                    >
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={stopStreaming}
                        className="h-11 rounded-xl active:scale-[0.98]"
                        title="Stop generating"
                      >
                        <IconPlayerStop className="mr-2 h-4 w-4" />
                        Stop
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="send"
                      className="shrink-0"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                    >
                      <Button
                        type="button"
                        disabled={!canSend}
                        onClick={() => sendMessage(input)}
                        className="h-11 rounded-xl active:scale-[0.98]"
                      >
                        <IconSend className="mr-2 h-4 w-4" />
                        Send
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
