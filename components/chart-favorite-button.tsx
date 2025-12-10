"use client"

import { Button } from "@/components/ui/button"
import { IconStar, IconStarFilled } from "@tabler/icons-react"
import { useFavorites } from "@/components/favorites-provider"
import { type ChartId } from "@/lib/chart-card-sizes.config"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
        favorited && "text-primary",
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
        <IconStar className={iconSizes[size]} />
      )}
      <span className="sr-only">
        {favorited ? "Remove from favorites" : "Add to favorites"}
      </span>
    </Button>
  )
}
