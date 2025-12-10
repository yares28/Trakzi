"use client"

import { createContext, useContext, useState, ReactNode, useRef } from "react"
import { TransactionDialog } from "@/components/transaction-dialog"

interface TransactionDialogContextType {
  openDialog: () => void
  closeDialog: () => void
  isOpen: boolean
  setRefreshCallback: (callback: () => void) => void
}

export const TransactionDialogContext = createContext<TransactionDialogContextType | undefined>(undefined)

export function useTransactionDialog() {
  const context = useContext(TransactionDialogContext)
  if (!context) {
    throw new Error("useTransactionDialog must be used within TransactionDialogProvider")
  }
  return context
}

export function TransactionDialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const refreshCallbackRef = useRef<(() => void) | null>(null)

  const openDialog = () => setIsOpen(true)
  const closeDialog = () => setIsOpen(false)
  
  const setRefreshCallback = (callback: () => void) => {
    refreshCallbackRef.current = callback
  }

  const handleSuccess = () => {
    
    // Call the refresh callback directly if available
    if (refreshCallbackRef.current) {
      // Use a delay to ensure database transaction is committed
      setTimeout(() => {
        try {
          refreshCallbackRef.current?.()
        } catch (error) {
          console.error("[TransactionDialogProvider] Error calling refresh callback:", error)
        }
      }, 500)
    } else {
      console.warn("[TransactionDialogProvider] No refresh callback registered!")
    }
    
    // Also dispatch event as fallback
    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("transactionAdded"))
      }, 500)
    }
  }

  return (
    <TransactionDialogContext.Provider value={{ openDialog, closeDialog, isOpen, setRefreshCallback }}>
      {children}
      <TransactionDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        onSuccess={handleSuccess}
      />
    </TransactionDialogContext.Provider>
  )
}

