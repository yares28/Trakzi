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
}

export function ChartFullscreenModal({
    isOpen,
    onClose,
    title,
    description,
    children,
    headerActions,
    filterControl,
}: ChartFullscreenModalProps) {
    const isMobile = useIsMobile()
    const [isPortrait, setIsPortrait] = React.useState(false)

    // Detect portrait orientation
    React.useEffect(() => {
        if (!isOpen) return

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
    }, [isOpen])

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

    // Try to use Screen Orientation API (works on some Android browsers)
    React.useEffect(() => {
        if (!isOpen) return

        const lockOrientation = async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const orientation = screen.orientation as any
                if (orientation?.lock) {
                    await orientation.lock('landscape')
                }
            } catch {
                // Orientation lock not supported - we'll use CSS fallback
            }
        }

        lockOrientation()

        return () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const orientation = screen.orientation as any
                if (orientation?.unlock) {
                    orientation.unlock()
                }
            } catch {
                // Ignore unlock errors
            }
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

    // Should we rotate the content to force landscape?
    const shouldRotate = isMobile && isPortrait

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
                        // Force horizontal by rotating 90 degrees
                        transform: 'rotate(90deg)',
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
                    {/* Header - compact */}
                    <div className="flex items-center justify-between px-2 py-1 border-b border-border/50 shrink-0">
                        <h2 className="text-xs font-semibold truncate">{title}</h2>
                        <div className="flex items-center gap-1 ml-2">
                            {filterControl}
                            {headerActions}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-7 w-7"
                                aria-label="Close fullscreen"
                            >
                                <IconX className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>

                    {/* Chart content - full available space */}
                    <div className="flex-1 p-1 min-h-0 overflow-hidden">
                        <div className="h-full w-full">
                            {children}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}



