"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

interface ChartFullscreenModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    description?: string
    children: React.ReactNode
    /** Optional header actions to show in fullscreen (AI insight, info buttons) */
    headerActions?: React.ReactNode
}

export function ChartFullscreenModal({
    isOpen,
    onClose,
    title,
    description,
    children,
    headerActions,
}: ChartFullscreenModalProps) {
    // Lock body scroll when modal is open
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = ""
        }
        return () => {
            document.body.style.overflow = ""
        }
    }, [isOpen])

    // Close on escape key
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose()
            }
        }
        window.addEventListener("keydown", handleEscape)
        return () => window.removeEventListener("keydown", handleEscape)
    }, [isOpen, onClose])

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[9999] flex flex-col bg-background"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) onClose()
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-semibold truncate">{title}</h2>
                            {description && (
                                <p className="text-sm text-muted-foreground truncate">{description}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                            {headerActions}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-9 w-9"
                                aria-label="Close fullscreen"
                            >
                                <IconX className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Chart content - full available space */}
                    <div className="flex-1 p-4 min-h-0 overflow-auto">
                        <div className="h-full w-full min-h-[400px]">
                            {children}
                        </div>
                    </div>

                    {/* Hint for rotation */}
                    <div className="px-4 py-2 text-center text-xs text-muted-foreground border-t border-border/50">
                        Rotate device for better view
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
