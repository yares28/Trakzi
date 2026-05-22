"use client"

import { memo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useCreateFeature } from "../hooks/useCreateFeature"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const NewFeatureDialog = memo(function NewFeatureDialog({ open, onOpenChange }: Props) {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const { mutate: createFeature, isPending, error } = useCreateFeature()

  const titleTrimmed = title.trim()
  const bodyTrimmed = body.trim()
  const isValid = titleTrimmed.length >= 3 && titleTrimmed.length <= 100
  const canSubmit = isValid && !isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    createFeature(
      { title: titleTrimmed, body: bodyTrimmed || undefined },
      {
        onSuccess: () => {
          setTitle("")
          setBody("")
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suggest an idea</DialogTitle>
          <DialogDescription>
            Share a feature you&apos;d like to see. Others can vote on it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Input
              placeholder="Short title (3–100 characters)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              aria-label="Feature title"
              disabled={isPending}
            />
            <p
              className={cn(
                "text-right text-xs",
                titleTrimmed.length > 90 ? "text-destructive" : "text-muted-foreground/60"
              )}
            >
              {titleTrimmed.length}/100
            </p>
          </div>

          <div className="space-y-1.5">
            <Textarea
              placeholder="Describe it in a few sentences (optional)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1000}
              rows={4}
              aria-label="Feature description"
              disabled={isPending}
              className="resize-none"
            />
            <p
              className={cn(
                "text-right text-xs",
                bodyTrimmed.length > 900 ? "text-destructive" : "text-muted-foreground/60"
              )}
            >
              {bodyTrimmed.length}/1000
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{(error as Error).message}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? "Submitting…" : "Submit idea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

NewFeatureDialog.displayName = "NewFeatureDialog"
