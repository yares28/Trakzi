import { memo } from "react"

type Props = {
  onSuggest: () => void
}

export const EmptyState = memo(function EmptyState({ onSuggest }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="text-sm font-medium text-foreground">No ideas yet</p>
      <p className="text-sm text-muted-foreground">Be the first to suggest a feature.</p>
      <button
        onClick={onSuggest}
        className="mt-1 text-sm text-foreground underline underline-offset-4 transition-colors hover:text-muted-foreground"
      >
        Suggest one
      </button>
    </div>
  )
})

EmptyState.displayName = "EmptyState"
