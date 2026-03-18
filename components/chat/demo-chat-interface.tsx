"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Orb } from "@/components/ui/orb"
import { cn } from "@/lib/utils"
import { AnimatePresence, m, type Variants } from "framer-motion"
import {
    IconBolt,
    IconLock,
} from "@tabler/icons-react"
import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { PromptInput, PromptInputTextarea, PromptInputSubmit } from "@/components/ai-elements/prompt-input"
import { ChatMessage } from "@/components/chat/chat-message"

// ---------------------------------------------------------------------------
// Demo conversation data
// ---------------------------------------------------------------------------

interface DemoMessage {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: Date
}

const DEMO_MESSAGES: Omit<DemoMessage, "timestamp">[] = [
    {
        id: "demo-1",
        role: "user",
        content: "What are my top spending categories?",
    },
    {
        id: "demo-2",
        role: "assistant",
        content: `Based on your transaction data, here are your **top 5 spending categories** this month:

| Category | Amount | % of Total |
|----------|--------|-----------|
| 🏠 Housing & Rent | €1,250.00 | 38.2% |
| 🛒 Groceries | €412.50 | 12.6% |
| 🚗 Transportation | €285.00 | 8.7% |
| 🍽️ Dining Out | €198.75 | 6.1% |
| 🎮 Entertainment | €145.00 | 4.4% |

Your housing costs are the largest portion of your budget at **38.2%**. This is within the recommended 30-40% range.

💡 **Tip:** Your dining out spending (€198.75) is close to half of your grocery budget. Consider meal prepping to shift some of that spending toward groceries for better savings.`,
    },
    {
        id: "demo-3",
        role: "user",
        content: "How can I reduce my expenses?",
    },
    {
        id: "demo-4",
        role: "assistant",
        content: `Great question! Here are some **personalized recommendations** based on your spending patterns:

### 🎯 Quick Wins
1. **Dining Out → Cook at Home**: You spent €198.75 on restaurants. Cooking 3 more meals/week at home could save ~€80/month.
2. **Subscriptions Audit**: You have 6 active subscriptions totaling €67.50/month. Consider canceling unused ones.
3. **Transportation**: Your daily commute costs avg. €9.50. A monthly pass at €49 would save €140/month.

### 📊 Monthly Savings Potential
- Dining optimization: **~€80/month**
- Subscription cleanup: **~€25/month**  
- Transport pass: **~€140/month**

**Total potential savings: ~€245/month** 🎉

Would you like me to create a budget plan based on these suggestions?`,
    },
    {
        id: "demo-5",
        role: "user",
        content: "Show me my monthly spending trends",
    },
    {
        id: "demo-6",
        role: "assistant",
        content: `Here's your **spending trend** over the last 6 months:

📈 **Monthly Overview:**
- October: €3,105 
- November: €2,890 ↓ 6.9%
- December: €3,450 ↑ 19.4% *(holiday spending)*
- January: €2,750 ↓ 20.3%
- February: €2,680 ↓ 2.5%
- March (so far): €2,410

### Key Observations:
- 📉 Your spending has been on a **downward trend** since January — great progress!
- 🎄 December was your highest month due to holiday gifts and travel
- 🛒 Grocery spending has been **consistent** (~€400/month)
- 📱 Subscription costs crept up by €12 over 6 months

Your **savings rate** improved from **12%** in October to **19%** in March. Keep it up! 💪`,
    },
]

// ---------------------------------------------------------------------------
// Typing animation delays (ms to wait before showing each message)
// ---------------------------------------------------------------------------
const MESSAGE_DELAYS = [0, 800, 2800, 3600, 5600, 6400] // staggered appearance

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const fadeIn: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
}

