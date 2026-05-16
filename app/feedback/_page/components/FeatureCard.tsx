"use client"

import { memo, useCallback } from "react"
import { IconChevronUp, IconChevronDown, IconDots, IconTrash } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { useVote } from "../hooks/useVote"
import { useDeleteFeature } from "../hooks/useDeleteFeature"
import type { FeatureRow } from "../types"

function formatScore(n: number): string {
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k"
  return String(n)
}


type Props = {
  feature: FeatureRow
  currentUserId: string | null
}

export const FeatureCard = memo(function FeatureCard({ feature, currentUserId }: Props) {
  const { mutate: vote, isPending: isVoting } = useVote()
  const { mutate: deleteFeature } = useDeleteFeature()

  const isOwner = !!currentUserId && currentUserId === feature.author.id

  const handleVote = useCallback(
    (value: 1 | -1) => {
      vote({ featureId: feature.id, value })
    },
    [vote, feature.id]
  )

  return (
    <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
      {/* Vote rail */}
      <div className="flex w-9 flex-shrink-0 flex-col items-center gap-1 pt-0.5">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Upvote"
          disabled={isVoting}
          onClick={() => handleVote(1)}
          className={cn(
            "h-7 w-7 rounded-md transition-colors",
            feature.myVote === 1
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <IconChevronUp className="size-4" />
        </Button>

        <span
          className={cn(
            "text-sm font-medium tabular-nums leading-none",
            feature.myVote !== 0 ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {formatScore(feature.score)}
        </span>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Downvote"
          disabled={isVoting}
          onClick={() => handleVote(-1)}
          className={cn(
            "h-7 w-7 rounded-md transition-colors",
            feature.myVote === -1
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <IconChevronDown className="size-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-base font-medium leading-snug text-foreground">
            {feature.title}
          </h3>

          {isOwner && (
            <AlertDialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="More options"
                    className="h-7 w-7 flex-shrink-0 text-muted-foreground"
                  >
                    <IconDots className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                      <IconTrash className="mr-2 size-4" />
                      Delete
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                </DropdownMenuContent>
              </DropdownMenu>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this idea?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the feature idea and all its votes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteFeature(feature.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {feature.body && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{feature.body}</p>
        )}

        <p className="mt-2 text-xs text-muted-foreground/70">
          {feature.author.name ?? "Anonymous"}
        </p>
      </div>
    </div>
  )
})

FeatureCard.displayName = "FeatureCard"
