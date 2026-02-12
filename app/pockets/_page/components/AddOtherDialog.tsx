"use client"

import { memo, useCallback, useState } from "react"
import { Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AddOtherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export const AddOtherDialog = memo(function AddOtherDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddOtherDialogProps) {
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setName("")
        setError(null)
        setIsSubmitting(false)
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange],
  )

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/pockets/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "other",
          name: name.trim(),
          metadata: {},
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to add item")
        return
      }

      onSuccess()
      handleClose(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item")
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = !!name.trim() && !isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="other-name">Name</Label>
            <Input
              id="other-name"
              placeholder="e.g., Collectibles, Electronics"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              maxLength={100}
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add item"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

AddOtherDialog.displayName = "AddOtherDialog"
