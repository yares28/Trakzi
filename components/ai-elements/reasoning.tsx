"use client"

import * as React from "react"
import * as Collapsible from "@radix-ui/react-collapsible"
import { IconBrain, IconChevronDown, IconSparkles } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface ReasoningContextValue {
    isStreaming: boolean
    duration: number
    isThinkingPhase: boolean
}

const ReasoningContext = React.createContext<ReasoningContextValue | null>(null)

function useReasoning() {
    const context = React.useContext(ReasoningContext)
    if (!context) {
        throw new Error("useReasoning must be used within a Reasoning component")
    }
    return context
}

interface ReasoningProps extends React.ComponentProps<typeof Collapsible.Root> {
    isStreaming?: boolean
    minThinkingTime?: number
    maxThinkingTime?: number
    children: React.ReactNode
}

export function Reasoning({
    isStreaming = false,
    minThinkingTime = 1000, // 1s
    maxThinkingTime = 2000, // 2s
    children,
    className,
    ...props
}: ReasoningProps) {
    const [open, setOpen] = React.useState(false)
    const [duration, setDuration] = React.useState(0)
    const [isThinkingPhase, setIsThinkingPhase] = React.useState(false)
    const startTimeRef = React.useRef<number | null>(null)
    const thinkingDelayRef = React.useRef<number>(0)

    // Auto-open when streaming starts with fake thinking delay
    React.useEffect(() => {
        if (isStreaming) {
            setOpen(true)
            setIsThinkingPhase(true)
            startTimeRef.current = Date.now()

            // Random thinking delay between min and max
            thinkingDelayRef.current = Math.floor(
                Math.random() * (maxThinkingTime - minThinkingTime) + minThinkingTime
            )

            // Update duration every 100ms for smoother progress
            const interval = setInterval(() => {
                if (startTimeRef.current) {
                    const elapsed = Date.now() - startTimeRef.current
                    setDuration(Math.floor(elapsed / 1000))

                    // End thinking phase after delay
                    if (elapsed >= thinkingDelayRef.current) {
                        setIsThinkingPhase(false)
                    }
                }
            }, 100)

            return () => clearInterval(interval)
        } else {
            // Calculate final duration
            if (startTimeRef.current) {
                setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
            }
            setIsThinkingPhase(false)
            // Auto-close after streaming ends (with a small delay)
            const timeout = setTimeout(() => setOpen(false), 800)
            return () => clearTimeout(timeout)
        }
    }, [isStreaming, minThinkingTime, maxThinkingTime])

    return (
        <ReasoningContext.Provider value={{ isStreaming, duration, isThinkingPhase }}>
            <Collapsible.Root
                open={open}
                onOpenChange={setOpen}
                className={cn("w-full", className)}
                {...props}
            >
                {children}
            </Collapsible.Root>
        </ReasoningContext.Provider>
    )
}

interface ReasoningTriggerProps extends React.ComponentProps<typeof Collapsible.Trigger> {
    title?: string
    getThinkingMessage?: (isStreaming: boolean, duration?: number, isThinking?: boolean) => React.ReactNode
}

export function ReasoningTrigger({
    title = "Thinking",
    getThinkingMessage,
    className,
    ...props
}: ReasoningTriggerProps) {
    const { isStreaming, duration, isThinkingPhase } = useReasoning()

    const defaultMessage = isThinkingPhase
        ? "Analyzing your data..."
        : isStreaming
            ? `Generating response... ${duration}s`
            : duration > 0
                ? `Completed in ${duration}s`
                : "View reasoning"

    const message = getThinkingMessage
        ? getThinkingMessage(isStreaming, duration, isThinkingPhase)
        : defaultMessage

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
            <Collapsible.Trigger
                className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all w-full",
                    "bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/15 dark:to-primary/10",
                    "hover:from-primary/10 hover:via-primary/15 hover:to-primary/10",
                    "border border-primary/20 shadow-sm",
                    "group data-[state=open]:rounded-b-none data-[state=open]:border-b-transparent",
                    className
                )}
                {...props}
            >
                {/* Animated brain/sparkles icon */}
                <div className="relative flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 border border-primary/20">
                    <AnimatePresence mode="wait">
                        {isThinkingPhase ? (
                            <motion.div
                                key="thinking"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <IconBrain className="h-4 w-4 text-primary animate-pulse" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="generating"
                                initial={{ scale: 0.8, opacity: 0, rotate: -180 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            >
                                <IconSparkles className="h-4 w-4 text-primary" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Animated ring */}
                    {(isStreaming || isThinkingPhase) && (
                        <motion.span
                            className="absolute inset-0 rounded-lg border-2 border-primary/40"
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 0, 0.5],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                    )}
                </div>

                {/* Message with animated dots */}
                <div className="flex-1 text-left">
                    <span className="font-medium text-foreground">{title}</span>
                    <span className="ml-2 text-muted-foreground">
                        {message}
                        {(isStreaming || isThinkingPhase) && (
                            <motion.span
                                className="inline-flex ml-1"
                                animate={{ opacity: [1, 0.3, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                            >
                                ...
                            </motion.span>
                        )}
                    </span>
                </div>

                {/* Progress indicator */}
                {isStreaming && (
                    <div className="flex items-center gap-1.5">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="h-1.5 w-1.5 rounded-full bg-primary"
                                animate={{
                                    scale: [1, 1.3, 1],
                                    opacity: [0.4, 1, 0.4],
                                }}
                                transition={{
                                    duration: 0.8,
                                    repeat: Infinity,
                                    delay: i * 0.15,
                                }}
                            />
                        ))}
                    </div>
                )}

                <IconChevronDown
                    className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                        "group-data-[state=open]:rotate-180"
                    )}
                />
            </Collapsible.Trigger>
        </motion.div>
    )
}

interface ReasoningContentProps extends React.ComponentProps<typeof Collapsible.Content> { }

export function ReasoningContent({ children, className, ...props }: ReasoningContentProps) {
    const { isThinkingPhase } = useReasoning()

    return (
        <Collapsible.Content
            className={cn(
                "overflow-hidden rounded-b-xl border border-t-0 border-primary/20",
                "bg-gradient-to-b from-primary/5 to-transparent",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                "data-[state=closed]:slide-up-2 data-[state=open]:slide-down-2",
                className
            )}
            {...props}
        >
            <div className="px-4 py-3 text-sm text-muted-foreground">
                <AnimatePresence mode="wait">
                    {isThinkingPhase ? (
                        <motion.div
                            key="thinking-content"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2"
                        >
                            <motion.div
                                className="h-2 w-2 rounded-full bg-primary"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                            />
                            <span>Processing your financial data...</span>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="generating-content"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            {children}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Collapsible.Content>
    )
}