export function DemoChatInterface() {
    const [visibleCount, setVisibleCount] = useState(0)
    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

    const [orbColors, setOrbColors] = useState<[string, string]>(["#e78a53", "#e78a53"])

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

    // Progressively reveal messages with delays
    useEffect(() => {
        timeoutsRef.current.forEach(clearTimeout)
        timeoutsRef.current = []

        MESSAGE_DELAYS.forEach((delay, i) => {
            const t = setTimeout(() => setVisibleCount(i + 1), delay)
            timeoutsRef.current.push(t)
        })

        return () => timeoutsRef.current.forEach(clearTimeout)
    }, [])

    const messages = useMemo<DemoMessage[]>(() => {
        const base = new Date()
        base.setMinutes(base.getMinutes() - DEMO_MESSAGES.length * 2)
        return DEMO_MESSAGES.slice(0, visibleCount).map((m, i) => ({
            ...m,
            timestamp: new Date(base.getTime() + i * 2 * 60_000),
        }))
    }, [visibleCount])

    const isTyping = visibleCount < DEMO_MESSAGES.length && visibleCount > 0 && DEMO_MESSAGES[visibleCount - 1]?.role === "user"

    return (
        <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-background via-background to-muted/15">
            {/* Subtle background */}
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute -top-24 left-1/2 -translate-x-1/2">
                    <m.div
                        className="h-64 w-[42rem] rounded-full bg-primary/10 blur-3xl"
                        animate={{ y: [0, -12, 0], x: [0, 18, 0] }}
                        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                    />
                </div>
                <div className="absolute -bottom-24 left-1/3 -translate-x-1/2">
                    <m.div
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
                                agentState={isTyping ? "talking" : null}
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
                                Demo Preview — 247 transactions analyzed
                            </p>
                        </div>
                    </div>

                    {/* Demo badge */}
                    <div className="flex items-center gap-2">
                        <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                            <IconLock className="h-3 w-3" />
                            Demo Mode
                        </div>
                    </div>
                </div>
            </div>

            {/* Body with Conversation auto-scroll */}
            <div className="relative flex min-h-0 flex-1 flex-col">
                <Conversation className="flex-1">
                    <ConversationContent className="mx-auto max-w-4xl">
                        <AnimatePresence mode="popLayout" initial={false}>
                            <div className="space-y-2">
                                {messages.map((msg) => (
                                    <m.div
                                        key={msg.id}
                                        variants={fadeIn}
                                        initial="hidden"
                                        animate="visible"
                                        layout
                                    >
                                        <ChatMessage
                                            role={msg.role}
                                            content={msg.content}
                                            timestamp={msg.timestamp}
                                            isStreaming={false}
                                            isThinking={false}
                                            showRegenerate={false}
                                        />
                                    </m.div>
                                ))}

                                {/* Typing indicator while waiting for assistant */}
                                {isTyping && (
                                    <m.div
                                        key="typing"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-center gap-2 py-3 px-4"
                                    >
                                        <div className="flex gap-1">
                                            {[0, 1, 2].map((i) => (
                                                <m.div
                                                    key={i}
                                                    className="h-2 w-2 rounded-full bg-primary/40"
                                                    animate={{ y: [0, -6, 0] }}
                                                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs text-muted-foreground">Trakzi AI is typing…</span>
                                    </m.div>
                                )}
                            </div>
                        </AnimatePresence>

                        {/* Extra breathing room above footer */}
                        <div className="h-6" />
                    </ConversationContent>

                    <ConversationScrollButton />
                </Conversation>

                {/* Sticky composer — disabled in demo */}
                <div className="shrink-0 border-t bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="mx-auto max-w-4xl px-4 py-3">
                        <PromptInput onSubmit={(e) => e.preventDefault()}>
                            <PromptInputTextarea
                                value=""
                                onChange={() => { }}
                                placeholder="Sign up to chat with the AI assistant…"
                                disabled
                                className="opacity-60"
                            />
                            <PromptInputSubmit
                                status="ready"
                                disabled
                            />
                        </PromptInput>
                        <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
                            This is a demo preview. Sign up to ask your own financial questions.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
