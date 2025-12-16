"use client"

import { Button } from "@/components/ui/button"
import { useFavorites } from "@/components/favorites-provider"
import { type ChartId } from "@/lib/chart-card-sizes.config"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Custom filled star icon (for favorited state)
const IconStarFilled = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className={className}>
    <path fill="none" d="M0 0h24v24H0z"></path>
    <path d="M12.0006 18.26L4.94715 22.2082L6.52248 14.2799L0.587891 8.7918L8.61493 7.84006L12.0006 0.5L15.3862 7.84006L23.4132 8.7918L17.4787 14.2799L19.054 22.2082L12.0006 18.26Z"></path>
  </svg>
)

// Custom star outline with slash icon (for not favorited state)
const IconStarOff = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className={className}>
    <path fill="none" d="M0 0h24v24H0z"></path>
    <path d="M23.4132 8.7918L18.0211 13.7783L16.6058 12.363L18.8719 10.2674L14.039 9.69434L12.0006 5.27502L11.2169 6.97405L9.70961 5.46678L12.0006 0.5L15.3862 7.84006L23.4132 8.7918ZM8.45885 9.87258L5.12921 10.2674L8.70231 13.5717L7.75383 18.3451L12.0006 15.968L16.2473 18.3451L16.0777 17.4914L8.45885 9.87258ZM18.6224 20.0361L19.054 22.2082L12.0006 18.26L4.94715 22.2082L6.52248 14.2799L0.587891 8.7918L6.65832 8.07205L1.39397 2.80769L2.80818 1.39348L22.6072 21.1925L21.193 22.6067L18.6224 20.0361Z"></path>
  </svg>
)

interface ChartFavoriteButtonProps {
  chartId: ChartId
  chartTitle: string
  className?: string
  size?: "sm" | "md" | "lg"
}

export function ChartFavoriteButton({
  chartId,
  chartTitle,
  className,
  size = "md"
}: ChartFavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const favorited = isFavorite(chartId)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleFavorite(chartId)
    toast.success(
      favorited
        ? `Removed "${chartTitle}" from dashboard`
        : `Added "${chartTitle}" to dashboard`,
      {
        duration: 2000,
      }
    )
  }

  const sizeClasses = {
    sm: "h-7 w-7",
    md: "h-8 w-8",
    lg: "h-9 w-9",
  }

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn(
        sizeClasses[size],
        "flex-shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 relative z-20",
        favorited && "text-[#E78A53]",
        className
      )}
      title={favorited ? `Remove "${chartTitle}" from dashboard` : `Add "${chartTitle}" to dashboard`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {favorited ? (
        <IconStarFilled className={cn(iconSizes[size], "fill-current")} />
      ) : (
        <IconStarOff className={iconSizes[size]} />
      )}
      <span className="sr-only">
        {favorited ? "Remove from favorites" : "Add to favorites"}
      </span>
    </Button>
  )
}
