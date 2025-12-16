"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { IconSend, IconPlayerStop } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface PromptInputContextValue {
    status: "ready" | "streaming" | "submitted"
}

const PromptInputContext = React.createContext<PromptInputContextValue>({ status: "ready" })

interface PromptInputProps extends React.FormHTMLAttributes<HTMLFormElement> {
    children: React.ReactNode
}

export function PromptInput({ children, className, onSubmit, ...props }: PromptInputProps) {
    return (
        <form
            className={cn(
                "flex items-end gap-2 rounded-2xl border bg-background/70 p-3",
                "shadow-lg backdrop-blur transition-shadow focus-within:shadow-xl",
                "supports-[backdrop-filter]:bg-background/60",
                className
            )}
            onSubmit={onSubmit}
            {...props}
        >
            {children}
        </form>
    )
}

interface PromptInputTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

export const PromptInputTextarea = React.forwardRef<HTMLTextAreaElement, PromptInputTextareaProps>(
    ({ className, onKeyDown, ...props }, ref) => {
        const textareaRef = React.useRef<HTMLTextAreaElement>(null)
        const combinedRef = (node: HTMLTextAreaElement) => {
            textareaRef.current = node
            if (typeof ref === "function") ref(node)
            else if (ref) ref.current = node
        }

        // Auto-resize textarea
        const adjustHeight = React.useCallback(() => {
            const textarea = textareaRef.current
            if (textarea) {
                textarea.style.height = "auto"
                textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
            }
        }, [])

        React.useEffect(() => {
            adjustHeight()
        }, [props.value, adjustHeight])

        const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            // Enter to submit, Shift+Enter for newline
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                const form = e.currentTarget.form
                if (form) {
                    form.requestSubmit()
                }
            }
            onKeyDown?.(e)
        }

        return (
            <div className="relative flex-1 rounded-xl border bg-muted/20 px-3 py-2 transition-colors focus-within:border-primary/30 focus-within:bg-muted/10">
                <textarea
                    ref={combinedRef}
                    rows={1}
                    className={cn(
                        "min-h-[46px] w-full resize-none bg-transparent py-1 text-sm",
                        "outline-none placeholder:text-muted-foreground/70",
                        "focus-visible:ring-0 focus-visible:ring-offset-0",
                        "disabled:cursor-not-allowed disabled:opacity-60",
                        className
                    )}
                    onKeyDown={handleKeyDown}
                    {...props}
                />
                <div className="pointer-events-none absolute bottom-2 right-2 text-[10px] text-muted-foreground">
                    Shift+Enter for newline
                </div>
            </div>
        )
    }
)
PromptInputTextarea.displayName = "PromptInputTextarea"

interface PromptInputSubmitProps extends React.ComponentProps<typeof Button> {
    status?: "ready" | "streaming" | "submitted"
}

export function PromptInputSubmit({
    status = "ready",
    className,
    disabled,
    onClick,
    ...props
}: PromptInputSubmitProps) {
    const isStreaming = status === "streaming"

    return (
        <Button
            type={isStreaming ? "button" : "submit"}
            disabled={disabled}
            className={cn("h-11 rounded-xl active:scale-[0.98]", className)}
            variant={isStreaming ? "secondary" : "default"}
            onClick={onClick}
            {...props}
        >
            {isStreaming ? (
                <>
                    <IconPlayerStop className="mr-2 h-4 w-4" />
                    Stop
                </>
            ) : (
                <>
                    <IconSend className="mr-2 h-4 w-4" />
                    Send
                </>
            )}
        </Button>
    )
}
