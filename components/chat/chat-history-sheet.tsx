"use client"

import { useCallback, useEffect, useState } from "react"
import { Trash2, MessageSquare, Clock, Loader2 } from "lucide-react"
import { m, AnimatePresence } from "framer-motion"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ChatHistoryListItem } from "@/lib/types/chat"

interface ChatHistorySheetProps {
  open: boolean
  onClose: () => void
  onLoad: (id: string) => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return "just now"
}

export function ChatHistorySheet({ open, onClose, onLoad }: ChatHistorySheetProps) {
  const [histories, setHistories] = useState<ChatHistoryListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchHistories = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/chat/histories")
      if (res.ok) {
        const data = await res.json() as { histories: ChatHistoryListItem[] }
        setHistories(data.histories)
      }
    } catch { /* ignore */ }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => {
    if (open) fetchHistories()
  }, [open, fetchHistories])

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await fetch(`/api/chat/histories/${id}`, { method: "DELETE" })
      setHistories((prev) => prev.filter((h) => h.id !== id))
    } catch { /* ignore */ }
    finally { setDeletingId(null) }
  }, [])

  const handleLoad = useCallback((id: string) => {
    onLoad(id)
    onClose()
  }, [onLoad, onClose])

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="px-5 py-4 border-b border-border/40">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Saved Conversations
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading…
            </div>
          ) : histories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-2">
              <MessageSquare className="h-9 w-9 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No saved chats yet</p>
              <p className="text-xs text-muted-foreground/60">
                Click the save button during a conversation to keep it here.
              </p>
            </div>
          ) : (
            <m.ul
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              className="divide-y divide-border/30"
            >
              <AnimatePresence initial={false}>
                {histories.map((h) => (
                  <m.li
                    key={h.id}
                    variants={{ hidden: { opacity: 0, x: 10 }, show: { opacity: 1, x: 0 } }}
                    exit={{ opacity: 0, x: 20, transition: { duration: 0.18 } }}
                    layout
                  >
                    <button
                      onClick={() => handleLoad(h.id)}
                      className={cn(
                        "group w-full flex items-start gap-3 px-5 py-3.5 text-left",
                        "hover:bg-muted/50 transition-colors duration-150"
                      )}
                    >
                      <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/50 group-hover:text-primary/60 transition-colors" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate leading-snug">{h.title}</p>
                        <p className="text-xs text-muted-foreground/70 truncate mt-0.5 leading-snug">
                          {h.preview || "No preview"}
                        </p>
                        <p className="text-[10px] text-muted-foreground/40 mt-1 tabular-nums">
                          {h.message_count} messages · {timeAgo(h.updated_at)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDelete(h.id, e)}
                        disabled={deletingId === h.id}
                        aria-label="Delete chat"
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground/40 disabled:opacity-40"
                      >
                        {deletingId === h.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </button>
                  </m.li>
                ))}
              </AnimatePresence>
            </m.ul>
          )}
        </div>

        {histories.length > 0 && (
          <div className="px-5 py-3 border-t border-border/40">
            <p className="text-[11px] text-muted-foreground/40 text-center">
              {histories.length} saved {histories.length === 1 ? "conversation" : "conversations"}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
