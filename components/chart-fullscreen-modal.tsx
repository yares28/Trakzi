"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"

interface ChartFullscreenModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    description?: string
    children: React.ReactNode
    /** Optional header actions to show in fullscreen (AI insight, info buttons) */
    headerActions?: React.ReactNode
    /** Optional filter control to render in header (e.g., time period selector) */
    filterControl?: React.ReactNode
    /** Whether to force landscape on mobile (default: false) */
    forceLandscape?: boolean
}

export function ChartFullscreenModal({
    isOpen,
    onClose,
    title,
    description,
    children,
    headerActions,
    filterControl,
    forceLandscape = false,
}: ChartFullscreenModalProps) {
    const isMobile = useIsMobile()
    const [isPortrait, setIsPortrait] = React.useState(false)

    // Detect portrait orientation on mobile
    React.useEffect(() => {
        if (!isMobile || !forceLandscape) {
            setIsPortrait(false)
            return
        }

        const checkOrientation = () => {
            setIsPortrait(window.innerHeight > window.innerWidth)
        }

        checkOrientation()
        window.addEventListener("resize", checkOrientation)
        window.addEventListener("orientationchange", checkOrientation)

        return () => {
            window.removeEventListener("resize", checkOrientation)
            window.removeEventListener("orientationchange", checkOrientation)
        }
    }, [isMobile, forceLandscape])

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

    // Should we apply landscape transform?
    const shouldRotate = forceLandscape && isMobile && isPortrait

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[9999] flex flex-col bg-background"
                    style={shouldRotate ? {
                        // Rotate container to simulate landscape
                        transform: `rotate(90deg)`,
                        transformOrigin: 'center center',
                        width: '100vh',
                        height: '100vw',
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        marginTop: '-50vw',
                        marginLeft: '-50vh',
                    } : undefined}
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
                            {filterControl}
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

                    {/* Hint for rotation - only show if not forcing landscape */}
                    {!forceLandscape && (
                        <div className="px-4 py-2 text-center text-xs text-muted-foreground border-t border-border/50">
                            Rotate device for better view
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    )
}

