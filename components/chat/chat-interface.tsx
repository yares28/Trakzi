"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatMessage } from "@/components/chat/chat-message"
import { Orb } from "@/components/ui/orb"
import { 
  IconSend, 
  IconLoader2, 
  IconRefresh,
  IconTrash,
  IconBrain
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

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

const SUGGESTED_QUESTIONS = [
  "What are my top spending categories?",
  "How can I reduce my expenses?",
  "Show me my monthly spending trends",
  "Am I saving enough money?",
  "What patterns do you see in my transactions?",
]

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [context, setContext] = useState<FinancialContext | null>(null)
  const [isLoadingContext, setIsLoadingContext] = useState(true)
  const [thinkingText, setThinkingText] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [orbColors, setOrbColors] = useState<[string, string]>(["#E78A53", "#4A90E2"])

  // Get colors from CSS variables - using chart colors which match theme
  useEffect(() => {
    const root = document.documentElement
    const chart1 = getComputedStyle(root).getPropertyValue("--chart-1").trim()
    const chart2 = getComputedStyle(root).getPropertyValue("--chart-2").trim()
    
    // Convert oklch to hex by creating a temporary element
    const convertOklchToHex = (oklchValue: string): string => {
      if (!oklchValue || !oklchValue.startsWith("oklch")) {
        return "#E78A53" // fallback
      }
      try {
        const tempEl = document.createElement("div")
        tempEl.style.color = oklchValue
        document.body.appendChild(tempEl)
        const rgb = window.getComputedStyle(tempEl).color
        document.body.removeChild(tempEl)
        
        // Convert rgb to hex
        const match = rgb.match(/\d+/g)
        if (match && match.length >= 3) {
          const r = parseInt(match[0]).toString(16).padStart(2, "0")
          const g = parseInt(match[1]).toString(16).padStart(2, "0")
          const b = parseInt(match[2]).toString(16).padStart(2, "0")
          return `#${r}${g}${b}`
        }
      } catch {
        // fallback
      }
      return "#E78A53"
    }
    
    setOrbColors([
      convertOklchToHex(chart2) || "#E78A53",
      convertOklchToHex(chart1) || "#4A90E2"
    ])
  }, [])

  // Load user context on mount
  useEffect(() => {
    async function loadContext() {
      try {
        const res = await fetch("/api/ai/chat")
        if (res.ok) {
          const data = await res.json()
          setContext(data)
        }
      } catch (error) {
        console.error("Failed to load context:", error)
      } finally {
        setIsLoadingContext(false)
      }
    }
    loadContext()
  }, [])

  // Auto-scroll to bottom with smooth animation
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        const targetScroll = scrollContainer.scrollHeight
        const startScroll = scrollContainer.scrollTop
        const distance = targetScroll - startScroll
        const duration = 300 // ms
        const startTime = performance.now()

        const animateScroll = (currentTime: number) => {
          const elapsed = currentTime - startTime
          const progress = Math.min(elapsed / duration, 1)
          
          // Easing function for smooth animation
          const easeOutCubic = 1 - Math.pow(1 - progress, 3)
          
          scrollContainer.scrollTop = startScroll + distance * easeOutCubic
          
          if (progress < 1) {
            requestAnimationFrame(animateScroll)
          }
        }
        
        requestAnimationFrame(animateScroll)
      }
    }
  }, [messages, isStreaming])

  // Thinking animation
  useEffect(() => {
    if (!isLoading || isStreaming) {
      setThinkingText("")
      return
    }

    const thinkingPhrases = [
      "Analyzing your finances",
      "Looking at spending patterns",
      "Checking your transactions",
      "Crunching the numbers",
      "Finding insights"
    ]
    let index = 0

    const interval = setInterval(() => {
      setThinkingText(thinkingPhrases[index % thinkingPhrases.length])
      index++
    }, 2000)

    setThinkingText(thinkingPhrases[0])

    return () => clearInterval(interval)
  }, [isLoading, isStreaming])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Create placeholder for assistant response
    const assistantId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date()
    }
    setMessages(prev => [...prev, assistantMessage])

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to get response")
      }

      setIsStreaming(true)

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                fullContent += parsed.content
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantId
                      ? { ...m, content: fullContent }
                      : m
                  )
                )
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Chat error:", error)
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content: error.message || "Sorry, I encountered an error. Please try again."
              }
            : m
        )
      )
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      inputRef.current?.focus()
    }
  }, [messages, isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const clearChat = () => {
    setMessages([])
    inputRef.current?.focus()
  }

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center shrink-0">
            <Orb 
              colors={orbColors}
              agentState={isLoading ? "thinking" : isStreaming ? "talking" : null}
              className="w-full h-full"
            />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Financial Assistant</h2>
            <p className="text-xs text-muted-foreground">
              {isLoadingContext 
                ? "Loading your data..." 
                : context?.hasData 
                  ? `${context.summary?.transactionCount} transactions analyzed`
                  : "No transaction data yet"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4">
        <div className="max-w-3xl mx-auto py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="h-16 w-16 rounded-2xl overflow-hidden mb-4 shrink-0"
              >
                <Orb 
                  colors={orbColors}
                  className="w-full h-full"
                />
              </motion.div>
              <h3 className="text-lg font-semibold mb-2">
                Hi! I'm your Financial Assistant
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                {context?.hasData
                  ? "I can help you understand your spending patterns, find ways to save, and answer questions about your finances."
                  : "Import your bank statements to get personalized insights about your finances."
                }
              </p>

              {/* Suggested questions */}
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTED_QUESTIONS.slice(0, 3).map((question, idx) => (
                  <motion.button
                    key={question}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => handleSuggestedQuestion(question)}
                    disabled={isLoading}
                    className="px-3 py-2 text-xs rounded-full border border-border/60 bg-background hover:bg-muted hover:border-primary/30 transition-colors disabled:opacity-50"
                  >
                    {question}
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    timestamp={message.timestamp}
                    isStreaming={isStreaming && message.role === "assistant" && message === messages[messages.length - 1]}
                  />
                ))}
              </AnimatePresence>

              {/* Thinking indicator */}
              {isLoading && !isStreaming && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3 py-4"
                >
                  <div className="h-8 w-8 rounded-full overflow-hidden shrink-0">
                    <Orb 
                      colors={orbColors}
                      agentState="thinking"
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-muted rounded-tl-md">
                    <motion.span
                      className="text-sm text-muted-foreground"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={thinkingText}
                    >
                      {thinkingText}
                    </motion.span>
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-primary"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.2
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t bg-background p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            {messages.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <IconTrash className="h-4 w-4" />
              </Button>
            )}
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your spending, budget, or savings..."
              disabled={isLoading}
              className="flex-1"
              autoFocus
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                "bg-primary hover:bg-primary/90",
                "transition-all duration-200 shrink-0"
              )}
            >
              {isLoading ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IconSend className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            This assistant only answers questions about your finances. For investment advice, consult a professional.
          </p>
        </form>
      </div>
    </div>
  )
}

